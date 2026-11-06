"""Read a Solution's IC Report form definitions out of MDMS, and check a workbook against them.

MDMS is the source of truth for field names. Every cell of the Bill Of Material gets a stable
name -- `bom_solar_panel_make`, `machine_1_product` -- that the mobile app binds its form to and
the PDF generator references, and those names are assigned to the Project Manager's uploaded rows
**by position**: line item *i* of a section takes the names MDMS declares for line item *i*.

Position-based assignment only holds while the workbook's structure matches the form's. The served
template is sheet-protected to make that hard to break, but protection is a Project Manager
affordance rather than a control -- it is removable in two clicks and Google Sheets drops it
outright. `structural_errors` is the actual guard: it compares the workbook's category sequence
against the form's and rejects a mismatch, so a sheet someone unprotected and inserted a row into
fails loudly instead of silently shifting every name after it.

MDMS is deliberately kept out of `icc_template_parser`, which knows nothing but the sheet in front
of it. That separation is what lets the same parser back the MDMS regeneration script.
"""
import os
from dataclasses import dataclass, field
from threading import Lock
from time import monotonic
from typing import Any, Dict, List, Optional, Tuple

from app.core.logging import AppLogger
from app.schemas.request_info import RequestInfo
from app.utils.mdms_client import MDMSClient

logger = AppLogger().get_logger()

SCHEMA_SOLUTION_FORMS = "livelihood.SolutionBOMForms"
SCHEMA_BOM_FORMS = "livelihood.BOMFormSchema"

# SolutionBOMForms names a form as "LIVELIHOOD_<code>_BOM_solar"; the BOMFormSchema record that
# defines it is keyed "AssetForm.LIVELIHOOD_<code>_BOM_solar".
FORM_ID_PREFIX = "AssetForm."

SUFFIX_SOLAR = "_BOM_solar"
SUFFIX_MACHINES = "_BOM_machines"
SUFFIX_SYSTEM = "_BOM_system"

# The four properties MDMS declares per line item, in order. Position in this tuple is the
# contract: property 4i+n of a form belongs to line item i, column n.
COLUMN_LABELS: Tuple[Tuple[str, str], ...] = (
    ("Product", "product"),
    ("Make", "make"),
    ("Capacity", "capacity"),
    ("Quantity", "quantity"),
)
COLUMNS_PER_LINE_ITEM = len(COLUMN_LABELS)

# Written into bom.data by the backend, never declared by MDMS. Asserted rather than assumed:
# a collision would have MDMS quietly overwrite a Report Number.
RESERVED_FIELD_NAMES = frozenset({
    "report_number", "tender_number", "purchase_order_number",
})

# Error codes the endpoints turn into HTTP responses.
ERROR_FORM_NOT_CONFIGURED = "BOM_FORM_NOT_CONFIGURED"
ERROR_FORM_MALFORMED = "BOM_FORM_MALFORMED"
ERROR_MDMS_UNAVAILABLE = "BOM_FORM_LOOKUP_FAILED"
ERROR_STRUCTURE_MISMATCH = "TEMPLATE_STRUCTURE_MISMATCH"

_CACHE_TTL_SECONDS = 300
_cache: Dict[str, Tuple[float, "SolutionForms"]] = {}
_cache_lock = Lock()


