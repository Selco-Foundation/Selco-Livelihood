import re
from typing import Any, Callable, Dict, List, MutableMapping, Optional

import pandas as pd
from fastapi import HTTPException

from app.core.tenant import LIVELIHOOD_TENANT_ID
from app.utils.field_plan_locks import site_bar_message
from app.utils.solution_eligibility import eligible_solution_names

# Same wording everywhere: MDMS pre-validation, API import, and Excel client hints.
ERR_HFR_OR_NIN_REQUIRED_WHEN_HEALTH = (
    "When Facility Category is HEALTH, at least one of HFR ID or NIN ID is required."
)
ERR_POC_USERNAME_REQUIRED_WHEN_ANGANWADI = (
    "PoC Username is required when Facility Category is ANGANWADI."
)
ERR_POC_USERNAME_COLUMN_MISSING_FOR_ANGANWADI = (
    "PoC Username column is missing from the file; it is required for ANGANWADI facilities."
)


def normalize_facility_category_value(row: pd.Series) -> str:
    """
    Reads facility category from common template column names.
    Returns upper-cased value or '' when unset (IDs stay optional).
    """
    candidates = (
        "Category of Facility (Mandatory)",
        "Facility Category (Mandatory)",
    )
    for key in candidates:
        if key not in row.index:
            continue
        val = row.get(key, "")
        if pd.isna(val):
            continue
        s = str(val).strip()
        if s:
            return s.upper()
    return ""


def is_health_facility_category(category: str) -> bool:
    return category == "HEALTH"


def is_anganwadi_facility_category(category: str) -> bool:
    return category == "ANGANWADI"


def resolve_spreadsheet_header_for_schema_code(
    df: pd.DataFrame,
    schema_column_list: List[Dict[str, Any]],
    code: str,
) -> Optional[str]:
    """Map MDMS column `code` to the actual header string present in the dataframe."""
    cols = df.columns
    for col in schema_column_list:
        if col.get("code") != code:
            continue
        hn = format_col_name(col)
        if hn in cols:
            return hn
        base = (col.get("name") or "").strip()
        if base in cols:
            return base
    return None


def _is_legacy_mdms_hfr_nin_at_least_one_constraint(rc: Any) -> bool:
    """
    MDMS may define atLeastOneRequired on HFR ID + NIN ID for all rows.
    We enforce the same rule only when category is HEALTH in validate_hfr_nin_for_row,
    so skip this row constraint here to avoid duplicate errors.
    """
    ctype = getattr(rc, "type", None)
    if ctype != "atLeastOneRequired":
        return False
    fields = getattr(rc, "fields", None) or []
    return set(fields) == {"HFR ID", "NIN ID"}


def select_unsaved_rows(df: pd.DataFrame, id_column: str = "End user Id") -> pd.DataFrame:
    """Rows that don't yet exist in the registry, i.e. whose id cell is blank. Returns
    every row when the id column isn't in the file at all, so a template without that
    column is fully validated instead of raising."""
    if id_column not in df.columns:
        return df
    return df[df[id_column].isna() | (df[id_column].astype(str).str.strip() == "")]


