import os
from typing import Any, Dict, List, NamedTuple, Optional

from app.core.logging import AppLogger

logger = AppLogger().get_logger()

# The status a published installation plan carries. NOT hardcoded: field-planner-activity's
# vendor-assignment submit stores whatever egov-workflow-v2's INSTALLATION_PLAN business service
# returns for the PUBLISH action, so this has to track that workflow rather than assume a value.
# The default matches the business service as seeded (PUBLISH -> terminate state PUBLISHED); it was
# "SCHEDULED" while the status was written as a literal on the Java side.
#
# Override with INSTALLATION_PLAN_PUBLISHED_STATUS if the workflow's terminate state is renamed --
# and remember the equivalent Java property, installation.plan.published.status, must match.
PLAN_STATUS_PUBLISHED = os.getenv("INSTALLATION_PLAN_PUBLISHED_STATUS", "PUBLISHED").strip().upper()


class SiteLock(NamedTuple):
    """A site that is spoken for, and by which plan.

    There is only one way a site gets here: the owning plan has been published, which bars the
    site from every other plan in the project. Derived from the plan's own status rather than
    from a stored flag, so it needs no write anywhere, cannot drift out of sync, and applies to
    existing data with no backfill -- which is the whole reason `lock_status` is not consulted.

    is_this_plan marks the sheet's own rows: a published plan's scope renders frozen rather than
    barred, and the validator reads it as "must come back unchanged" instead of "cannot be added".
    """
    field_plan_id: str
    field_plan_name: Optional[str]
    solution_id: Optional[str]
    is_this_plan: bool


def build_project_lock_map(
    fieldplan_client,
    request_info,
    project_id: str,
    current_field_plan_id: Optional[str],
    strict: bool = False,
) -> Dict[str, SiteLock]:
    """Map facility_id -> SiteLock for every site held by a PUBLISHED plan in this Project.

    The scope is the project, not one plan: a site published under one plan cannot be taken by a
    sibling plan, so the scope sheet has to show sites held by *any* published plan in the project.

    `strict` decides what a failed lookup means. Read-only callers (the scope download, the
    preflight) leave it False and get {} -- an outage should render the sheet editable rather than
    block the download outright. Callers that are about to *write* scope must pass True and turn
    the exception into a 502: the docstring used to claim the upload re-check made fail-open safe,
    but the upload called this same helper, so one outage silently disabled the rule on both sides.
    """
    try:
        plans = fieldplan_client.search_fieldplans_by_project(request_info, project_id)
    except Exception as e:
        logger.error(f"Could not list plans for project {project_id}: {e}", exc_info=True)
        if strict:
            raise
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
        if strict:
            raise
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
        # Published plans only. A site sitting in a sibling DRAFT plan stays selectable: two
        # drafts may both hold it, and whichever publishes first wins -- the second is refused at
        # publish time by VendorAssignmentService's SITE_PUBLISHED_ELSEWHERE check. That makes the
        # download, the upload and the publish check agree on one definition of "taken".
        #
        # `lockStatus` is deliberately not consulted. Nothing anywhere calls /facility/_update-lock,
        # unassign already marks the row isdeleted (handled above), and the column's migration
        # default is 'UNLOCKED' -- so a persister config that predates the column is
        # indistinguishable from a genuine release, and silently unlocks every site in the project.
        if plan_id not in published_plan_ids:
            continue

        # A published plan's own sheet renders frozen -- its sites really are dispatched -- which
        # is why, unlike the earlier scope-time lock, there is no carve-out here. An unpublished
        # plan never reaches this point at all, so its own scope step stays fully editable.
        is_this_plan = bool(current_field_plan_id) and plan_id == current_field_plan_id

        # First published claim wins. A site should only ever be in one, and if the data says
        # otherwise the earliest is as good an answer as any -- the publish-time check is what
        # stops a second one being created.
        lock_map.setdefault(facility_id, SiteLock(
            field_plan_id=plan_id,
            field_plan_name=plan_names.get(plan_id),
            solution_id=link.get("solutionId"),
            is_this_plan=is_this_plan,
        ))

    logger.info(
        f"Project {project_id}: {len(lock_map)} site(s) held by a published plan, across "
        f"{len(plan_names)} plan(s) ({len(published_plan_ids)} published)")
    if len(plan_names) > 1 and not lock_map:
        # Worth a warning, not just silence: this is what the bug looked like from the outside --
        # a project with several plans and not a single locked site. If it is unexpected, check
        # that field_plans.status really holds the configured published literal.
        logger.warning(
            f"Project {project_id} has {len(plan_names)} plans but no site is held by any of "
            f"them; {len(published_plan_ids)} plan(s) matched status '{PLAN_STATUS_PUBLISHED}'")
    return lock_map


def site_bar_message(lock: SiteLock) -> str:
    """Why an included row was rejected. Names the owning plan so the Project Manager can go and
    look at it rather than guessing which plan took the site -- the Lock Status cell only says
    that the row is taken, not by what."""
    owner = lock.field_plan_name or lock.field_plan_id
    return (f"This end user site has already been added and published into installation plan "
            f"{owner}. It cannot be part of another installation plan in the same project.")


def lock_status_label(lock: Optional[SiteLock]) -> str:
    """What the sheet's read-only Lock Status cell shows. Blank means selectable.

    Deliberately just "Locked", with no plan name: the cell is a status, and a PM scanning a long
    sheet wants to know which rows are off-limits, not to read a plan code on every one. The
    owning plan is named where it is actionable instead -- in `site_bar_message` when an upload is
    rejected, and in the publish-time error.
    """
    return "Locked" if lock is not None else ""


def solution_names_by_code(solutions: List[Dict[str, Any]]) -> Dict[str, str]:
    return {s.get("code"): s.get("name") for s in solutions if s.get("code")}


def solution_codes_by_name(solutions: List[Dict[str, Any]]) -> Dict[str, str]:
    """The sheet shows Solution names; solution_id stores the code, so uploads map back."""
    return {s.get("name"): s.get("code") for s in solutions if s.get("name")}
