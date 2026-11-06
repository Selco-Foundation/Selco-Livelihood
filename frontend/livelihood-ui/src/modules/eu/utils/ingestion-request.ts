import { tenantId as getTenantId } from "@/shared";

/**
 * ingestion-service's gateway reads a JSON request's auth token out of `RequestInfo.authToken` in
 * the body, but a multipart body isn't one JSON blob, so that lookup finds nothing and the gateway
 * rejects the request even though `request_info` really does carry the token. Every multipart call
 * needs the token and tenant as real headers instead — plus `tenantId` as a query param too,
 * checked separately by the gateway before the request is even forwarded — so they're found
 * regardless of body shape. Same gateway workaround `pm/utils/ingestion-request.ts` documents and
 * applies for its own multipart calls (not reused directly — `eu` can't import from `pm` across
 * the module boundary).
 */
export function multipartAuthConfig(accessToken: string) {
  const tenant = getTenantId();
  return {
    headers: { "Content-Type": undefined, "auth-token": accessToken, tenantId: tenant },
    params: { tenantId: tenant },
  };
}
