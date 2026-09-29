"""Which of a project's end user sites fall inside a given geography.

The Installation Scope download, its step-1 preflight and the scope upload all need "the project's
sites inside these boundaries". Kept here, read-only, so the preflight can ask the question before a
plan exists at all.
"""
from typing import Any, Dict, List, Sequence

from app.core.logging import AppLogger
from app.core.tenant import LIVELIHOOD_TENANT_ID
from app.utils.field_plan_geography import is_under_any_boundary

logger = AppLogger().get_logger()


def project_sites_in_geography(
    request_info,
    project_id: str,
    boundary_codes: Sequence[str],
    project_client,
    facility_client,
) -> List[Dict[str, Any]]:
    """The project's own facilities whose boundary sits at or below one of `boundary_codes`.

    Looked up by facility **id**, not by boundary code. facility-service's bulk search matches
    `boundaryCodes` with an exact `boundary_code IN (...)`, and a site's boundary code is its block
    code plus a facility suffix (`{blockCode}_{facilityId}`) -- so asking by block code returns
    nothing, and the only caller able to use that search is one that already knows every site's
    full code. Step 1 of the wizard knows only the blocks it picked. Fetching the project's
    facilities by id and matching their codes here works from plain block codes, and still accepts
    full facility-level codes, since `is_under_any_boundary` also matches on equality.

    Raises on a failed lookup; callers decide whether that is fatal.
    """
    wanted = [code for code in boundary_codes if code]
    if not project_id or not wanted:
        return []

    links = project_client.search_project_facility(request_info, project_id).get("ProjectFacilities", [])
    facility_ids = sorted({link.get("facilityId") for link in links if link.get("facilityId")})
    if not facility_ids:
        return []

    result = facility_client.bulk_search_facility_with_boundary(
        request_info=request_info,
        tenant_ids=[LIVELIHOOD_TENANT_ID],
        facility_ids=facility_ids,
        limit=max(len(facility_ids), 50),
        send_non_paginated_response=True,
    )
    facilities = result.get("facilities") or []
    in_geography = [
        facility for facility in facilities
        if is_under_any_boundary(facility.get("boundary_code") or facility.get("boundaryCode") or "", wanted)
    ]
    logger.info(
        f"Project {project_id}: {len(in_geography)} of {len(facility_ids)} linked site(s) fall within "
        f"{len(wanted)} selected boundary code(s)")
    return in_geography
