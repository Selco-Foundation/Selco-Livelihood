import pandas as pd

from app.utils.facility_validator import validate_columns, format_col_name

ASSET_ID_COLUMN = "Asset Id"


def asset_validation(df, mdms_client, request_info, schema_name):
    """Schema-driven validation for the asset ingestion sheet.
    Mirrors facility_validation: required/pattern/enum/allowed-value checks from the
    MDMS schema, plus a unique-serial-number check. New assets = rows with blank Asset Id."""
    df = df.reset_index(drop=True)
    errors = [[] for _ in range(len(df))]
    add_err = lambda i, msg: errors[i].append(msg)

    if ASSET_ID_COLUMN in df.columns:
        new_rows = df[df[ASSET_ID_COLUMN].isna() | (df[ASSET_ID_COLUMN].astype(str).str.strip() == "")]
    else:
        new_rows = df
    if new_rows.empty:
        return errors
    new_rows = new_rows.reset_index()

    schema = mdms_client.get_column_definitions_and_row_constraints_with_metadata(request_info, schema_name)

    validate_columns(new_rows, schema, lambda i, m: add_err(new_rows.loc[i, "index"], m))
    _validate_asset_type_matches_item_code(new_rows, schema, lambda i, m: add_err(new_rows.loc[i, "index"], m))
    _validate_unique_serial(df, schema, add_err)

    return errors


def _validate_asset_type_matches_item_code(new_rows, schema, add_err):
    """Flags rows where the selected Asset Type ID doesn't match the selected
    Item Code's actual category in livelihood.ItemCode (Asset Type ID is an
    independent dropdown, not auto-derived from Item Code)."""
    item_code_col = next((c for c in schema.get("column_list", []) if c.get("code") == "itemCode"), None)
    asset_type_col = next((c for c in schema.get("column_list", []) if c.get("code") == "assetTypeID"), None)
    if not item_code_col or not asset_type_col:
        return
    item_code_header = format_col_name(item_code_col)
    asset_type_header = format_col_name(asset_type_col)
    if item_code_header not in new_rows.columns or asset_type_header not in new_rows.columns:
        return

    category_by_item_name = {
        item.get("name"): item.get("category")
        for item in item_code_col.get("mdms_values", [])
        if item.get("name")
    }

    for i in range(len(new_rows)):
        item_name = new_rows.loc[i, item_code_header]
        asset_type = new_rows.loc[i, asset_type_header]
        if pd.isna(item_name) or str(item_name).strip() == "":
            continue
        if pd.isna(asset_type) or str(asset_type).strip() == "":
            continue
        item_name_s = str(item_name).strip()
        asset_type_s = str(asset_type).strip()
        expected_category = category_by_item_name.get(item_name_s)
        if expected_category is not None and expected_category != asset_type_s:
            add_err(
                i,
                f"Asset Type ID '{asset_type_s}' does not match Item Code '{item_name_s}' "
                f"(expected '{expected_category}')",
            )


def _validate_unique_serial(df, schema, add_err):
    col = next((c for c in schema.get("column_list", []) if c.get("code") == "serialNumber"), None)
    if not col:
        return
    header = format_col_name(col)
    if header not in df.columns:
        return
    seen = {}
    for i, val in enumerate(df[header]):
        if pd.isna(val) or str(val).strip() == "":
            continue
        s = str(val).strip()
        if s in seen:
            add_err(i, f"Duplicate {header}: '{s}' (also in row {seen[s] + 1})")
        else:
            seen[s] = i
