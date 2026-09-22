import { apiClient } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import { tenantId as resolveStateTenantId } from "@/shared/config/global-config";
import type { AuthUser } from "@/shared/stores/auth-store";

/** Page size for the bulk facility reads. These genuinely need every row, so `fetchAllPages`
 *  below walks the pages rather than hoping one is enough. */
export const BULK_PAGE_SIZE = 500;

/** Runaway guard, not a real limit: 200 pages of {@link BULK_PAGE_SIZE} is 100k rows, far past
 *  any plausible project. It exists so a server that keeps returning full pages can't spin
 *  forever. */
const MAX_PAGES = 200;

/**
 * Reads every page of a `_search` and concatenates them.
 *
 * Termination is on a short page rather than a total count, because the two services involved
 * disagree: field-planner returns `TotalCount`, but `project/facility/v1/_search` is an upstream
 * DIGIT service whose response shape isn't guaranteed to carry one. A page smaller than the
 * requested size means the end either way.
 *
 * This replaces a bare `limit: 500` on each of these calls. That cap was a silent correctness
 * ceiling — a plan (or a table page of plans) with more than 500 sites simply lost the excess,
 * with no error and no indication anything was missing.
 */
export async function fetchAllPages<T>(
  fetchPage: (limit: number, offset: number) => Promise<T[]>,
  pageSize = BULK_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const batch = await fetchPage(pageSize, page * pageSize);
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

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
 * The DIGIT `_search` shape every PM read uses: a `RequestInfo` envelope, the criteria under a
 * service-specific body key, and the URL params above.
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
