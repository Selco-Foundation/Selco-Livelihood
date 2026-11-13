import { useAuthStore } from "@/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchAmcReports } from "../services/amc-reports";
import type { AmcReportSearchCriteria, AmcReportTab } from "../types/amc-report";
import { hasAmcReviewerAccess } from "../utils/access";
import { amcKeys } from "./query-keys";

export function useAmcReports(criteria: AmcReportSearchCriteria) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: amcKeys.reportList(criteria),
    enabled: Boolean(accessToken) && hasAmcReviewerAccess(user?.roles),
    placeholderData: keepPreviousData,
    queryFn: () => searchAmcReports(criteria, accessToken ?? undefined, user),
  });
}

/** Every report on the tab (unfiltered), used to build the filter option lists. */
export function useAmcReportFilterSource(tab: AmcReportTab, projectId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: amcKeys.reportFilterSource(tab, projectId),
    enabled: Boolean(accessToken) && hasAmcReviewerAccess(user?.roles),
    queryFn: async () => (await searchAmcReports({ tab, projectId }, accessToken ?? undefined, user)).AmcReports,
  });
}