def project_facility_validation(
    df, mdms_client, request_info, facility_client, boundary_data, schemaName,
    localization_service_url=None, validate_all_rows: bool = False,
):
    """Main function that orchestrates all facility file validations.

    validate_all_rows: validate every row rather than only the id-less ones. Defaults to
    False so the facility-ingestion callers keep their "only check new rows" behaviour.
    The Installation Scope sheet needs it True: every row there is an existing site being
    linked to a plan, so the id-less filter below would select nothing and the upload
    would pass without a single check running. Please keep this parameter -- it has been
    removed once already by an unrelated change, which left that endpoint silently
    validating nothing.
    """

    # Ensure boundary_data is provided
    if boundary_data is None or boundary_data.empty:
        raise HTTPException(status_code=400, detail="Boundary data is missing or empty")

    if "BoundaryCode" not in boundary_data.columns:
        raise HTTPException(status_code=400, detail="Boundary data missing 'BoundaryCode' column")

    allowed_boundary_codes = set(
        str(x).strip() for x in boundary_data["BoundaryCode"] if pd.notna(x)
    )

    # Reset index so we always work with 0-based positional indices
    df = df.reset_index(drop=True)

    errors = [[] for _ in range(len(df))]
    add_err = lambda i, msg: errors[i].append(msg)

    # data-ingestion.FacilityIngestionSchema (Livelihood) rows always come from an existing
    # facility selected via the facility ingestion template, so a blank id is invalid rather
    # than a request to create a new facility. Older schemas (e.g. FieldPlanFacilityIngestionSchema)
    # still key off "Facility Id" and continue to support creating new rows.
    uses_end_user_id = "End User Id" in df.columns
    id_column = "End User Id" if uses_end_user_id else "Facility Id"

    if uses_end_user_id:
        for i, val in enumerate(df[id_column]):
            if pd.isna(val) or str(val).strip() == "":
                add_err(i, "End User Id is required; this template only supports linking existing facilities.")

    # Every row, or only the id-less ones -- see validate_all_rows in the docstring.
    new_rows = df if validate_all_rows else select_unsaved_rows(df, id_column)
    if new_rows.empty:
        return errors  # Nothing to validate

    # Reset index on new_rows to get 0-based row positions
    new_rows = new_rows.reset_index()

    schema = mdms_client.get_column_definitions_and_row_constraints_with_metadata(
        request_info, schemaName
    )

    # Use positional index mapping to reference errors in original df
    validate_columns(new_rows, schema, lambda i, m: add_err(new_rows.loc[i, "index"], m))
    if uses_end_user_id:
        validate_state_district_block_boundary(
            new_rows, allowed_boundary_codes, localization_service_url,
            lambda i, m: add_err(new_rows.loc[i, "index"], m),
        )
    else:
        validate_boundary_codes(new_rows, allowed_boundary_codes, lambda i, m: add_err(new_rows.loc[i, "index"], m))
    validate_unique_ids(df, schema, add_err)
    validate_row_constraints(new_rows, schema, lambda i, m: add_err(new_rows.loc[i, "index"], m))
    validate_anganwadi_poc_username(new_rows, schema, lambda i, m: add_err(new_rows.loc[i, "index"], m))
    validate_hfr_nin(new_rows, lambda i, m: add_err(new_rows.loc[i, "index"], m), facility_client)

    return errors


def _find_header(df, base_name: str) -> Optional[str]:
    """Locate a column by its schema name, with or without the '(Mandatory)' suffix."""
    for candidate in (base_name, f"{base_name} (Mandatory)"):
        if candidate in df.columns:
            return candidate
    return None


# Newer schemas (Installation Scope) name the existing site's id column "End User Id";
# older ones (FieldPlanFacilityIngestionSchema) call it "Facility Id". Resolve it in one
# place: a path that guesses the wrong name reads no id at all and then fails closed --
# skipping every row -- which looks like "nothing matched" rather than a mismatch.
SITE_ID_COLUMNS = ("End User Id", "Facility Id")


def find_site_id_column(df) -> Optional[str]:
    """The column holding an existing site's id, under whichever name this schema uses."""
    for base_name in SITE_ID_COLUMNS:
        header = _find_header(df, base_name)
        if header:
            return header
    return None


def _cell(row, column) -> str:
    """Trimmed string value of a cell, treating NaN as empty."""
    if not column:
        return ""
    value = row.get(column, "")
    return "" if pd.isna(value) else str(value).strip()


