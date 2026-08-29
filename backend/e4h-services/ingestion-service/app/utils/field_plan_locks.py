from typing import Any, Dict, List, NamedTuple, Optional

from app.core.logging import AppLogger

logger = AppLogger().get_logger()

LOCK_STATUS_LOCKED = "LOCKED"

# field_plans has no PUBLISHED status: FieldPlannerService transitions a plan to SCHEDULED,
# which is this codebase's publish equivalent.
PLAN_STATUS_PUBLISHED = "SCHEDULED"

REASON_PUBLISHED = "PUBLISHED"
REASON_LOCKED = "LOCKED"


class SiteLock(NamedTuple):
    """A site that is spoken for, and by which plan.

    reason distinguishes the two ways that happens:

    PUBLISHED -- the owning plan has been published, which bars the site from every other
    plan in the project permanently. Derived from the plan's own status rather than from a
    stored flag, so it needs no write anywhere, cannot drift out of sync, and applies to
    existing data with no backfill.

    LOCKED -- field_plan_facilities.lock_status is LOCKED, the finer-grained per-site lock
    for a site whose installation is under way. Nothing sets it yet; it belongs to whatever
    marks an IC report in progress.
    """
    field_plan_id: str
    field_plan_name: Optional[str]
    solution_id: Optional[str]
    is_this_plan: bool
    reason: str = REASON_LOCKED


def build_project_lock_map(
    fieldplan_client,
    request_info,
    project_id: str,
    current_field_plan_id: Optional[str],
) -> Dict[str, SiteLock]:
    """Map facility_id -> SiteLock for every site spoken for anywhere in this Project.

    The scope is the project, not one plan: a site being installed under one plan cannot be
    taken by a sibling plan, so the scope sheet has to show sites held by *any* plan in the
    project.

    Returns {} on failure rather than raising -- a lookup that errors should leave the sheet
    fully editable rather than block the download outright. The trade-off is that a transient
    outage makes barred rows temporarily editable; the upload recomputes this map and rejects
    such rows, so the authoritative check still runs before anything is written.
    """
    try:
        plans = fieldplan_client.search_fieldplans_by_project(request_info, project_id)
    except Exception as e:
        logger.error(f"Could not list plans for project {project_id}: {e}", exc_info=True)
        return {}

    plan_names = {p.get("id"): p.get("name") for p in plans if p.get("id")}
    published_plan_ids = {
        p.get("id") for p in plans
        if p.get("id") and str(p.get("status") or "").strip().upper() == PLAN_STATUS_PUBLISHED
    }
    if not plan_names:
        return {}

    try:
        links = fieldplan_client.search_facilities_for_plans(request_info, list(plan_names))
    except Exception as e:
        logger.error(f"Could not list facility links for project {project_id}: {e}", exc_info=True)
        return {}

    lock_map: Dict[str, SiteLock] = {}
    for link in links:
        facility_id = link.get("facilityId")
        if not facility_id:
            continue
        plan_id = link.get("fieldPlanId")
        is_published = plan_id in published_plan_ids
        is_locked = str(link.get("lockStatus") or "").strip().upper() == LOCK_STATUS_LOCKED
        if not is_published and not is_locked:
            continue

        candidate = SiteLock(
            field_plan_id=plan_id,
            field_plan_name=plan_names.get(plan_id),
            solution_id=link.get("solutionId"),
            is_this_plan=bool(current_field_plan_id) and plan_id == current_field_plan_id,
            # A published plan is the stronger claim, so it wins when a site is both.
            reason=REASON_PUBLISHED if is_published else REASON_LOCKED,
        )
        # A site can appear under several plans in a project. Keep whichever claim is
        # strongest, so one DRAFT plan's stale LOCKED row cannot mask a sibling's publish.
        existing = lock_map.get(facility_id)
        if existing is None or (existing.reason != REASON_PUBLISHED
                                and candidate.reason == REASON_PUBLISHED):
            lock_map[facility_id] = candidate

    published = sum(1 for lock in lock_map.values() if lock.reason == REASON_PUBLISHED)
    logger.info(
        f"Project {project_id}: {len(lock_map)} site(s) spoken for across {len(plan_names)} plan(s) "
        f"({published} by a published plan)")
    return lock_map


def site_bar_message(lock: SiteLock) -> str:
    """Why an included row was rejected. Names the owning plan so the Project Manager can go
    and look at it rather than guessing which plan took the site."""
    owner = lock.field_plan_name or lock.field_plan_id
    if lock.reason == REASON_PUBLISHED:
        return (f"This end user site has already been added and published into installation plan "
                f"{owner}. It cannot be part of another installation plan in the same project.")
    return (f"This end user site's installation has already started under installation plan "
            f"{owner}, so it cannot be added to another plan in the same project.")


def lock_status_label(lock: Optional[SiteLock]) -> str:
    """What the sheet's read-only Lock Status cell shows. Blank means selectable."""
    if lock is None:
        return ""
    if lock.is_this_plan:
        return "Locked (this plan)"
    owner = lock.field_plan_name or lock.field_plan_id
    if lock.reason == REASON_PUBLISHED:
        return f"Published in {owner}"
    return f"Locked ({owner})"


def solution_names_by_code(solutions: List[Dict[str, Any]]) -> Dict[str, str]:
    return {s.get("code"): s.get("name") for s in solutions if s.get("code")}


def solution_codes_by_name(solutions: List[Dict[str, Any]]) -> Dict[str, str]:
    """The sheet shows Solution names; solution_id stores the code, so uploads map back."""
    return {s.get("name"): s.get("code") for s in solutions if s.get("name")}
