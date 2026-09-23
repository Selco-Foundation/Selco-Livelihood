interface ApiErrorBody {
  Errors?: Array<{ message?: string }>;
  error?: { message?: string; fields?: Array<{ message?: string }> };
  // FastAPI's own convention for a plain HTTPException(detail=...) — ingestion-service's
  // JSON-returning endpoints use this shape rather than the DIGIT-style Errors[]/error.* ones above.
  detail?: string;
}

/**
 * Picks the most specific message out of an already-parsed API error body.
 *
 * Split out from {@link extractApiErrorMessage} so callers that have to parse the body themselves
 * can share this precedence rather than restating it — notably `pm`'s blob-response extractor,
 * which reads the JSON out of a `Blob` first and previously duplicated this chain comment for
 * comment.
 */
export function pickErrorMessage(data: unknown): string | undefined {
  const body = data as ApiErrorBody | undefined;

  return (
    (Array.isArray(body?.Errors) ? body?.Errors[0]?.message : undefined) ??
    (Array.isArray(body?.error?.fields) ? body?.error?.fields[0]?.message : undefined) ??
    body?.error?.message ??
    body?.detail
  );
}

export function extractApiErrorMessage(error: unknown): string | undefined {
  return pickErrorMessage((error as { response?: { data?: unknown } })?.response?.data);
}
