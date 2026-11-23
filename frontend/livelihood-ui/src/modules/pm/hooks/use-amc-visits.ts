import { tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchAmcVisits } from "../services/amc-visit";
import { toAmcVisitRows } from "../utils/amc-visits";
import { pmKeys } from "./query-keys";

const PAGE_LIMIT = 200;

/** The visits of one AMC, fetched when its visit list is opened. */
export function useAmcVisits(amcId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pmKeys.amcVisits(amcId),
    enabled: Boolean(amcId && accessToken),
    queryFn: () =>
      searchAmcVisits({ tenantId: tenantId(), amcConfigurationIds: [amcId!] }, { limit: PAGE_LIMIT }, accessToken!, user),
    select: (response) => toAmcVisitRows(response.ScheduledVisits ?? [], new Date()),
  });
}
