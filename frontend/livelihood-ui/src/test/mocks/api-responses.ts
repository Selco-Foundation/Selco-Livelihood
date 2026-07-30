/** Matches the axios success shape consumers destructure via `response.data`. */
export function mockAxiosSuccess<T>(data: T) {
  return Promise.resolve({ data });
}

/**
 * Matches the exact error shape `isInvalidAccessTokenError` (shared/api/client.ts)
 * and `extractApiErrorMessage` (shared/api/errors.ts) expect:
 * `error.response.data.Errors: Array<{ message }>`.
 */
export function mockAxiosError(status: number, errors: Array<{ message: string }>) {
  return Promise.reject({
    response: {
      status,
      data: { Errors: errors },
    },
  });
}
