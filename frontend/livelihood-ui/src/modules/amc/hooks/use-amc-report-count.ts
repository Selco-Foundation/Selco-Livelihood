import { tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchAmcVisits } from "../services/amc-visits";
import { hasAmcReviewerAccess } from "../utils/access";
import { amcKeys } from "./query-keys";

/** Every submitted AMC report on both tabs (waiting, sent for rework, approved), for the home card. */
export function useAmcReportCount() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: amcKeys.reportCount(),
    enabled: Boolean(accessToken) && hasAmcReviewerAccess(user?.roles),
    queryFn: () =>
      searchAmcVisits(
        { tenantId: tenantId(), statuses: ["PENDING_APPROVAL", "REJECTED", "APPROVED"], isCountQuery: true },
        { limit: 1, offset: 0 },
        accessToken!,
        user,
      ),
    select: (response) => response.TotalCount ?? 0,
  });
}