def validate_installation_scope_solutions(
    df,
    solutions: List[Dict[str, Any]],
    sunshine_hours_by_state: Dict[str, float],
    add_err,
    plan_sector: Optional[str] = None,
    state_by_facility_id: Optional[Dict[str, str]] = None,
    lock_map: Optional[Dict[str, Any]] = None,
    solution_name_by_code: Optional[Dict[str, str]] = None,
) -> List[int]:
    """Installation-scope rules for the Include/Solution pair.

    A site is assigned exactly one Solution: an included site must name it, an excluded one
    must leave it blank, and the value has to be one this site is actually eligible for --
    recomputed here rather than trusting the uploaded workbook. plan_sector, when given,
    overrides the sheet's Sector column, which the Project Manager could otherwise edit.

    state_by_facility_id keys eligibility off each site's boundary_code rather than the
    sheet's State cell, which is editable once the sheet is unprotected. Both sides resolve
    the state the same way -- a facility record has no state of its own, since address.state
    has no column behind it and is always null -- so the value checked here is the one the
    dropdown was built from.

    lock_map (facility_id -> SiteLock) freezes rows that another plan has claimed, or that this
    plan has already published. A row held by a sibling plan is display-only and skipped; one
    held by this plan (which can only mean this plan is published -- its own unpublished scope
    reservations are filtered out of the map) must come back unchanged. Excel protection alone
    can't guarantee that -- the sheet can be unprotected -- so it is re-checked here.

    Returns the 0-based positions of rows this plan may actually link.
    """
    include_column = _find_header(df, "Included in Field Plan")
    solution_column = _find_header(df, "Solution")
    if not include_column or not solution_column:
        return []

    sector_column = _find_header(df, "Sector")
    state_column = _find_header(df, "State")
    facility_id_column = find_site_id_column(df)
    lock_map = lock_map or {}
    solution_name_by_code = solution_name_by_code or {}

    linkable_rows: List[int] = []
    for i, row in enumerate(df.to_dict("records")):
        include_value = _cell(row, include_column).lower()
        solution_value = _cell(row, solution_column)
        facility_id = _cell(row, facility_id_column)

        lock = lock_map.get(facility_id) if facility_id else None
        if lock is not None:
            if lock.is_this_plan:
                # Held by this plan, which can only mean this plan is published -- its own
                # unpublished scope reservations are excluded from the lock map so that it can
                # keep editing them. So the row really is fixed: it must come back untouched.
                # Excel protection stops honest edits, but the sheet can be unprotected, so the
                # values are re-checked here.
                expected = solution_name_by_code.get(lock.solution_id, "")
                if include_value != "yes" or (expected and solution_value != expected):
                    add_err(
                        i,
                        "This installation plan has already been submitted, so this site cannot "
                        "be removed from it or given a different Solution.",
                    )
            elif include_value == "yes":
                # Held by a sibling plan and the PM has asked to include it anyway. This is the
                # double-booking FR-06 exists to stop -- two vendors dispatched to one end user
                # -- so it is a hard error rather than a silently skipped row. The download
                # hands these back as Include=No, so reaching here means the cell was changed.
                add_err(i, site_bar_message(lock))
            # Either way the row is never linked to this plan.
            continue

        if include_value != "yes":
            if solution_value:
                add_err(i, "Solution must be empty unless the site is included in the field plan")
            continue

        if not solution_value:
            add_err(i, "Solution is required when the site is included in the field plan")
            continue

        row_sector = plan_sector or _cell(row, sector_column)
        if state_by_facility_id is not None:
            state_value = state_by_facility_id.get(facility_id, "")
        else:
            state_value = _cell(row, state_column)

        allowed = eligible_solution_names(solutions, row_sector, state_value, sunshine_hours_by_state)
        if solution_value not in allowed:
            add_err(
                i,
                f"Solution '{solution_value}' is not valid for sector '{row_sector or ''}' "
                f"and state '{state_value}'",
            )
            continue

        linkable_rows.append(i)

    return linkable_rows


def facility_validation(
    df, mdms_client, request_info, facility_client, boundary_data, schemaName
):
    """Main function that orchestrates all facility file validations."""
    # Reset index so we always work with 0-based positional indices
    df = df.reset_index(drop=True)

    errors = [[] for _ in range(len(df))]
    add_err = lambda i, msg: errors[i].append(msg)

    # Only validate rows where Facility ID is empty
    new_rows = df[df["End user Id"].isna() | (df["End user Id"].astype(str).str.strip() == "")]
    if new_rows.empty:
        return errors  # No new rows to validate

    # Reset index on new_rows to get 0-based row positions
    new_rows = new_rows.reset_index()

    schema = mdms_client.get_column_definitions_and_row_constraints_with_metadata(
        request_info, schemaName
    )

    # Use positional index mapping to reference errors in original df
    # Livelihood: only schema-driven checks; HFR/NIN + Anganwadi PoC validators dropped (columns removed).
    validate_columns(new_rows, schema, lambda i, m: add_err(new_rows.loc[i, "index"], m))
    validate_unique_ids(df, schema, add_err)
    validate_row_constraints(new_rows, schema, lambda i, m: add_err(new_rows.loc[i, "index"], m))

    return errors


