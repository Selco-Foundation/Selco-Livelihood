import { apiClient, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";

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
  const response = await apiClient.post(
    "/ingestion-service/template/boundaryIngestionTemplate",
    { RequestInfo: createRequestInfo(accessToken, user) },
    { responseType: "blob" },
  );

  const disposition = response.headers["content-disposition"] ?? "";
  const filename = parseFilenameFromDisposition(disposition) ?? "boundary-ingestion-template.xlsx";
  downloadBlob(response.data as Blob, filename);
}

export interface IngestUploadResult {
  /** `true` when the backend accepted the file and ingested it. */
  success: boolean;
  /** Present when the backend rejected rows in the file — `errorFile` is the annotated workbook to download and fix. */
  errorCount?: number;
  errorFile?: { blob: Blob; filename: string };
}

const DEFAULT_BOUNDARY_SHEET_NAME = "Boundary Data";

/**
 * Ports `fa`'s `IngestionService.uploadBoundaryDataAndGetDisplayFile` — the
 * response is polymorphic: a JSON ack on full success, or an annotated
 * spreadsheet (with an `x-error-count` header) when some rows failed
 * validation. Content-type decides which one came back, rather than sniffing
 * bytes like the legacy code did — more reliable against a real backend.
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

  const response = await apiClient.post("/ingestion-service/ingest/boundaries", formData, {
    headers: { "Content-Type": undefined },
    responseType: "blob",
  });

  const contentType = String(response.headers["content-type"] ?? "");
  const errorCount = Number.parseInt(String(response.headers["x-error-count"] ?? "0"), 10);
  const blob = response.data as Blob;

  if (contentType.includes("application/json")) {
    return { success: errorCount === 0 };
  }

  const disposition = String(response.headers["content-disposition"] ?? "");
  const filename = parseFilenameFromDisposition(disposition) ?? "boundary-upload-result.xlsx";

  if (errorCount > 0) {
    return { success: false, errorCount, errorFile: { blob, filename } };
  }

  return { success: true };
}
