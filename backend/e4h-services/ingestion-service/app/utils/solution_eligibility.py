from typing import Any, Dict, List, Optional

from app.core.logging import AppLogger
from app.utils.state_sunshine_hours_repository import normalize_state_key

logger = AppLogger().get_logger()


def _to_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def eligible_solution_names(
    solutions: List[Dict[str, Any]],
    plan_sector: Optional[str],
    state: Optional[str],
    sunshine_hours_by_state: Dict[str, float],
) -> List[str]:
    """Names of the Solutions a site may be assigned, per FR-01.

    A Solution qualifies when its sectorName matches the Plan's single sector AND its
    sunshineHrsMin equals the sunshine hours of the site's state. Returns [] when the
    Plan has no sector yet or the state has no sunshine-hours entry, so the dropdown is
    empty rather than wrongly permissive.
    """
    if not plan_sector or not solutions:
        return []

    state_hours = _to_float(sunshine_hours_by_state.get(normalize_state_key(state or "")))
    if state_hours is None:
        return []

    wanted_sector = str(plan_sector).strip().casefold()
    names: List[str] = []
    for solution in solutions:
        if str(solution.get("sectorName") or "").strip().casefold() != wanted_sector:
            continue
        min_hours = _to_float(solution.get("sunshineHrsMin"))
        # state_sunshine_hours is NUMERIC(4,2) while the MDMS value is JSON-parsed, so
        # compare rounded rather than raw: 5 and 5.00 are the same threshold.
        if min_hours is None or round(min_hours, 2) != round(state_hours, 2):
            continue
        name = solution.get("name")
        if name and name not in names:
            names.append(name)
    return names


SOLUTION_COLUMN = "Solution"


def clear_solution_column_dropdown(
    facility_schema: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Strip the Solution column's MDMS-derived values so the generic template code doesn't
    attach a flat, unfiltered dropdown of every Solution on top of the per-row filtered one
    this feature builds. A site is assigned exactly one Solution, so the column stays single.
    """
    cleared: List[Dict[str, Any]] = []
    for column in facility_schema:
        if column.get("name") != SOLUTION_COLUMN:
            cleared.append(column)
            continue
        copy = dict(column)
        copy["mdms_values"] = []
        copy["mdms_options"] = []
        cleared.append(copy)
    return cleared


def build_solution_options_by_row(
    facilities: List[Dict[str, Any]],
    solutions: List[Dict[str, Any]],
    plan_sector: Optional[str],
    sunshine_hours_by_state: Dict[str, float],
    state_by_facility_id: Dict[str, str],
) -> Dict[int, List[str]]:
    """Map each facility's 0-based position to its eligible Solution names. Sector is
    constant across a Plan, so in practice rows only differ by their state.

    The state comes from state_by_facility_id rather than the facility record: address.state
    is a field with no column behind it and is always null, so reading it here left every
    dropdown empty. The caller resolves the state from boundary_code -- the same way the
    sheet's State column is filled -- so generation and upload validation agree.
    """
    options_by_row: Dict[int, List[str]] = {}
    cache: Dict[str, List[str]] = {}

    for position, facility in enumerate(facilities):
        facility_id = facility.get("facility_id") or facility.get("facilityId")
        state = state_by_facility_id.get(facility_id, "") if facility_id else ""
        cache_key = normalize_state_key(state)
        if cache_key not in cache:
            cache[cache_key] = eligible_solution_names(
                solutions, plan_sector, state, sunshine_hours_by_state
            )
        options_by_row[position] = cache[cache_key]

    return options_by_row