# ----------------- Helper Functions ----------------- #

def validate_boundary_codes(df, allowed_boundary_codes, add_err):
    """
    Validates that 'Boundary Code' column in df only contains values
    from allowed_boundary_codes set. Only validates rows in df passed here.
    """
    boundary_column = "Boundary Code (Mandatory)"
    if boundary_column not in df.columns:
        return

    for i, val in enumerate(df[boundary_column]):
        if pd.isna(val) or str(val).strip() == "":
            add_err(i, "Boundary Code is mandatory")
            continue

        str_val = str(val).strip()
        if str_val not in allowed_boundary_codes:
            add_err(i, f"Boundary Code '{str_val}' is invalid (not in boundary data)")


def validate_state_district_block_boundary(df, allowed_boundary_codes, localization_service_url, add_err):
    """
    Resolves each row's State/District/Block to a boundary code (via the localization
    reverse map) and validates it is one of the project's allowed boundary codes.
    Used by schemas (e.g. data-ingestion.FacilityIngestionSchema) that replaced the single
    'Boundary Code' column with State/District/Block columns.
    """
    # Deferred imports to avoid a circular import with app.utils.convertor, which itself
    # imports format_col_name from this module.
    from app.core.tenant import LOCALIZATION_MODULE
    from app.utils.convertor import build_localization_reverse_map, resolve_boundary_code

    reverse_map: Dict[str, List[str]] = {}
    if localization_service_url:
        try:
            from app.utils.localization_service_client import LocalizationServiceClient
            loc_client = LocalizationServiceClient(localization_service_url)
            loc_response = loc_client.search_messages(
                tenant_id=LIVELIHOOD_TENANT_ID,
                locale="en_IN",
                module=LOCALIZATION_MODULE,
            )
            reverse_map = build_localization_reverse_map(loc_response.get("messages", []))
        except Exception:
            reverse_map = {}

    for i, row in df.iterrows():
        state_val = str(row.get("State", "") or "").strip()
        district_val = str(row.get("District", "") or "").strip()
        block_val = str(row.get("Block", "") or "").strip()

        if not (state_val or district_val or block_val):
            add_err(i, "State/District/Block is required")
            continue

        if not reverse_map:
            add_err(i, "Unable to validate location: localization service unavailable")
            continue

        boundary_code, error = resolve_boundary_code(state_val, district_val, block_val, reverse_map)
        if error:
            add_err(i, error)
        elif boundary_code not in allowed_boundary_codes:
            add_err(
                i,
                f"Location (State '{state_val}', District '{district_val}', Block '{block_val}') "
                f"is not within this project's boundaries",
            )


def validate_columns(df, schema, add_err):
    skip_columns = {"Boundary Code"}
    for col in schema["column_list"]:
        col_name = format_col_name(col)

        if col.get("name", "").strip() in skip_columns:
            continue

        # Check if column exists
        if col_name not in df.columns:
            if col.get("required"):
                raise HTTPException(status_code=400, detail=f"Missing mandatory column: {col_name}")
            continue

        for i, val in enumerate(df[col_name]):
            # Treat NaN or None as empty string
            if pd.isna(val):
                str_val = ""
            else:
                str_val = str(val).strip()

            # Check mandatory
            if col.get("required") and not str_val:
                add_err(i, f"{col_name} is mandatory")
                continue

            # Skip pattern/type checks if empty
            if not str_val:
                continue

            # Pattern validation
            if col.get("pattern"):
                pattern_val = str_val.split(".")[0] if str_val.endswith(".0") else str_val
                if not re.fullmatch(col["pattern"], pattern_val):  # fullmatch is safer than match
                    add_err(i, f"{col_name} does not match pattern {col['pattern']}")

            # Enum validation (case-insensitive)
            if col.get("type") == "enum-yes-no" and str_val.lower() not in {"yes", "no"}:
                add_err(i, f"{col_name} must be Yes or No")

            # --- Dropdown check (MDMS values) ---
            mdms_values = col.get("mdms_values")
            mdms_options = col.get("mdms_options")
            if mdms_values:
                effective_mdms = mdms_values
                facility_cat_for_type = ""
                if col.get("code") == "facility_type":
                    facility_cat_for_type = normalize_facility_category_value(df.iloc[i])
                    if facility_cat_for_type in ("HEALTH", "ANGANWADI"):
                        effective_mdms = [
                            v
                            for v in mdms_values
                            if str(v.get("facilityCategory") or "").strip().upper()
                            == facility_cat_for_type
                        ]
                    allowed_values = [v.get("name") for v in effective_mdms if v.get("name")]
                elif mdms_options:
                    # mdmsSource.mode can resolve dropdown options differently from raw
                    # record "name" (e.g. "direct"/"nested" modes) -- mdms_options already
                    # accounts for that, so check against its resolved display values.
                    allowed_values = [o.get("display") for o in mdms_options if o.get("display")]
                else:
                    allowed_values = [v.get("name") for v in effective_mdms if v.get("name")]
                if str_val not in allowed_values:
                    if col.get("code") == "facility_type" and facility_cat_for_type in (
                        "HEALTH",
                        "ANGANWADI",
                    ):
                        add_err(
                            i,
                            f"{col_name} must be a facility type for Facility Category "
                            f"'{facility_cat_for_type}' (MDMS facilityCategory); "
                            f"'{str_val}' is not valid for this category.",
                        )
                    else:
                        add_err(i, f"Invalid value in column '{col_name}'")


