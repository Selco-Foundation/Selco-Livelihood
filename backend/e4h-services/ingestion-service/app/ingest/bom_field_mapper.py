"""Turn a parsed IC Report workbook into the named shape `field_plan_template.template_data` holds.

Two views of the same data come out of here, and both are needed:

* ``fields`` -- the whole template as a flat ``{fieldName: value}`` map. This is the contract the
  mobile app and the PDF generator bind to. Every name the form declares is present, blanks as
  ``""``, because a constant key set is the entire point: no consumer should ever have to tell
  "absent" from "blank".
* ``machineSection`` / ``solarSection`` -- the existing per-line-item arrays, unchanged except
  that each entry gains a ``fieldNames`` sub-map. Their length is still the machine-count contract
  Vendor Assignment derives assets from, and the per-item names are what lets it slice the flat
  map per asset without knowing any naming convention. That matters more than it looks: of the
  thirteen published machines forms, nine name their single machine ``machine_product`` and four
  name theirs ``machine_1_*``, so a rule of "slot N takes machine_N_*" would silently produce an
  empty BOM for nine Solutions.
"""
from typing import Any, Dict, List, Optional, Tuple

from app.ingest.bom_form_catalog import COLUMN_LABELS, SolutionForms
from app.utils.icc_template_parser import ParsedTemplate, to_sections

FIELD_TENDER_NUMBER = "tender_number"
FIELD_PURCHASE_ORDER_NUMBER = "purchase_order_number"

TEMPLATE_SCHEMA_VERSION = 2


def _coerce(raw: Any, declared_type: str) -> Any:
    """Match the value to the type MDMS declares, since that is what picks the app's widget.

    A blank becomes ``""`` rather than None for every type: the app renders an empty control
    either way, and a present-but-empty key keeps the stored key set constant.
    """
    if raw is None:
        return ""
    text = str(raw).strip()
    if text == "":
        return ""
    if declared_type == "integer":
        try:
            return int(float(text))
        except ValueError:
            # Validation has already flagged a non-numeric quantity against its row; keeping the
            # text here means the Project Manager sees what they typed rather than a silent zero.
            return text
    return text


def _values_of(item) -> Dict[str, Any]:
    return {"product": item.product, "make": item.make,
            "capacity": item.capacity, "quantity": item.quantity}


def build_field_map(parsed: ParsedTemplate, forms: SolutionForms
                    ) -> Tuple[Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
    """-> (fields, machine_section, solar_section, form_meta).

    Assumes the workbook has already passed ``structural_errors``; names are assigned strictly by
    position and would be wrong otherwise. Both upload endpoints run that check first.
    """
    machine_section, solar_section = to_sections(parsed)
    fields: Dict[str, Any] = {}

    for section, spec_key, target in (("solar", "solar", solar_section),
                                      ("machine", "machines", machine_section)):
        spec = forms.spec_for(spec_key)
        if spec is None:
            continue

        items = [item for item in parsed.line_items if item.section == section]
        for index, item in enumerate(items):
            names = spec.field_names[index]
            types = spec.types[index]
            values = _values_of(item)

            # to_sections built `target` from the same list in the same order, so index lines up.
            target[index]["fieldNames"] = dict(names)
            for _, column in COLUMN_LABELS:
                fields[names[column]] = _coerce(values[column], types[column])

    # Reserved keys last so they win over anything MDMS could declare. The catalogue already
    # refuses a form that names one, so this is belt and braces rather than a real contest.
    fields[FIELD_TENDER_NUMBER] = parsed.tender_number or ""
    fields[FIELD_PURCHASE_ORDER_NUMBER] = parsed.purchase_order_number or ""

    form_meta = {
        "forms": dict(forms.form_ids),
        # The 93 technician readings. Carried here so Vendor Assignment can seed them onto the
        # SOLAR asset without a second MDMS round trip of its own.
        "systemFields": list(forms.system_field_names),
        # What the workbook matched when it was named, so drift since can be seen without
        # re-querying MDMS.
        "fingerprint": {
            "solar": list(forms.solar.sections),
            "machines": list(forms.machines.sections) if forms.machines else [],
        },
    }

    return fields, machine_section, solar_section, form_meta


def field_count(fields: Optional[Dict[str, Any]]) -> int:
    return len(fields or {})
