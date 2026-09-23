import { fetchMdmsMasters, tenantId as getTenantId, useAuthStore, type AuthUser } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { mapRejectionReasonOptions } from "../utils/rejection-reason-mapping";

const REJECTION_REASONS_MODULE = "Installation";
const REJECTION_REASONS_MASTER = "RejectionReasons";

export function rejectionReasonOptionsQueryKey(tenantId: string) {
  return ["ir-rejection-reason-options", tenantId];
}

/** Shared by useFacilityReview (via queryClient.fetchQuery, same key) so the
 * master is only actually fetched once and cached across every review page
 * visit, not re-fetched per entry — same pattern as the installation-image
 * checklist criteria. */
export function fetchRejectionReasonOptionsQuery(
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
) {
  return async () => {
    const masters = await fetchMdmsMasters(
      tenantId,
      REJECTION_REASONS_MODULE,
      [REJECTION_REASONS_MASTER],
      accessToken,
      user,
    );
    return mapRejectionReasonOptions(masters);
  };
}

export function useRejectionReasonOptions() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const tenantId = employeeTenantId || getTenantId();

  return useQuery({
    queryKey: rejectionReasonOptionsQueryKey(tenantId),
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
    queryFn: fetchRejectionReasonOptionsQuery(tenantId, accessToken!, user),
  });
}
