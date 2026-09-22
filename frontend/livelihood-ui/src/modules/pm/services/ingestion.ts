import { apiClient } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { AuthUser } from "@/shared/stores/auth-store";
import { extractBlobApiErrorMessage, postMultipartExpectingBlob } from "../utils/ingestion-request";
import { buildProjectBoundaryTree } from "../utils/boundary-tree";
import type { DownloadedFile } from "../utils/file-download";
import type { GeographyDetails } from "../types/project";

export interface ValidationResult {
  file: DownloadedFile;
  errorCount: number;
}

export class IngestionApiError extends Error {}

/**
 * `POST /ingestion-service/template/facilityIngestionTemplateWithData` — JSON body, blob response.
 * `boundary_data` here uses plain state/district/block codes (no facility-level leaves): this
 * endpoint discovers matching facilities server-side, unlike the Installation Scope template
 * (`installation-scope.ts`), which is restricted to facilities already linked to the project and
 * therefore needs facility-level leaf codes.
 */
export async function downloadFacilityIngestionTemplate(
  projectId: string,
  geographyDetails: GeographyDetails,
  accessToken?: string,
  user?: AuthUser | null,
): Promise<DownloadedFile> {
  const response = await apiClient.post(
    "/ingestion-service/template/facilityIngestionTemplateWithData",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      project_id: projectId,
      boundary_data: buildProjectBoundaryTree(geographyDetails),
    },
    { responseType: "blob" },
  );

  return { blob: response.data as Blob, filename: `facility-ingestion-template-${projectId}.xlsx` };
}

/**
 * `POST /ingestion-service/ingest/facilitiesValidateData` — multipart:
 * `facility_file`, `project_id`, `facility_sheet_name`, `boundary_sheet_name`, `request_info`.
 * Response: annotated xlsx blob + `X-Error-Count` header. Also 400s if the uploaded `BoundaryCodes`
 * sheet's codes don't exactly match the project's own `geographyDetails.blocks[].code` set.
 */
export async function validateFacilitiesExcel(
  file: File,
  projectId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<ValidationResult> {
  try {
    const { blob, errorCount } = await postMultipartExpectingBlob(
      "/ingestion-service/ingest/facilitiesValidateData",
      {
        project_id: projectId,
        facility_sheet_name: "FacilityMapping",
        boundary_sheet_name: "BoundaryCodes",
      },
      file,
      "facility_file",
      accessToken,
      user,
    );
    return { file: { blob, filename: `facility-validation-${file.name}` }, errorCount };
  } catch (error) {
    throw new IngestionApiError((await extractBlobApiErrorMessage(error)) ?? "Facility validation failed");
  }
}

/**
 * `POST /ingestion-service/ingest/createFacilityAndUpdateProject` — multipart: validated
 * `facility_file`, `project_id`, `facility_sheet_name`, `request_info`. Requires every row's
 * `status` column be `PASSED`. Internally bulk-links facilities to the project itself — no separate
 * `project/facility/v1/_create` call is needed from the frontend. Response: annotated result
 * workbook (blob) — treated as success on 200, not parsed.
 */
export async function createFacilitiesAndUpdateProject(
  validatedFile: DownloadedFile,
  projectId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<DownloadedFile> {
  try {
    const file = new File([validatedFile.blob], validatedFile.filename, {
      type: validatedFile.blob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const { blob } = await postMultipartExpectingBlob(
      "/ingestion-service/ingest/createFacilityAndUpdateProject",
      { project_id: projectId, facility_sheet_name: "FacilityMapping" },
      file,
      "facility_file",
      accessToken,
      user,
    );
    return { blob, filename: `facility-creation-result-${projectId}.xlsx` };
  } catch (error) {
    throw new IngestionApiError((await extractBlobApiErrorMessage(error)) ?? "Facility creation failed");
  }
}
