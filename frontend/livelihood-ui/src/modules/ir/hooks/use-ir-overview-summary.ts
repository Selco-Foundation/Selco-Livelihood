import { useInstallationPlans } from "./use-installation-plans";

export function useIrOverviewSummary() {
  const { data, isLoading } = useInstallationPlans();

  return {
    isLoading,
    totalPlans: data?.totalCount ?? 0,
    pendingReviewCount: data?.pendingReviewCount ?? 0,
  };
}
