import { apiClient, tenantId } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { AuthUser } from "@/shared/stores/auth-store";
import type { Project, ProjectListFilters, ProjectSearchCriteria, ProjectV2SearchResult } from "../types/project";
import { resolveStates } from "../utils/geography";
import { fetchAllPages, searchUrlParams } from "../utils/url-params";

interface ProjectResponse {
  Project?: Project[];
}

/**
 * `project`'s write is async (Kafka -> egov-persister) and can 200 while the row never lands if
 * any NOT-NULL-but-unvalidated field is missing. Poll `_search` a few times with backoff before
 * trusting a create/update actually landed — proven necessary live.
 */
async function waitForProject(id: string, accessToken?: string, user?: AuthUser | null): Promise<Project> {
  const delays = [500, 1000, 2000];
  for (const delay of delays) {
    const result = await searchProjects({ criteria: { id: [id] }, limit: 1, offset: 0 }, accessToken, user);
    const found = result.projects[0]?.project;
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("PROJECT_NOT_CONFIRMED");
}

/** `POST /project/v1/_create` */
export async function createProject(
  project: Project,
  accessToken?: string,
  user?: AuthUser | null,
): Promise<Project> {
  const { data } = await apiClient.post<ProjectResponse>("/project/v1/_create", {
    RequestInfo: createRequestInfo(accessToken, user),
    Projects: [project],
    apiOperation: "CREATE",
  });

  const created = data.Project?.[0];
  if (!created?.id) throw new Error("PROJECT_CREATE_FAILED");

  return waitForProject(created.id, accessToken, user);
}

/** `POST /project/v1/_update` */
export async function updateProject(
  project: Project,
  accessToken?: string,
  user?: AuthUser | null,
): Promise<Project> {
  const { data } = await apiClient.post<ProjectResponse>("/project/v1/_update", {
    RequestInfo: createRequestInfo(accessToken, user),
    Projects: [project],
    apiOperation: "UPDATE",
  });

  const updated = data.Project?.[0] ?? project;
  return updated;
}

/** `POST /project/v2/_search` */
export async function searchProjects(
  {
    criteria,
    filters,
    limit = 10,
    offset = 0,
  }: {
    criteria?: ProjectSearchCriteria;
    filters?: ProjectListFilters;
    limit?: number;
    offset?: number;
  },
  accessToken?: string,
  user?: AuthUser | null,
): Promise<ProjectV2SearchResult> {
  type ProjectWrapper = { project: Project; status?: string | null };

  async function fetchPage(pageLimit: number, pageOffset: number) {
    const { data } = await apiClient.post<{ Project?: ProjectWrapper[]; totalCount?: number }>(
      "/project/v2/_search",
      { RequestInfo: createRequestInfo(accessToken, user), Project: criteria ?? {} },
      {
        params: {
          tenantId: tenantId(),
          limit: pageLimit,
          offset: pageOffset,
          includeAncestors: false,
          includeDescendants: false,
        },
      },
    );
    return { wrappers: data.Project ?? [], totalCount: data.totalCount };
  }

  // Geography/status filtering isn't a server-side search criterion, so it has to happen here.
  // That makes filtering and pagination interact badly: filtering only the current page would
  // show "3 of 47 projects" while the paginator reported the server's unfiltered 47, and each
  // page would filter a different slice. So when a filter is active every page is read first and
  // the filtering, counting and paging all happen over the complete set. Without a filter this
  // stays a single request, exactly as before.
  const hasFilters = Boolean(filters?.stateCodes.length || filters?.statuses.length);

  if (!hasFilters) {
    const { wrappers, totalCount } = await fetchPage(limit, offset);
    return {
      projects: wrappers.map(({ project }) => ({
        project,
        status: project.additionalDetails?.status ?? "DRAFT",
      })),
      totalCount: totalCount ?? wrappers.length,
    };
  }

  const allWrappers = await fetchAllPages(async (pageLimit, pageOffset) => {
    const { wrappers } = await fetchPage(pageLimit, pageOffset);
    return wrappers;
  });

  let matching = allWrappers;
  if (filters?.stateCodes.length) {
    const selectedStates = new Set(filters.stateCodes);
    matching = matching.filter(({ project }) =>
      resolveStates(project.additionalDetails?.geographyDetails).some((state) => selectedStates.has(state.code)),
    );
  }
  if (filters?.statuses.length) {
    const selectedStatuses = new Set(filters.statuses);
    matching = matching.filter(({ project }) => selectedStatuses.has(project.additionalDetails?.status ?? "DRAFT"));
  }

  return {
    projects: matching.slice(offset, offset + limit).map(({ project }) => ({
      project,
      status: project.additionalDetails?.status ?? "DRAFT",
    })),
    totalCount: matching.length,
  };
}

/** `POST /project/facility/v1/_search` — the facilities linked to a project. */
export async function searchProjectFacilities(
  projectId: string,
  accessToken?: string,
  user?: AuthUser | null,
): Promise<Array<{ facilityId: string }>> {
  const rows = await fetchAllPages(async (limit, offset) => {
    const { data } = await apiClient.post<{ ProjectFacilities?: Array<{ facilityId?: string }> }>(
      "/project/facility/v1/_search",
      {
        RequestInfo: createRequestInfo(accessToken, user),
        ProjectFacility: { projectId: [projectId] },
      },
      { params: { ...searchUrlParams(user, { limit, offset }), includeDeleted: false } },
    );
    return data.ProjectFacilities ?? [];
  });

  return rows
    .filter((link): link is { facilityId: string } => Boolean(link.facilityId))
    .map((link) => ({ facilityId: link.facilityId }));
}

/**
 * `POST /project/v1/project/workflow/update` — moves a project out of "DRAFT" into "SCHEDULED".
 * Confirmed live against the deployed `FACILITY_INSTALLATION` business service: the start state's
 * only action is `"SCHEDULED"`, permitted for the `PROJECT_MANAGER` role. The action must be
 * nested inside a `workflow` object — `ProjectWorkflowRequest.getWorkflow()` is null otherwise,
 * and `ProjectService.updateProjectWorkflow` NPEs on `.getAction()`, surfacing only as an opaque
 * `WORKFLOW_TRANSITION_FAILED` 400 (proven live: a flat top-level `action` field 400s this way).
 */
export async function scheduleProject(
  projectId: string,
  accessToken?: string,
  user?: AuthUser | null,
): Promise<Project> {
  const { data } = await apiClient.post<{ Project?: Array<{ project: Project }> }>(
    "/project/v1/project/workflow/update",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      projectId,
      workflow: { action: "SCHEDULED" },
    },
  );

  const updated = data.Project?.[0]?.project;
  if (!updated) throw new Error("PROJECT_SCHEDULE_FAILED");

  return updated;
}
