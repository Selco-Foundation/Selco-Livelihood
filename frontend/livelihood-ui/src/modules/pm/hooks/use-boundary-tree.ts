import { useQuery } from "@tanstack/react-query";
import { MOCK_BOUNDARY_HIERARCHY, type BoundaryHierarchy } from "../constants/boundary-data";

/**
 * Stand-in for a real boundary-service call (see
 * `src/shared/api/boundary.ts`'s `fetchBoundaryRelations` for the pattern a
 * real implementation would follow). Swap the `queryFn` body for the real
 * fetch once that endpoint is wired up for this module — the returned shape
 * already matches what callers expect.
 */
export function useBoundaryTree() {
  return useQuery<BoundaryHierarchy>({
    queryKey: ["pm-boundary-tree"],
    queryFn: async () => MOCK_BOUNDARY_HIERARCHY,
    staleTime: Infinity,
  });
}
