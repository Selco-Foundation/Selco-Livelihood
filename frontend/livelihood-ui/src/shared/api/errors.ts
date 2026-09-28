/** One entry of FastAPI's 422 validation-error body. */
interface FastApiValidationError {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
}

interface ApiErrorBody {
  Errors?: Array<{ message?: string }>;
  error?: { message?: string; fields?: Array<{ message?: string }> };
  // FastAPI's own convention for a plain HTTPException(detail=...) — ingestion-service's
  // JSON-returning endpoints use this shape rather than the DIGIT-style Errors[]/error.* ones above.
  //
  // It is only a string for a plain HTTPException. A request-validation failure (422 — a missing
  // or malformed multipart field on an ingestion call, say) sends an *array* of
  // {loc, msg, type} instead, so this cannot be typed as `string` and returned unchecked: the
  // value ends up in `new Error(...)` as "[object Object]", or in React state that is rendered
  // directly, which throws "Objects are not valid as a React child".
  detail?: string | FastApiValidationError[];
}

/** The `detail` field as a displayable string, whichever of its two shapes it arrived in. */
function detailMessage(detail: ApiErrorBody["detail"]): string | undefined {
  if (typeof detail === "string") {
    return detail;
  }
  if (!Array.isArray(detail)) {
    return undefined;
  }
  // Only the first entry: 422 bodies list one object per offending field, and a wall of them
  // helps nobody. `loc` is prefixed when present so the message names the field it is about.
  const first = detail.find((entry) => typeof entry?.msg === "string" && entry.msg);
  if (!first?.msg) {
    return undefined;
  }
  const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : undefined;
  return field === undefined ? first.msg : `${String(field)}: ${first.msg}`;
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
    detailMessage(body?.detail)
  );
}

export function extractApiErrorMessage(error: unknown): string | undefined {
  return pickErrorMessage((error as { response?: { data?: unknown } })?.response?.data);
}
