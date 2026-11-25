import { tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchAmcVisits } from "../services/amc-visit";
import { toAmcVisitRows } from "../utils/amc-visits";
import { pmKeys } from "./query-keys";

const PAGE_LIMIT = 200;

/**
 * The visits of one AMC, fetched afresh each time its visit list is opened: an AMC edit, a field
 * staff change or a submitted report changes them, so a cached list must never be shown.
 */
export function useAmcVisits(amcId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pmKeys.amcVisits(amcId),
    enabled: Boolean(amcId && accessToken),
    staleTime: 0,
    gcTime: 0,
    queryFn: () =>
      searchAmcVisits({ tenantId: tenantId(), amcConfigurationIds: [amcId!] }, { limit: PAGE_LIMIT }, accessToken!, user),
    select: (response) => toAmcVisitRows(response.ScheduledVisits ?? [], new Date()),
  });
}
