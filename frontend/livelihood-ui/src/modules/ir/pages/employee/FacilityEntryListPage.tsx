import { employeeHomePath, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Breadcrumbs, Button, PageHeader } from "@/ui";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { FacilityEntryTable } from "../../components/facility/FacilityEntryTable";
import { useBulkApproveFacilityEntries, useFacilityEntries } from "../../hooks/use-facility-entries";
import { useInstallationPlans } from "../../hooks/use-installation-plans";
import { hasIrAccess } from "../../utils/access";
import { irInstallationPlansPath } from "../../utils/paths";

// The entries route's path is computed at runtime via contextPath(), so there's no
// static `Route` export for typed params — read the plan id from the URL segments
// directly instead, same convention as ComplaintDetailsPage.
function useFacilityEntriesRouteParams() {
  return useMemo(() => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const index = segments.indexOf("entries");
    return { planId: index >= 0 ? (segments[index + 1] ?? "") : "" };
  }, []);
}

export function FacilityEntryListPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const { planId } = useFacilityEntriesRouteParams();
  const { data: entries, isLoading } = useFacilityEntries(planId);
  const bulkApprove = useBulkApproveFacilityEntries(planId);
  const { data: plansData } = useInstallationPlans();
  const planName = plansData?.plans.find((plan) => plan.planId === planId)?.planName ?? planId;

  if (!hasIrAccess(user?.roles)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <PageHeader
          title={translateOr(t, "ES_IR_REVIEW_SITES", "Review Sites")}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to={irInstallationPlansPath()}>
                {translateOr(t, "ES_IR_BACK_TO_PLANS", "Back to Installation Plans")}
              </Link>
            </Button>
          }
        />
        <Breadcrumbs
          items={[
            { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
            {
              label: translateOr(t, "ES_IR_INSTALLATION_PLANS", "Installation Plans"),
              to: irInstallationPlansPath(),
            },
            { label: planName },
          ]}
        />
      </div>
      <FacilityEntryTable
        planId={planId}
        entries={entries ?? []}
        isLoading={isLoading}
        onBulkApprove={(entryIds) => bulkApprove.mutate(entryIds)}
        isBulkApproving={bulkApprove.isPending}
      />
    </div>
  );
}
