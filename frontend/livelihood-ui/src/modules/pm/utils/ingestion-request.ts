import { apiClient } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import { tenantId as resolveTenantId } from "@/shared/config/global-config";
import { getViteEnv } from "@/shared/env";
import type { AuthUser } from "@/shared/stores/auth-store";

export interface BlobUploadResult {
  blob: Blob;
  errorCount: number;
}

/**
 * POSTs a multipart form to one of ingestion-service's validate/create endpoints and reads back
 * the annotated workbook plus the error count header. Every one of these endpoints wants
 * `request_info` as a JSON *string* form field, not nested JSON — appended here so callers can't
 * forget it.
 *
 * The gateway reads a JSON request's auth token out of `RequestInfo.authToken` in the body, but a
 * multipart body isn't one JSON blob, so that lookup finds nothing there and the gateway rejects
 * the request with "Auth Token not found" even though `request_info` really does carry the token.
 * Every ingestion-service backend client that calls through the gateway (`filestore_client.py`,
 * `localization_service_client.py`) authenticates with an `auth-token` header instead, and the
 * legacy `installation-ui` app's `CustomRequest` did the same for these exact multipart endpoints
 * via its `attachAuthHeaders` flag — so `includeAuthHeaders` (on by default here, since every
 * caller of this helper is one of those multipart endpoints) mirrors that: it sends the token and
 * tenant as real headers so the gateway can find them regardless of body shape.
 */
export async function postMultipartExpectingBlob(
  url: string,
  fields: Record<string, string>,
  file: File,
  fileFieldName: string,
  accessToken: string,
  user: AuthUser | null | undefined,
  timeoutMs = 60_000,
  includeAuthHeaders = true,
): Promise<BlobUploadResult> {
  const formData = new FormData();
  formData.append(fileFieldName, file, file.name);
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  formData.append("request_info", JSON.stringify(createRequestInfo(accessToken, user)));

  const headers: Record<string, string> = {
    "Content-Type": "multipart/form-data",
    Authorization: `Bearer ${accessToken}`,
  };
  if (includeAuthHeaders) {
    headers["auth-token"] = accessToken;
    headers["tenantId"] = resolveTenantId(getViteEnv("VITE_STATE_LEVEL_TENANT_ID"));
  }

  const response = await apiClient.post(url, formData, {
    headers,
    responseType: "blob",
    timeout: timeoutMs,
  });

  // axios lowercases response header names regardless of what the server sent
  const errorCount = Number(response.headers["x-error-count"] ?? 0);
  return { blob: response.data as Blob, errorCount };
}

/**
 * Extracts a user-facing error message from a failed request whose `responseType` was `"blob"`.
 * axios still hands back a Blob in `error.response.data` for a non-2xx JSON error body, so the
 * normal `extractApiErrorMessage` (which expects `response.data` to already be parsed JSON) can't
 * read it directly — this reads the blob as text and parses it first.
 */
export async function extractBlobApiErrorMessage(error: unknown): Promise<string | undefined> {
  const response = (error as { response?: { data?: unknown } })?.response;
  const data = response?.data;

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text) as {
        Errors?: Array<{ message?: string }>;
        error?: { message?: string; fields?: Array<{ message?: string }> };
        // FastAPI's own convention for a plain HTTPException(detail=...) — ingestion-service's
        // "wrong Solution uploaded" check and similar hard validation failures use this shape
        // rather than the DIGIT-style Errors[]/error.* ones above, so it was silently falling
        // through to a generic message instead of this genuinely useful one.
        detail?: string;
      };
      return (
        (Array.isArray(parsed.Errors) ? parsed.Errors[0]?.message : undefined) ??
        (Array.isArray(parsed.error?.fields) ? parsed.error?.fields[0]?.message : undefined) ??
        parsed.error?.message ??
        parsed.detail
      );
    } catch {
      return undefined;
    }
  }

  return undefined;
}