class BomFormError(Exception):
    """A Solution's forms could not be read, or are not shaped the way the runtime requires."""

    def __init__(self, code: str, message: str, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.message = message
        # True when the cause is an unreachable MDMS rather than bad configuration -- the caller
        # answers 502 for one and 400 for the other.
        self.retryable = retryable


@dataclass(frozen=True)
class FormSpec:
    """One BOMFormSchema record, flattened to the per-line-item view the parser needs."""
    unique_id: str
    sections: List[str]                   # category per line item, in order -- the fingerprint
    field_names: List[Dict[str, str]]     # per line item: {product, make, capacity, quantity}
    types: List[Dict[str, str]]           # per line item: the MDMS `type` per column

    @property
    def line_item_count(self) -> int:
        return len(self.sections)


@dataclass(frozen=True)
class SolutionForms:
    solution_code: str
    solar: FormSpec
    machines: Optional[FormSpec]          # None for a solar-only Solution (Textile Lighting)
    system_field_names: List[str] = field(default_factory=list)
    form_ids: Dict[str, str] = field(default_factory=dict)

    def spec_for(self, section: str) -> Optional[FormSpec]:
        return self.solar if section == "solar" else self.machines


# --------------------------------------------------------------------------- loading

def _ordered_properties(record: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Every property of a form, in page order then property order.

    Sorted rather than taken as-is: `order` is what the mobile app renders by, so it -- not JSON
    array position -- is the sequence the names were assigned in.
    """
    pages = sorted(record.get("data", {}).get("pages") or [],
                   key=lambda page: page.get("order", 0))
    return [prop
            for page in pages
            for prop in sorted(page.get("properties") or [], key=lambda p: p.get("order", 0))]


def _to_spec(unique_id: str, record: Dict[str, Any]) -> FormSpec:
    """Group a BOM form's properties into line items of four, asserting the invariant.

    Verified to hold across all 27 published BOM forms. A violation means the record was
    hand-edited rather than generated, and every name after the break would be assigned to the
    wrong cell -- so it is a hard failure, not a warning.
    """
    props = _ordered_properties(record)
    if not props or len(props) % COLUMNS_PER_LINE_ITEM:
        raise BomFormError(
            ERROR_FORM_MALFORMED,
            f"{unique_id} declares {len(props)} properties, which is not a whole number of "
            f"{COLUMNS_PER_LINE_ITEM}-column line items. Regenerate this form from the blank "
            f"workbook (development/mdms/regenerate_bom_forms.py).")

    sections: List[str] = []
    field_names: List[Dict[str, str]] = []
    types: List[Dict[str, str]] = []

    for start in range(0, len(props), COLUMNS_PER_LINE_ITEM):
        group = props[start:start + COLUMNS_PER_LINE_ITEM]
        index = start // COLUMNS_PER_LINE_ITEM

        labels = [prop.get("label") for prop in group]
        if labels != [label for label, _ in COLUMN_LABELS]:
            raise BomFormError(
                ERROR_FORM_MALFORMED,
                f"{unique_id} line item {index + 1} declares columns {labels}, expected "
                f"{[label for label, _ in COLUMN_LABELS]}. Regenerate this form.")

        # The category sits on the first property of the group and nowhere else; that is how the
        # app draws one section heading per line item.
        section = group[0].get("section")
        if not section:
            raise BomFormError(
                ERROR_FORM_MALFORMED,
                f"{unique_id} line item {index + 1} has no category on its Product property. "
                f"Regenerate this form.")

        names = {column: group[position].get("fieldName")
                 for position, (_, column) in enumerate(COLUMN_LABELS)}
        missing = [column for column, name in names.items() if not name]
        if missing:
            raise BomFormError(
                ERROR_FORM_MALFORMED,
                f"{unique_id} line item {index + 1} is missing fieldName for {missing}.")

        clashes = RESERVED_FIELD_NAMES.intersection(names.values())
        if clashes:
            raise BomFormError(
                ERROR_FORM_MALFORMED,
                f"{unique_id} declares field name(s) {sorted(clashes)}, which the backend "
                f"reserves for the Report Number, Tender No. and Purchase/Work Order No. "
                f"Rename them in MDMS.")

        sections.append(section)
        field_names.append(names)
        types.append({column: group[position].get("type") or "string"
                      for position, (_, column) in enumerate(COLUMN_LABELS)})

    return FormSpec(unique_id=unique_id, sections=sections, field_names=field_names, types=types)


def _classify(form_names: List[str]) -> Dict[str, str]:
    """Map the names SolutionBOMForms lists onto their BOMFormSchema identifiers."""
    ids: Dict[str, str] = {}
    for name in form_names:
        unique_id = name if name.startswith(FORM_ID_PREFIX) else FORM_ID_PREFIX + name
        if unique_id.endswith(SUFFIX_SOLAR):
            ids["solar"] = unique_id
        elif unique_id.endswith(SUFFIX_MACHINES):
            ids["machines"] = unique_id
        elif unique_id.endswith(SUFFIX_SYSTEM):
            ids["system"] = unique_id
    return ids


def _client() -> MDMSClient:
    """An MDMS client, or a clear failure if the service is not configured.

    MDMS_URL is already required by the Installation Scope step; this makes the IC Report step's
    dependency on it explicit rather than surfacing as an AttributeError deep in a request.
    """
    mdms_url = os.getenv("MDMS_URL")
    if not mdms_url:
        raise BomFormError(
            ERROR_MDMS_UNAVAILABLE,
            "MDMS_URL is not configured, so this Solution's IC Report form definitions cannot "
            "be read. Set it in the ingestion-service environment.",
            retryable=True)
    return MDMSClient(mdms_url)


def _fetch(client: MDMSClient, request_info: RequestInfo, schema_code: str,
           unique_identifiers: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    try:
        return client.fetch_mdms_records(request_info, schema_code, unique_identifiers)
    except Exception as exc:
        # Fail closed. A template stored without field names produces a bom.data neither the
        # mobile app nor the PDF generator can read, with nothing to signal why -- so an
        # unreachable MDMS has to stop the upload, not wave it through.
        raise BomFormError(
            ERROR_MDMS_UNAVAILABLE,
            f"Could not read this Solution's IC Report form definition from MDMS ({schema_code}): "
            f"{exc}",
            retryable=True) from exc


def _load(client: MDMSClient, request_info: RequestInfo, solution_code: str) -> SolutionForms:
    solution_records = _fetch(client, request_info, SCHEMA_SOLUTION_FORMS, [solution_code])
    if not solution_records:
        raise BomFormError(
            ERROR_FORM_NOT_CONFIGURED,
            f"Solution {solution_code} has no IC Report form definition in MDMS "
            f"({SCHEMA_SOLUTION_FORMS}). It cannot be used in an installation plan until one is "
            f"registered.")

    form_names = [entry.get("name") for entry
                  in (solution_records[0].get("data", {}).get("bomForms") or [])
                  if entry.get("name")]
    form_ids = _classify(form_names)
    if "solar" not in form_ids:
        raise BomFormError(
            ERROR_FORM_NOT_CONFIGURED,
            f"Solution {solution_code} lists no solar BOM form in {SCHEMA_SOLUTION_FORMS}. "
            f"Every Solution in this programme is a solar installation.")

    wanted = [form_ids[key] for key in ("solar", "machines", "system") if key in form_ids]
    records = {record.get("uniqueIdentifier"): record
               for record in _fetch(client, request_info, SCHEMA_BOM_FORMS, wanted)}

    missing = [unique_id for unique_id in wanted if unique_id not in records]
    if missing:
        raise BomFormError(
            ERROR_FORM_NOT_CONFIGURED,
            f"Solution {solution_code} names form(s) {missing} that do not exist in "
            f"{SCHEMA_BOM_FORMS}.")

    # The system form is a flat list of the technician's readings, not line items of four, so it
    # is read for its names only. Vendor Assignment seeds these onto the SOLAR asset so the row's
    # key set is complete before anyone visits the site.
    system_names: List[str] = []
    if "system" in form_ids:
        system_names = [prop.get("fieldName")
                        for prop in _ordered_properties(records[form_ids["system"]])
                        if prop.get("fieldName")]

    return SolutionForms(
        solution_code=solution_code,
        solar=_to_spec(form_ids["solar"], records[form_ids["solar"]]),
        machines=(_to_spec(form_ids["machines"], records[form_ids["machines"]])
                  if "machines" in form_ids else None),
        system_field_names=system_names,
        form_ids=form_ids,
    )


def load_solution_forms(request_info: RequestInfo, solution_code: str,
                        client: Optional[MDMSClient] = None) -> SolutionForms:
    """The Solution's forms, cached briefly.

    A Project Manager's loop is validate then create, so an uncached read would fetch the same
    two documents at least twice per upload, and correcting a flagged row repeats it. Only
    successful loads are cached -- a failure must never be served from memory, or a
    misconfiguration would look intermittently fixed.
    """
    with _cache_lock:
        cached = _cache.get(solution_code)
        if cached and monotonic() - cached[0] < _CACHE_TTL_SECONDS:
            return cached[1]

    forms = _load(client or _client(), request_info, solution_code)

    with _cache_lock:
        _cache[solution_code] = (monotonic(), forms)
    logger.info(
        f"Loaded BOM forms for {solution_code}: {forms.solar.line_item_count} solar line items, "
        f"{forms.machines.line_item_count if forms.machines else 0} machine line items, "
        f"{len(forms.system_field_names)} system parameters")
    return forms


def clear_cache() -> None:
    """For tests, and for an operator who has just regenerated MDMS."""
    with _cache_lock:
        _cache.clear()


# --------------------------------------------------------------------------- checking

_SECTION_LABELS = {"solar": "Bill Of Material (For Solar System)",
                   "machine": "Associated Machines"}


def structural_errors(parsed, forms: SolutionForms) -> List[str]:
    """Sheet-level errors when the workbook no longer matches the form it will be named against.

    Compares the ordered category sequence, not just the count. That distinction is load-bearing:
    of the nine mismatches found between the published forms and the current blank workbooks,
    seven had the *same* number of line items and differed only in which categories they were --
    a count check would have passed all seven and mis-assigned every name from that point on.
    """
    errors: List[str] = []

    for section, spec_key in (("solar", "solar"), ("machine", "machines")):
        sheet_categories = [item.category for item in parsed.line_items
                            if item.section == section]
        spec = forms.spec_for(spec_key)

        if spec is None:
            if sheet_categories:
                errors.append(
                    f"{ERROR_STRUCTURE_MISMATCH}: this workbook has {len(sheet_categories)} "
                    f"{_SECTION_LABELS[section]} line item(s), but Solution "
                    f"{forms.solution_code} has no machines form registered in MDMS. "
                    f"Download the template again, or register the form first.")
            continue

        if sheet_categories == spec.sections:
            continue

        if len(sheet_categories) != spec.line_item_count:
            detail = (f"The form defines {spec.line_item_count} line items, the workbook has "
                      f"{len(sheet_categories)}.")
        else:
            # Same count, different categories. This is the common case -- seven of the nine
            # mismatches between the published forms and the current blank workbooks look like
            # this -- so saying "expected 36, found 36" would be actively confusing.
            detail = (f"Both have {spec.line_item_count} line items, but their categories "
                      f"differ.")

        divergence = next(
            (index for index, (sheet, form) in enumerate(zip(sheet_categories, spec.sections))
             if sheet != form), None)
        if divergence is not None:
            detail += (f" First difference at line item {divergence + 1}: the form expects "
                       f"category {spec.sections[divergence]!r}, the workbook has "
                       f"{sheet_categories[divergence]!r}.")

        errors.append(
            f"{ERROR_STRUCTURE_MISMATCH}: this workbook's {_SECTION_LABELS[section]} does not "
            f"match the IC Report form registered for Solution {forms.solution_code}. {detail} "
            f"Field names are assigned by position, so the workbook must match the form exactly. "
            f"If you inserted or deleted rows, download the template again and start from the "
            f"blank copy. If the template itself has changed, this Solution's form definition "
            f"must be regenerated before the template can be used.")

    return errors