def validate_anganwadi_poc_username(df, schema, add_err):
    """When facility category is ANGANWADI, PoC Username (MDMS code facility_poc_username) is mandatory."""
    column_list = schema.get("column_list") or []
    for idx, row in df.iterrows():
        if not is_anganwadi_facility_category(normalize_facility_category_value(row)):
            continue
        header = resolve_spreadsheet_header_for_schema_code(df, column_list, "facility_poc_username")
        if not header:
            add_err(idx, ERR_POC_USERNAME_COLUMN_MISSING_FOR_ANGANWADI)
            continue
        val = row.get(header, "")
        if pd.isna(val) or str(val).strip() == "":
            add_err(idx, ERR_POC_USERNAME_REQUIRED_WHEN_ANGANWADI)


def validate_unique_ids(df, schema, add_err):
    unique_columns = [c for c in schema["column_list"] if c["type"] == "Unique_Id"]

    for col in unique_columns:
        seen = {}
        col_name = format_col_name(col)

        for i, val in enumerate(df.get(col_name, [])):
            if pd.isna(val):
                continue

            key = str(val).strip()
            if not key:
                continue

            if key in seen:
                add_err(i, f"Duplicate value in {col_name}")
            else:
                seen[key] = i



def validate_row_constraints(df, schema, add_err):
    """
    Validates row-level constraints defined in schema against DataFrame rows.
    Handles cases where df column names may have '(Mandatory)' suffix,
    while row_constraints fields are without the suffix.
    """
    row_constraints = schema.get("row_constraints", [])

    # Build mapping: base column name -> formatted column name in df
    col_map = {}
    for col in schema.get("column_list", []):
        base_name = col.get("name", "").strip()
        formatted_name = format_col_name(col)
        if formatted_name in df.columns:
            col_map[base_name] = formatted_name
        elif base_name in df.columns:
            col_map[base_name] = base_name

    for idx, row in df.iterrows():
        for rc in row_constraints:
            if _is_legacy_mdms_hfr_nin_at_least_one_constraint(rc):
                continue
            raw_fields = getattr(rc, "fields", None) or []
            if not raw_fields:
                continue
            fields = [col_map.get(f, f) for f in raw_fields]
            values = []
            for f in fields:
                val = row.get(f, "")
                if pd.isna(val):
                    val = ""
                else:
                    val = str(val).strip()
                values.append(val)

            if rc.type == "atLeastOneRequired" and not any(values):
                add_err(idx, rc.message)

            elif rc.type == "allOrNoneRequired":
                filled_count = sum(bool(v) for v in values)
                if 0 < filled_count < len(values):
                    add_err(idx, rc.message)


def validate_hfr_nin(df, add_err, facility_client):
    checked_in_db: Dict[str, bool] = {}

    for idx, row in df.iterrows():
        validate_hfr_nin_for_row(
            row=row,
            row_idx=idx,
            df=df,
            add_err=add_err,
            facility_client=facility_client,
            checked_in_db=checked_in_db,
        )


