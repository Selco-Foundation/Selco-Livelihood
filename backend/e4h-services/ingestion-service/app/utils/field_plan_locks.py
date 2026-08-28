from typing import Any, Dict, List, NamedTuple, Optional

from app.core.logging import AppLogger

logger = AppLogger().get_logger()

LOCK_STATUS_LOCKED = "LOCKED"


class SiteLock(NamedTuple):
    """A site that is spoken for, and by which plan."""
    field_plan_id: str
    field_plan_name: Optional[str]
    solution_id: Optional[str]
    is_this_plan: bool


def build_project_lock_map(
    fieldplan_client,
    request_info,
    project_id: str,
    current_field_plan_id: Optional[str],
) -> Dict[str, SiteLock]:
    """Map facility_id -> SiteLock for every site locked anywhere in this Project.

    The lock is project-scoped: a site being installed under one plan cannot be taken by a
    sibling plan in the same project, so the scope sheet has to show sites held by *any*
    plan in the project, not just this one.

    Returns {} on failure rather than raising -- a lock lookup that errors should leave the
    sheet fully editable rather than block the download outright. The trade-off is that a
    transient outage makes locked rows temporarily editable; the upload recomputes this map
    and rejects such rows, so the authoritative check still runs before anything is written.
    """
    try:
        plans = fieldplan_client.search_fieldplans_by_project(request_info, project_id)
    except Exception as e:
        logger.error(f"Could not list plans for project {project_id}: {e}", exc_info=True)
        return {}

    plan_names = {p.get("id"): p.get("name") for p in plans if p.get("id")}
    if not plan_names:
        return {}

    try:
        links = fieldplan_client.search_facilities_for_plans(request_info, list(plan_names))
    except Exception as e:
        logger.error(f"Could not list facility links for project {project_id}: {e}", exc_info=True)
        return {}

    lock_map: Dict[str, SiteLock] = {}
    for link in links:
        if str(link.get("lockStatus") or "").strip().upper() != LOCK_STATUS_LOCKED:
            continue
        facility_id = link.get("facilityId")
        if not facility_id:
            continue
        plan_id = link.get("fieldPlanId")
        lock_map[facility_id] = SiteLock(
            field_plan_id=plan_id,
            field_plan_name=plan_names.get(plan_id),
            solution_id=link.get("solutionId"),
            is_this_plan=bool(current_field_plan_id) and plan_id == current_field_plan_id,
        )

    logger.info(f"Project {project_id}: {len(lock_map)} locked site(s) across {len(plan_names)} plan(s)")
    return lock_map


def lock_status_label(lock: Optional[SiteLock]) -> str:
    """What the sheet's read-only Lock Status cell shows. Blank means selectable."""
    if lock is None:
        return ""
    if lock.is_this_plan:
        return "Locked (this plan)"
    return f"Locked ({lock.field_plan_name or lock.field_plan_id})"


def solution_names_by_code(solutions: List[Dict[str, Any]]) -> Dict[str, str]:
    return {s.get("code"): s.get("name") for s in solutions if s.get("code")}


def solution_codes_by_name(solutions: List[Dict[str, Any]]) -> Dict[str, str]:
    """The sheet shows Solution names; solution_id stores the code, so uploads map back."""
    return {s.get("name"): s.get("code") for s in solutions if s.get("name")}
