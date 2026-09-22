import { apiClient } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import { fetchFacilities } from "@/shared/api/facility";
import type { AuthUser } from "@/shared/stores/auth-store";
import { searchProjectFacilities } from "./project";
import { buildScopeBoundaryTree } from "../utils/boundary-tree";
import { extractBlobApiErrorMessage, postMultipartExpectingBlob } from "../utils/ingestion-request";
import type { GeographyDetails } from "../types/project";
import type { InstallationPlanScopeEntry } from "../types/installation-plan";
import type { DownloadedFile } from "../utils/file-download";

export class InstallationScopeApiError extends Error {}

export interface ScopeValidationResult {
  errorCount: number;
  file: DownloadedFile;
}

/**
 * `POST /ingestion-service/template/fieldplanFacilityIngestionTemplate` — JSON body, blob response.
 * The `boundary_data` tree must be scoped to facilities already linked to the project *and*
 * matching one of the plan's sectors (`facility_type`) — resolved here via
 * `project/facility/v1/_search` (linked ids) + a `facility-service` bulk search over the project's
 * own boundary blocks. Each returned row keeps its own sector; the backend derives per-row Solution
 * options from it rather than from one plan-wide sector.
 */
export async function downloadScopeTemplate(
  planId: string,
  projectId: string,
  sectorCodes: string[],
  projectGeography: GeographyDetails,
  accessToken: string,
  user?: AuthUser | null,
): Promise<DownloadedFile> {
  const [linkedFacilities, { facilities: candidateFacilities }] = await Promise.all([
    searchProjectFacilities(projectId, accessToken, user),
    fetchFacilities(
      (projectGeography.blocks ?? []).map((block) => block.code),
      user?.tenantId ?? "",
      accessToken,
      user,
    ),
  ]);

  const linkedIds = new Set(linkedFacilities.map((link) => link.facilityId));
  const wantedSectors = new Set(sectorCodes);
  const scopedFacilities = candidateFacilities.filter(
    (facility) => linkedIds.has(facility.facilityId) && Boolean(facility.facilityType) && wantedSectors.has(facility.facilityType!),
  );

  const response = await apiClient.post(
    "/ingestion-service/template/fieldplanFacilityIngestionTemplate",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      project_id: projectId,
      fieldplan_id: planId,
      sectors: sectorCodes,
      boundary_data: buildScopeBoundaryTree(projectGeography, scopedFacilities),
    },
    { responseType: "blob" },
  );

  return { blob: response.data as Blob, filename: `installation-scope-${planId}.xlsx` };
}

/**
 * `POST /ingestion-service/ingest/fieldPlanfacilitiesValidateData` — multipart:
 * `facility_file`, `facility_sheet_name`, `boundary_sheet_name`, `fieldplan_id`, `request_info`.
 * Response: annotated xlsx blob + `X-Error-Count` header.
 */
