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