def validate_hfr_nin_for_row(
    row: pd.Series,
    row_idx: Any,
    df: pd.DataFrame,
    add_err: Callable[[Any, str], None],
    facility_client: Any,
    checked_in_db: MutableMapping[str, bool],
) -> None:
    """Category-aware HFR/NIN checks + duplicate lookup (shared by bulk validate and import)."""
    hfr = row.get("HFR ID", "")
    nin = row.get("NIN ID", "")

    hfr = str(hfr).strip() if pd.notna(hfr) else ""
    nin = str(nin).strip() if pd.notna(nin) else ""

    category = normalize_facility_category_value(row)
    if is_health_facility_category(category) and not hfr and not nin:
        add_err(row_idx, ERR_HFR_OR_NIN_REQUIRED_WHEN_HEALTH)

    if not hfr and not nin:
        return

    check_db_duplicates(
        cache=checked_in_db,
        facility_client=facility_client,
        add_err=add_err,
        df=df,
        row_idx=row_idx,
        hfr=hfr if hfr else None,
        nin=nin if nin else None,
    )


def collect_hfr_nin_errors_for_row(
    row: pd.Series,
    row_idx: Any,
    df: pd.DataFrame,
    facility_client: Any,
    checked_in_db: MutableMapping[str, bool],
) -> List[str]:
    out: List[str] = []

    def add_err(_idx: Any, msg: str) -> None:
        out.append(msg)

    validate_hfr_nin_for_row(
        row=row,
        row_idx=row_idx,
        df=df,
        add_err=add_err,
        facility_client=facility_client,
        checked_in_db=checked_in_db,
    )
    return list(dict.fromkeys(out))


def collect_anganwadi_poc_username_errors_for_row(
    row: pd.Series,
    _row_idx: Any,
    df: pd.DataFrame,
    facility_schema: List[Dict[str, Any]],
) -> List[str]:
    if not is_anganwadi_facility_category(normalize_facility_category_value(row)):
        return []
    header = resolve_spreadsheet_header_for_schema_code(df, facility_schema, "facility_poc_username")
    if not header:
        return [ERR_POC_USERNAME_COLUMN_MISSING_FOR_ANGANWADI]
    val = row.get(header, "")
    if pd.isna(val) or str(val).strip() == "":
        return [ERR_POC_USERNAME_REQUIRED_WHEN_ANGANWADI]
    return []


def check_db_duplicates(cache, facility_client, add_err, df, row_idx, hfr=None, nin=None):
    """
    Checks for duplicates in DB for HFR ID and NIN ID in the given row.
    tenant_id is fixed as LIVELIHOOD_TENANT_ID. Only passes non-empty params to search API.
    If DB call fails, we log error for that row and skip further validation.
    """
    row = df.loc[row_idx]
    boundary_code = str(row.get("Boundary Code (Mandatory)", "")).strip()
    tenant_id = LIVELIHOOD_TENANT_ID

    try:
        for col_name, value, key in [
            ("HFR ID", hfr, "hfr_id"),
            ("NIN ID", nin, "nin_id"),
        ]:
            if not value:  # Skip if None or empty string
                continue

            cache_key = f"{boundary_code}|{key}|{value}"

            if cache_key not in cache:
                try:
                    result = facility_client.search_facility(
                        tenant_id=tenant_id,
                        boundary_code=boundary_code,
                        **({key: value} if value else {})  # only include if value is present
                    )
                    exists = result.get("totalCount", 0) > 0
                    cache[cache_key] = exists
                except Exception as e:
                    # ✅ Instead of letting row pass, flag it
                    add_err(row_idx, f"Could not validate {col_name}='{value}' in DB: {e}")
                    # Stop further checks for this row, to avoid partial validation
                    return

            if cache[cache_key]:
                add_err(row_idx, f"{col_name} '{value}' already exists in system")

    except Exception as e:
        # Catch unexpected errors and fail the row
        add_err(row_idx, f"Unexpected error during DB duplicate check: {e}")

def format_col_name(col: dict) -> str:
    """
    Formats column name with '(Mandatory)' if 'required' is True.
    Example:
        {"name": "Facility Name", "required": True}
        -> "Facility Name (Mandatory)"
    """
    name = col.get("name", "")
    required = col.get("required", False)
    return f"{name}{' (Mandatory)' if required else ''}"

