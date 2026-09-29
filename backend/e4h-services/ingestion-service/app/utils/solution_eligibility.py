from typing import Any, Dict, FrozenSet, List, NamedTuple, Optional

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
    sector: Optional[str],
    state: Optional[str],
    sunshine_hours_by_state: Dict[str, float],
) -> List[str]:
    """Names of the Solutions a site may be assigned, per FR-01.

    A Solution qualifies when its sectorName matches *this site's own* sector AND its
    sunshineHrsMin equals the sunshine hours of the site's state. The sector is the site's,
    not the Plan's: a Plan may span several Sectors, and FR-01 narrows per site so an
    Agriculture site and a Textile & craft site in one Plan each get their own list.
    Returns [] when the site has no sector or its state has no sunshine-hours entry, so the
    dropdown is empty rather than wrongly permissive.
    """
    if not sector or not solutions:
        return []

    state_hours = _to_float(sunshine_hours_by_state.get(normalize_state_key(state or "")))
    if state_hours is None:
        return []

    wanted_sector = str(sector).strip().casefold()
    names: List[str] = []
    for solution in solutions:
        if str(solution.get("sectorName") or "").strip().casefold() != wanted_sector:
            continue
        min_hours = _to_float(solution.get("sunshineHrsMin"))
        # state_sunshine_hours is NUMERIC(4,2) while the MDMS value is JSON-parsed, so
        # compare rounded rather than raw: 5 and 5.00 are the same threshold.
        #
        # This is an *exact* match, not a floor, despite the field being named `...Min`:
        # confirmed as the intended rule 2026-09-25. A Solution is banded to one sunshine
        # figure, so a state with more sun than a Solution requires does not qualify for it.
        # The name is simply wrong; do not "fix" this to `>` without re-confirming against
        # FR-01, and see BACKEND_CHANGES_NEEDED.md #6 for what that would change.
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
    sunshine_hours_by_state: Dict[str, float],
    state_by_facility_id: Dict[str, str],
) -> Dict[int, List[str]]:
    """Map each facility's 0-based position to its eligible Solution names. Rows differ by
    both sector and state, so the cache is keyed on the pair.

    The sector is the site's own facility_type, set at ingestion -- a Plan may span several
    Sectors, so it cannot be taken from the Plan.

    The state comes from state_by_facility_id rather than the facility record: address.state
    is a field with no column behind it and is always null, so reading it here left every
    dropdown empty. The caller resolves the state from boundary_code -- the same way the
    sheet's State column is filled -- so generation and upload validation agree.
    """
    options_by_row: Dict[int, List[str]] = {}
    cache: Dict[tuple, List[str]] = {}

    for position, facility in enumerate(facilities):
        facility_id = facility.get("facility_id") or facility.get("facilityId")
        state = state_by_facility_id.get(facility_id, "") if facility_id else ""
        sector = facility.get("facility_type") or ""
        cache_key = (str(sector).strip().casefold(), normalize_state_key(state))
        if cache_key not in cache:
            cache[cache_key] = eligible_solution_names(
                solutions, sector, state, sunshine_hours_by_state
            )
        options_by_row[position] = cache[cache_key]

    return options_by_row


class ScopeCandidates(NamedTuple):
    """What a set of candidate sites can actually be used for, per `partition_scope_candidates`."""
    writable: List[Dict[str, Any]]
    options_by_row: Dict[int, List[str]]
    addable_count: int
    no_solution_ids: List[str]
    locked_elsewhere_ids: List[str]


def partition_scope_candidates(
    facilities: List[Dict[str, Any]],
    options_by_row: Dict[int, List[str]],
    lock_map: Dict[str, Any],
    protected_ids: FrozenSet[str] = frozenset(),
) -> ScopeCandidates:
    """Decide which candidate sites belong in an Installation Scope sheet, and which are addable.

    This is the one place that rule lives. The scope download and the pre-flight check both
    call it so they cannot disagree about whether a plan has any usable sites -- they gather
    their candidates differently (the download also reconciles the plan's existing scope, which
    is a write and must not happen on a read-only check), but they must judge them identically.

    - `writable`: the rows worth putting in the sheet. Everything except a site no Solution can
      be assigned to, which could only ever render as a dead cell -- no dropdown, and a
      validation failure on upload that reads like a data-entry fault.
    - `addable_count`: of those, how many a PM could newly include -- excludes sites a sibling
      plan already holds. This is what "does this geography and sector yield anything?" means.
    - `protected_ids`: sites that must be written even with no eligible Solution, because they
      are already in this plan's scope. Reference data can change after a plan is built, and
      silently dropping a site the plan already contains would hide it rather than explain it.

    `options_by_row` is keyed by position in `facilities`; the returned one is re-keyed to
    positions in `writable`.
    """
    writable: List[Dict[str, Any]] = []
    rekeyed: Dict[int, List[str]] = {}
    no_solution_ids: List[str] = []
    locked_elsewhere_ids: List[str] = []
    addable_count = 0

    for position, facility in enumerate(facilities):
        facility_id = facility.get("facility_id") or facility.get("facilityId")
        options = options_by_row.get(position) or []
        lock = lock_map.get(facility_id) if facility_id else None

        if not options and facility_id not in protected_ids:
            no_solution_ids.append(facility_id)
            continue

        rekeyed[len(writable)] = options
        writable.append(facility)

        if lock is not None and not lock.is_this_plan:
            locked_elsewhere_ids.append(facility_id)
            continue
        addable_count += 1

    return ScopeCandidates(
        writable=writable,
        options_by_row=rekeyed,
        addable_count=addable_count,
        no_solution_ids=no_solution_ids,
        locked_elsewhere_ids=locked_elsewhere_ids,
    )
