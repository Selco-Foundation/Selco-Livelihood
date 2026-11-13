import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { getAmcReport } from "../services/amc-reports";
import { hasAmcReviewerAccess } from "../utils/access";
import { amcKeys } from "./query-keys";

export function useAmcReport(reportId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: amcKeys.report(reportId),
    enabled: Boolean(reportId && accessToken) && hasAmcReviewerAccess(user?.roles),
    queryFn: async () => (await getAmcReport(reportId!, accessToken ?? undefined, user)).AmcReports[0] ?? null,
  });
}
