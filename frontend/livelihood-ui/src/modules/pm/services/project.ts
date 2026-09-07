import { apiClient, type AuthUser, tenantId } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type {
  Project,
  ProjectSearchCriteria,
  ProjectStatusWrapper,
} from "../types/project";

interface ProjectResponse {
  Project?: Project[];
}

interface ProjectV2SearchResponse {
  Project?: ProjectStatusWrapper[];
  // The v2 search response uses lowercase `totalCount`, unlike `_create`'s
  // `TotalCount` — confirmed against the live response, not a typo here.
  totalCount?: number;
}

/** Placeholders required because these columns are NOT NULL in `project`'s
 *  DDL, even though the create validator never checks them. */
const MANDATORY_PLACEHOLDERS = {
  projectSubType: "PROJECT",
  department: "",
  description: "",
  referenceID: "1",
};

export async function createProject(
  project: Project,
  accessToken: string,
  user: AuthUser | null | undefined,
): Promise<Project> {
  const { data } = await apiClient.post<ProjectResponse>("/project/v1/_create", {
    RequestInfo: createRequestInfo(accessToken, user),
    Projects: [{ ...MANDATORY_PLACEHOLDERS, ...project }],
    apiOperation: "CREATE",
  });

  const created = data.Project?.[0];
  if (!created) {
    throw new Error("PROJECT_CREATE_FAILED");
  }
  return created;
}

export async function updateProject(
  project: Project,
  accessToken: string,
  user: AuthUser | null | undefined,
): Promise<Project> {
  const { data } = await apiClient.post<ProjectResponse>("/project/v1/_update", {
    RequestInfo: createRequestInfo(accessToken, user),
    Projects: [{ ...MANDATORY_PLACEHOLDERS, ...project }],
    apiOperation: "UPDATE",
    isCascadingProjectDateUpdate: true,
  });

  const updated = data.Project?.[0];
  if (!updated) {
    throw new Error("PROJECT_UPDATE_FAILED");
  }
  return updated;
}

export interface SearchProjectsParams {
  criteria: ProjectSearchCriteria;
  limit: number;
  offset: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
  accessToken: string;
  user?: AuthUser | null;
}

export async function searchProjects({
  criteria,
  limit,
  offset,
  sortBy,
  sortDirection = "DESC",
  accessToken,
  user,
}: SearchProjectsParams): Promise<{ projects: ProjectStatusWrapper[]; totalCount: number }> {
  const { data } = await apiClient.post<ProjectV2SearchResponse>(
    "/project/v2/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      Project: criteria,
    },
    {
      params: {
        tenantId: tenantId(),
        limit,
        offset,
        includeAncestors: false,
        includeDescendants: false,
        ...(sortBy ? { sortBy, sortDirection } : {}),
      },
    },
  );

  return { projects: data.Project ?? [], totalCount: data.totalCount ?? 0 };
}

export async function scheduleProject(
  projectId: string,
  accessToken: string,
  user: AuthUser | null | undefined,
): Promise<void> {
  await apiClient.post("/project/v1/project/workflow/update", {
    RequestInfo: createRequestInfo(accessToken, user),
    projectId,
    workflow: { action: "SCHEDULED", comments: "Schedule Project" },
  });
}
