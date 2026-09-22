export function extractApiErrorMessage(error: unknown): string | undefined {
  const data = (
    error as {
      response?: {
        data?: {
          Errors?: Array<{ message?: string }>;
          error?: { message?: string; fields?: Array<{ message?: string }> };
          // FastAPI's own convention for a plain HTTPException(detail=...) — ingestion-service's
          // JSON-returning endpoints use this shape rather than the DIGIT-style Errors[]/error.*
          // ones above.
          detail?: string;
        };
      };
    }
  )?.response?.data;

  return (
    (Array.isArray(data?.Errors) ? data?.Errors[0]?.message : undefined) ??
    (Array.isArray(data?.error?.fields) ? data?.error?.fields[0]?.message : undefined) ??
    data?.error?.message ??
    data?.detail
  );
}
