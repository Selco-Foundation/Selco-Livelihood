"""A field plan's geography, and whether a site falls inside it.

Kept apart from `field_plan_locks` because nothing here talks to a service: both functions are
pure, and both exist to be used identically by the scope download (which picks the sites) and
the scope upload (which checks the sites that come back).
"""
from typing import Any, Dict, List, Optional, Sequence

from app.core.logging import AppLogger

logger = AppLogger().get_logger()

# Most specific first: a plan's blocks describe its geography exactly, and the coarser levels are
# only ever a fallback for a record that never recorded them.
_GEOGRAPHY_LEVELS = ("blocks", "districts", "states", "state")


def _boundary_code(entry: Any) -> str:
    """One boundary code, from either shape a geographyDetails list can hold.

    Three writers disagree about this structure and all three reach here:
    `livelihood-ui` stores a field plan's geography as flat code strings, `installation-ui`
    stores `state` as a bare string rather than a `states` list, and project-service stores
    `{"code": ..., "name": ...}` dicts. Normalising costs a line; guessing wrong yields an empty
    code list, which would read as "this plan covers nowhere".
    """
    if isinstance(entry, str):
        return entry.strip()
    if isinstance(entry, dict):
        return str(entry.get("code") or "").strip()
    return ""


def plan_boundary_codes(field_plan: Optional[Dict[str, Any]]) -> List[str]:
    """The boundary codes a field plan covers, at the most specific level it recorded.

    Returns [] -- and logs -- when the record carries no usable geography at all, which callers
    must treat as "cannot check" rather than "covers nothing".
    """
    geography = (field_plan or {}).get("geographyDetails") or {}
    if not isinstance(geography, dict):
        logger.warning(f"Field plan geographyDetails is {type(geography).__name__}, not an object")
        return []

    for level in _GEOGRAPHY_LEVELS:
        value = geography.get(level)
        if value is None:
            continue
        # `state` is a scalar on plans written by installation-ui; every other level is a list.
        entries = value if isinstance(value, (list, tuple, set)) else [value]
        codes = [code for code in (_boundary_code(e) for e in entries) if code]
        if codes:
            return codes

    logger.warning(
        f"Field plan geography has no boundary codes at any of {_GEOGRAPHY_LEVELS}; "
        f"keys present: {sorted(geography)}"
    )
    return []


def is_under_any_boundary(boundary_code: str, ancestor_codes: Sequence[str]) -> bool:
    """Whether a facility's boundary code sits at or below one of these boundaries.

    A facility's code is its block's code, optionally suffixed with a facility-specific segment
    (INDIA_ASSAM_BAKSA_BORABARI_ED/2026/0093). The same match the scope download makes in
    `resolve_boundary_names_for_code`; the trailing underscore is what stops BORABARI matching
    BORABARI2.
    """
    code = (boundary_code or "").strip()
    if not code:
        return False
    # `plan_boundary_codes` already drops blanks, but this is called with whatever a caller has
    # and a None in the list must not take the request down.
    ancestors = [str(a).strip() for a in ancestor_codes if a]
    return any(
        code == ancestor or code.startswith(ancestor + "_")
        for ancestor in ancestors if ancestor
    )
