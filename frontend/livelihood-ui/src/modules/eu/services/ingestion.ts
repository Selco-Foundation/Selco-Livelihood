import { apiClient, type AuthUser, type BoundaryDataNode } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { IngestUploadResult } from "../types/boundary";
import { multipartAuthConfig } from "../utils/ingestion-request";

/**
 * axios hands a failed request's JSON error body back as a `Blob` whenever `responseType: "blob"`
 * is set (every call in this file, since all of them can answer with either a workbook or a JSON
 * error) — the backend's actual validation message sits unread inside it. Parses that Blob's JSON
 * in place on `error.response.data` so every caller's existing `extractApiErrorMessage(error)`
 * call keeps reading it exactly like any normal JSON error response, no caller changes needed.
 */
async function resolveBlobErrorBody(error: unknown): Promise<never> {
  const response = (error as { response?: { data?: unknown; headers?: Record<string, string> } })?.response;
  const contentType = response?.headers?.["content-type"] ?? "";
  if (response && response.data instanceof Blob && contentType.includes("application/json")) {
    try {
      response.data = JSON.parse(await response.data.text());
    } catch {
      // Leave response.data as the Blob — extractApiErrorMessage falls back to the generic message.
    }
  }
  throw error;
}

function parseFilenameFromDisposition(disposition: string): string | undefined {
  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ""));
  }
  const asciiMatch = /filename\s*=\s*"?([^"]+)"?/i.exec(disposition);
  return asciiMatch?.[1];
}

/** Triggers a browser download for a blob the server returned (template files, annotated error files — see `uploadBoundaryData` below). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export async function downloadBoundaryTemplate(accessToken: string, user?: AuthUser | null): Promise<void> {
  const response = await apiClient
    .post(
      "/ingestion-service/template/boundaryIngestionTemplate",
      { RequestInfo: createRequestInfo(accessToken, user) },
      { responseType: "blob" },
    )
    .catch(resolveBlobErrorBody);

  const disposition = response.headers["content-disposition"] ?? "";
  const filename = parseFilenameFromDisposition(disposition) ?? "boundary-ingestion-template.xlsx";
  downloadBlob(response.data as Blob, filename);
}

const DEFAULT_BOUNDARY_SHEET_NAME = "Boundary Data";

/**
 * Always answers with the annotated workbook (never a bare JSON ack) plus
 * `x-error-count`/`x-duplicate-count` headers, whether or not any rows
 * failed or already existed.
 */
export async function uploadBoundaryData(
  file: File,
  accessToken: string,
  user?: AuthUser | null,
): Promise<IngestUploadResult> {
  const formData = new FormData();
  formData.append("boundary_file", file);
  formData.append("boundary_sheet_name", DEFAULT_BOUNDARY_SHEET_NAME);
  formData.append("request_info", JSON.stringify(createRequestInfo(accessToken, user)));

  const response = await apiClient
    .post("/ingestion-service/ingest/boundaries", formData, {
      ...multipartAuthConfig(accessToken),
      responseType: "blob",
    })
    .catch(resolveBlobErrorBody);

  const errorCount = Number.parseInt(String(response.headers["x-error-count"] ?? "0"), 10);
  const duplicateCount = Number.parseInt(String(response.headers["x-duplicate-count"] ?? "0"), 10);
  const disposition = String(response.headers["content-disposition"] ?? "");
  const filename = parseFilenameFromDisposition(disposition) ?? "boundary-upload-result.xlsx";

  return {
    success: errorCount === 0,
    errorCount,
    duplicateCount,
    resultFile: { blob: response.data as Blob, filename },
  };
}

/** `boundaryCodes` (from the geography step, see `buildBoundaryCodeSelection`) limits the
 *  template - its boundary sheet and its State/District/Block dropdowns - to the blocks under
 *  those state, district and block codes; without it the template covers every block. Codes,
 *  not the whole tree, so selecting every state stays under the gateway's request-size limit. */
export async function downloadFacilityTemplate(
  accessToken: string,
  user?: AuthUser | null,
  boundaryCodes?: string[],
): Promise<void> {
  const formData = new FormData();
  formData.append("request_info", JSON.stringify(createRequestInfo(accessToken, user)));
  if (boundaryCodes) {
    formData.append("boundary_codes", JSON.stringify(boundaryCodes));
  }

  const response = await apiClient
    .post("/ingestion-service/template/facilityIngestion", formData, {
      ...multipartAuthConfig(accessToken),
      responseType: "blob",
    })
    .catch(resolveBlobErrorBody);

  const disposition = response.headers["content-disposition"] ?? "";
  const filename = parseFilenameFromDisposition(disposition) ?? "facility-ingestion-template.xlsx";
  downloadBlob(response.data as Blob, filename);
}

export interface ValidateFacilityDataResult {
  errorCount: number;
  file: { blob: Blob; filename: string };
}

/**
 * This endpoint always answers with an annotated workbook (unlike boundary's
 * polymorphic JSON/blob response), whether or not any rows failed;
 * `errorCount` says which.
 */
export async function validateFacilityData(
  file: File,
  accessToken: string,
  user?: AuthUser | null,
): Promise<ValidateFacilityDataResult> {
  const formData = new FormData();
  formData.append("facility_file", file);
  formData.append("request_info", JSON.stringify(createRequestInfo(accessToken, user)));

  const response = await apiClient
    .post("/ingestion-service/ingest/addFacilitiesValidateData", formData, {
      ...multipartAuthConfig(accessToken),
      responseType: "blob",
    })
    .catch(resolveBlobErrorBody);

  const errorCount = Number.parseInt(String(response.headers["x-error-count"] ?? "0"), 10);
  const disposition = String(response.headers["content-disposition"] ?? "");
  const filename = parseFilenameFromDisposition(disposition) ?? "facility-validation-result.xlsx";

  return { errorCount, file: { blob: response.data as Blob, filename } };
}

/**
 * Takes the *validated* file from `validateFacilityData` (not the original
 * upload), sending `are_facilities_onm_ready` from the bulk-add page's
 * ONM-ready toggle.
 */
export async function uploadFacilityData(
  validatedFile: { blob: Blob; filename: string },
  areFacilitiesOnmReady: boolean,
  accessToken: string,
  user?: AuthUser | null,
): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append("facility_file", validatedFile.blob, validatedFile.filename);
  formData.append("are_facilities_onm_ready", String(areFacilitiesOnmReady));
  formData.append("request_info", JSON.stringify(createRequestInfo(accessToken, user)));

  const response = await apiClient
    .post("/ingestion-service/ingest/facilities", formData, {
      ...multipartAuthConfig(accessToken),
      responseType: "blob",
    })
    .catch(resolveBlobErrorBody);

  const disposition = String(response.headers["content-disposition"] ?? "");
  const filename = parseFilenameFromDisposition(disposition) ?? "facility-upload-result.xlsx";

  return { blob: response.data as Blob, filename };
}
