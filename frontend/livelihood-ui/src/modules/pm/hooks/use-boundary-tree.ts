import { useQuery } from "@tanstack/react-query";
import { fetchBoundaryTree, useAuthStore } from "@/shared";

export function useBoundaryTree() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["pm-boundary-tree"],
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
    queryFn: () => fetchBoundaryTree("State", accessToken!, user),
  });
}