export async function validateScopeSheet(
  file: File,
  fieldPlanId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<ScopeValidationResult> {
  try {
    const { blob, errorCount } = await postMultipartExpectingBlob(
      "/ingestion-service/ingest/fieldPlanfacilitiesValidateData",
      {
        facility_sheet_name: "FacilityMapping",
        boundary_sheet_name: "BoundaryCodes",
        fieldplan_id: fieldPlanId,
      },
      file,
      "facility_file",
      accessToken,
      user,
    );
    return { file: { blob, filename: `installation-scope-validated-${file.name}` }, errorCount };
  } catch (error) {
    throw new InstallationScopeApiError((await extractBlobApiErrorMessage(error)) ?? "Scope validation failed");
  }
}

/**
 * `POST /ingestion-service/ingest/createFieldPlanFacility` — multipart: validated `facility_file`,
 * `facility_sheet_name`, `fieldplan_id`, `request_info`. On success, entries are derived from the
 * canonical `field-plans/facility/_search` read-back rather than parsing the returned workbook.
 */
export async function createScopeFromSheet(
  validatedFile: DownloadedFile,
  fieldPlanId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<{ entries: InstallationPlanScopeEntry[]; file: DownloadedFile }> {
  try {
    const file = new File([validatedFile.blob], validatedFile.filename, {
      type: validatedFile.blob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const { blob } = await postMultipartExpectingBlob(
      "/ingestion-service/ingest/createFieldPlanFacility",
      { facility_sheet_name: "FacilityMapping", fieldplan_id: fieldPlanId },
      file,
      "facility_file",
      accessToken,
      user,
    );
    const entries = await searchFieldPlanFacilities(fieldPlanId, accessToken, user);
    return { entries, file: { blob, filename: "installation-scope-linking-report.xlsx" } };
  } catch (error) {
    throw new InstallationScopeApiError((await extractBlobApiErrorMessage(error)) ?? "Scope creation failed");
  }
}

/**
 * `POST /field-planner/v1/field-plans/facility/_search` — base path is `/v1/field-plans/facility`,
 * not `/v1/facility`; body key is the singular `FieldPlanFacility`, and its `fieldPlanId` expects a
 * **list**, not a bare string. `tenantId`/`limit`/`offset` must also be query params — the endpoint
 * binds them via `@ModelAttribute URLParams`, so they 400 with `NotNull.URLParams.*` if only sent
 * in the body. Response rows are camelCase (`facilityId`/`solutionId`/`lockStatus`), not the
 * snake_case `facility_id`/`solution_id`/`lock_status` this used to assume — proven live: every
 * row was silently dropped by the `facility_id` filter below, so a plan's real scope always read
 * back empty on reload even though it was genuinely saved.
 */
export async function searchFieldPlanFacilities(
  fieldPlanId: string,
  accessToken?: string,
  user?: AuthUser | null,
): Promise<InstallationPlanScopeEntry[]> {
  const { data } = await apiClient.post<{
    FieldPlanFacilities?: Array<{ facilityId?: string; solutionId?: string; lockStatus?: string; isdeleted?: boolean }>;
  }>(
    "/field-planner/v1/field-plans/facility/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      FieldPlanFacility: { fieldPlanId: [fieldPlanId] },
    },
    { params: { tenantId: user?.tenantId, limit: 500, offset: 0 } },
  );

  return (data.FieldPlanFacilities ?? [])
    .filter(
      (row): row is { facilityId: string; solutionId?: string; lockStatus?: string; isdeleted?: boolean } =>
        Boolean(row.facilityId) && !row.isdeleted,
    )
    .map((row) => ({
      siteId: row.facilityId,
      included: true,
      solutionCode: row.solutionId,
      lockStatus: row.lockStatus === "LOCKED" ? "LOCKED" : "UNLOCKED",
    }));
}

/**
 * Same endpoint as `searchFieldPlanFacilities`, but for a whole plans list: one call across every
 * plan id, grouped client-side into a `fieldPlanId -> site count` map, rather than one request per
 * row. `fieldPlanId` accepts a list — confirmed live it returns each row's own `fieldPlanId`, so a
 * single search is enough to build the map.
 */
export async function searchFieldPlanFacilityCounts(
  fieldPlanIds: string[],
  accessToken?: string,
  user?: AuthUser | null,
): Promise<Record<string, number>> {
  if (fieldPlanIds.length === 0) return {};

  const { data } = await apiClient.post<{
    FieldPlanFacilities?: Array<{ fieldPlanId?: string; isdeleted?: boolean }>;
  }>(
    "/field-planner/v1/field-plans/facility/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      FieldPlanFacility: { fieldPlanId: fieldPlanIds },
    },
    { params: { tenantId: user?.tenantId, limit: 500, offset: 0 } },
  );

  const counts: Record<string, number> = {};
  for (const row of data.FieldPlanFacilities ?? []) {
    if (!row.fieldPlanId || row.isdeleted) continue;
    counts[row.fieldPlanId] = (counts[row.fieldPlanId] ?? 0) + 1;
  }
  return counts;
}
