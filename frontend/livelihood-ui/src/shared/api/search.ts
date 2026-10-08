import { apiClient } from "./client";
import { createRequestInfo } from "./request-info";
import { tenantId as resolveStateTenantId } from "../config/global-config";
import type { AuthUser } from "../stores/auth-store";

/**
 * The `tenantId`/`limit`/`offset` query params that field-planner's `@ModelAttribute URLParams`
 * endpoints bind. All three are `@NotNull` there, and a `_search` that omits any of them fails
 * with `NotNull.URLParams.*` — proven live against the dev cluster.
 *
 * That is why tenant falls back to the state-level tenant here rather than being read straight
 * off the user. Passing `user?.tenantId` alone means axios drops the param entirely whenever the
 * logged-in user record has no tenant, turning a missing field into that same 400.
 */
export function searchUrlParams(
  user: AuthUser | null | undefined,
  { limit, offset = 0 }: { limit: number; offset?: number },
) {
  return {
    tenantId: user?.tenantId ?? resolveStateTenantId(),
    limit,
    offset,
  };
}

interface PostSearchOptions {
  accessToken?: string;
  user?: AuthUser | null;
  limit?: number;
  offset?: number;
  /** Merged into the query string alongside tenantId/limit/offset. */
  extraParams?: Record<string, unknown>;
}

/**
 * The DIGIT `_search` shape every PM read (and now `eu`'s vendor-registry reads) uses: a
 * `RequestInfo` envelope, the criteria under a service-specific body key, and the URL params
 * above.
 *
 * Nine calls spelled this out by hand, which is how some of them ended up passing query params and
 * others not — a difference that shows up only as a 400 (or, worse, a silently short page) at
 * runtime. Going through here makes that impossible to get wrong by accident.
 */
export async function postSearch<TResponse>(
  url: string,
  bodyKey: string,
  criteria: unknown,
  { accessToken, user, limit = 10, offset = 0, extraParams }: PostSearchOptions,
): Promise<TResponse> {
  const { data } = await apiClient.post<TResponse>(
    url,
    { RequestInfo: createRequestInfo(accessToken, user), [bodyKey]: criteria },
    { params: { ...searchUrlParams(user, { limit, offset }), ...extraParams } },
  );
  return data;
}
