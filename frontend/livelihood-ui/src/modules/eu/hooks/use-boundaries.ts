import { tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchBoundaries, type BoundarySearchCriteria } from "../services/boundary";
import type { BoundarySearchFilters } from "../types/boundary";

export const BOUNDARIES_QUERY_KEY = "eu-boundaries";

/** The deepest selected tier narrows the search — matches `fa`'s `BoundaryTable/Filter.js` (block > district > state, whichever is populated). */
function resolveParentCodes(filters: BoundarySearchFilters): string[] | undefined {
  if (filters.block.length > 0) return filters.block;
  if (filters.district.length > 0) return filters.district;
  if (filters.state.length > 0) return filters.state;
  return undefined;
}

export function useBoundaries(filters: BoundarySearchFilters, pageSize: number, pageOffset: number) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const parentCodes = resolveParentCodes(filters);
  const criteria: BoundarySearchCriteria = {
    tenantId: tenantId(),
    hierarchyType: "SELCO",
    boundaryType: "Block",
    ...(parentCodes ? { parentCodes } : {}),
  };

  return useQuery({
    queryKey: [BOUNDARIES_QUERY_KEY, criteria, pageSize, pageOffset],
    enabled: Boolean(accessToken),
    queryFn: () => searchBoundaries(criteria, { limit: pageSize, offset: pageOffset }, accessToken!, user),
  });
}
