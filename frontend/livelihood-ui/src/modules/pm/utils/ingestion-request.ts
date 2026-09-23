import { apiClient } from "@/shared";
import { pickErrorMessage } from "@/shared/api/errors";
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
 * via its `attachAuthHeaders` flag. So the token and tenant go out as real headers here, letting
 * the gateway find them regardless of body shape — unconditionally, because *every* multipart
 * upload in this module needs them. (`createSolutionTemplate` used to build its own FormData and
 * omit them; it now routes through here too.)
 *
 * `tenantId` also has to be a **query param**, separately from the header above — proven live:
 * `/ingestion-service/template/installationTemplate` 401s with a misleading "Failed to parse
 * request at API gateway" without `?tenantId=...` on the URL, and 200s with it, identically for
 * `/ingestion-service/template/fieldplanFacilityIngestionTemplate`. This is the gateway's own
 * tenant-scoped role-action lookup, done before the request is even forwarded — it has nothing to
 * do with ingestion-service, which never reads query params on these endpoints at all (it takes
 * `tenantId` from `RequestInfo.userInfo.tenantId` in the body). Same shape as field-planner's
 * `@ModelAttribute URLParams` endpoints needing `tenantId`/`limit`/`offset` in the query string —
 * just enforced one layer further out, at the gateway rather than the service.
 */
function resolveIngestionTenantId(user: AuthUser | null | undefined): string {
  return user?.tenantId ?? resolveTenantId(getViteEnv("VITE_STATE_LEVEL_TENANT_ID"));
}

async function postMultipart<T>(
  url: string,
  fields: Record<string, string>,
  file: File,
  fileFieldName: string,
  accessToken: string,
  user: AuthUser | null | undefined,
  responseType: "blob" | "json",
  timeoutMs: number,
) {
  const formData = new FormData();
  formData.append(fileFieldName, file, file.name);
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  formData.append("request_info", JSON.stringify(createRequestInfo(accessToken, user)));

  const tenantId = resolveIngestionTenantId(user);
  return apiClient.post<T>(url, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${accessToken}`,
      "auth-token": accessToken,
      tenantId,
    },
    params: { tenantId },
    responseType,
    timeout: timeoutMs,
  });
}

export async function postMultipartExpectingBlob(
  url: string,
  fields: Record<string, string>,
  file: File,
  fileFieldName: string,
  accessToken: string,
  user: AuthUser | null | undefined,
  timeoutMs = 60_000,
): Promise<BlobUploadResult> {
  const response = await postMultipart<Blob>(
    url,
    fields,
    file,
    fileFieldName,
    accessToken,
    user,
    "blob",
    timeoutMs,
  );

  // axios lowercases response header names regardless of what the server sent
  const errorCount = Number(response.headers["x-error-count"] ?? 0);
  return { blob: response.data, errorCount };
}

/** Same upload, same headers, for the one ingestion-service endpoint that answers with JSON
 *  rather than an annotated workbook (`createInstallationTemplate`). */
export async function postMultipartExpectingJson<T>(
  url: string,
  fields: Record<string, string>,
  file: File,
  fileFieldName: string,
  accessToken: string,
  user: AuthUser | null | undefined,
  timeoutMs = 60_000,
): Promise<T> {
  const response = await postMultipart<T>(
    url,
    fields,
    file,
    fileFieldName,
    accessToken,
    user,
    "json",
    timeoutMs,
  );
  return response.data;
}

/**
 * POSTs a JSON body to one of ingestion-service's template-download endpoints and reads back the
 * generated workbook.
 *
 * The try/catch is the point of this helper. Because `responseType` is `"blob"`, axios hands a
 * failed request's JSON error body back as a `Blob`, so the raw axios error's `.message` is only
 * ever the generic "Request failed with status code 400" — the server's actual explanation is
 * sitting unread inside the blob. Callers surface `error.message` directly, so without this every
 * template download reported that generic string no matter what really went wrong.
 */
export async function postJsonExpectingBlob(
  url: string,
  body: Record<string, unknown>,
  filename: string,
  accessToken: string | undefined,
  user: AuthUser | null | undefined,
): Promise<{ blob: Blob; filename: string }> {
  try {
    const response = await apiClient.post(
      url,
      { RequestInfo: createRequestInfo(accessToken, user), ...body },
      { params: { tenantId: resolveIngestionTenantId(user) }, responseType: "blob" },
    );
    return { blob: response.data as Blob, filename };
  } catch (error) {
    const message = await extractBlobApiErrorMessage(error);
    throw message ? new Error(message) : error;
  }
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
      // Same precedence as any other API error — only the parsing differs, so the chain itself
      // lives once in shared/api/errors.ts.
      return pickErrorMessage(JSON.parse(await data.text()));
    } catch {
      return undefined;
    }
  }

  return undefined;
}
