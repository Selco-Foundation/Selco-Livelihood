import { fetchMdmsMasters, mapRejectionReasonOptions, tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { amcKeys } from "./query-keys";

/** The rework reasons of MDMS `AMC.RejectionReasons`, "Others" last. */
export function useAmcRejectionReasons() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: amcKeys.rejectionReasons(),
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
    queryFn: () => fetchMdmsMasters(tenantId(), "AMC", ["RejectionReasons"], accessToken!, user),
    select: mapRejectionReasonOptions,
  });
}
