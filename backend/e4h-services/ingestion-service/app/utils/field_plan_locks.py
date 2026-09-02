import os
from typing import Any, Dict, List, NamedTuple, Optional

from app.core.logging import AppLogger

logger = AppLogger().get_logger()

LOCK_STATUS_LOCKED = "LOCKED"

# The status a published installation plan carries. NOT hardcoded: field-planner-activity's
# vendor-assignment submit stores whatever egov-workflow-v2's INSTALLATION_PLAN business service
# returns for the PUBLISH action, so this has to track that workflow rather than assume a value.
# The default matches the business service as seeded (PUBLISH -> terminate state PUBLISHED); it was
# "SCHEDULED" while the status was written as a literal on the Java side.
#
# Override with INSTALLATION_PLAN_PUBLISHED_STATUS if the workflow's terminate state is renamed --
# and remember the equivalent Java property, installation.plan.published.status, must match.
PLAN_STATUS_PUBLISHED = os.getenv("INSTALLATION_PLAN_PUBLISHED_STATUS", "PUBLISHED").strip().upper()

REASON_PUBLISHED = "PUBLISHED"
REASON_LOCKED = "LOCKED"


class SiteLock(NamedTuple):
    """A site that is spoken for, and by which plan.

    reason distinguishes the two ways that happens:

    PUBLISHED -- the owning plan has been published, which bars the site from every other
    plan in the project permanently. Derived from the plan's own status rather than from a
    stored flag, so it needs no write anywhere, cannot drift out of sync, and applies to
    existing data with no backfill.

    LOCKED -- field_plan_facilities.lock_status is LOCKED: the site has been reserved by a
    plan's Installation Scope step. Note this reason only ever describes a SIBLING plan's claim
    -- a plan's own unpublished reservation is filtered out above, so that it can still edit its
    own scope.
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
        # A removed site is not spoken for. A site is reserved (lock_status = LOCKED) the moment
        # it joins a plan's scope, so without this a site removed from scope would stay barred
        # from the whole project for good -- its row still says LOCKED and no UI lists a deleted
        # row to unlock it. FieldPlannerFacilityService.releaseScopeLock also writes UNLOCKED on
        # unassign; this guard keeps the rule right even if that write is ever lost.
        if link.get("isdeleted") or link.get("isDeleted"):
            continue

        plan_id = link.get("fieldPlanId")
        is_published = plan_id in published_plan_ids
        is_locked = str(link.get("lockStatus") or "").strip().upper() == LOCK_STATUS_LOCKED
        if not is_published and not is_locked:
            continue

        is_this_plan = bool(current_field_plan_id) and plan_id == current_field_plan_id

        # A plan's own reservation is not a lock against itself. The scope lock exists to stop a
        # SIBLING plan taking the site; the owning plan must keep editing its own scope until it
        # publishes -- removing a site it just added, or changing a site's Solution.
        #
        # Without this, locking at scope time would make the Installation Scope step effectively
        # one-shot: every row of the plan's own sheet would come back frozen, the validator would
        # skip all of them (facility_validator treats an is_this_plan lock as fixed), and
        # re-uploading would fail with "No end user sites are selected".
        #
        # A PUBLISHED plan is different and still belongs in the map: its sites really are
        # dispatched, and its own sheet should render frozen.
        if is_this_plan and not is_published:
            continue

        candidate = SiteLock(
            field_plan_id=plan_id,
            field_plan_name=plan_names.get(plan_id),
            solution_id=link.get("solutionId"),
            is_this_plan=is_this_plan,
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
    # Reserved at scope time, not "installation started" -- a sibling plan can hold this site
    # while still in DRAFT, long before any vendor is dispatched. Saying otherwise sent the
    # Project Manager looking for an installation that had not begun.
    return (f"This end user site is already included in installation plan {owner}, so it cannot "
            f"be added to another plan in the same project. Remove it there first if it belongs "
            f"in this plan instead.")


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
