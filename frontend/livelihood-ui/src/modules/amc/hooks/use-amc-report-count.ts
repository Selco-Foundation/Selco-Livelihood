import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchAmcReports } from "../services/amc-reports";
import { hasAmcReviewerAccess } from "../utils/access";
import { amcKeys } from "./query-keys";

/** Every AMC report, both tabs (reviewer-handled plus auto-approved), for the home page card. */
export function useAmcReportCount() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: amcKeys.reportCount(),
    enabled: Boolean(accessToken) && hasAmcReviewerAccess(user?.roles),
    queryFn: async () => {
      const [manual, auto] = await Promise.all([
        searchAmcReports({ tab: "pending", limit: 1 }, accessToken ?? undefined, user),
        searchAmcReports({ tab: "auto", limit: 1 }, accessToken ?? undefined, user),
      ]);
      return manual.totalCount + auto.totalCount;
    },
  });
}
