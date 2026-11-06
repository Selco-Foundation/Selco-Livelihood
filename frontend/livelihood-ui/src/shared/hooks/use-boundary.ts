import { useQuery } from "@tanstack/react-query";
import { fetchBoundaryRelations } from "../api/boundary";
import { useAuthStore } from "../stores/auth-store";

export function useBoundary(codes: string[]) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const stableCodes = codes.filter(Boolean).sort().join(",");

  return useQuery({
    queryKey: ["boundary", stableCodes],
    enabled: Boolean(accessToken) && codes.length > 0,
    queryFn: () => fetchBoundaryRelations(codes, accessToken!, user),
  });
}

/**
 * The full tenant boundary tree (every state/district/block), for cascading
 * selects that let the user pick any state rather than starting from one
 * already known (e.g. a facility-create form) — see `useBoundary` above for
 * the "children of a known code" case.
 */
export function useBoundaryHierarchy() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["boundary-hierarchy"],
    enabled: Boolean(accessToken),
    queryFn: () => fetchBoundaryRelations([], accessToken!, user),
  });
}
