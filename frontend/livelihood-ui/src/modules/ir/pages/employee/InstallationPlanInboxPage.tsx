import { employeeHomePath, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Breadcrumbs, PageHeader } from "@/ui";
import { InstallationPlanTable } from "../../components/inbox/InstallationPlanTable";
import { useInstallationPlans } from "../../hooks/use-installation-plans";
import { hasIrAccess } from "../../utils/access";

export function InstallationPlanInboxPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const { data, isLoading } = useInstallationPlans();

  if (!hasIrAccess(user?.roles)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <PageHeader
          title={translateOr(t, "ES_IR_INSTALLATION_PLANS", "Installation Plans")}
          description={translateOr(
            t,
            "ES_IR_INSTALLATION_PLANS_SUBTITLE",
            "Review submitted installation sites for each plan",
          )}
        />
        <Breadcrumbs
          items={[
            { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
            { label: translateOr(t, "ES_IR_INSTALLATION_PLANS", "Installation Plans") },
          ]}
        />
      </div>
      <InstallationPlanTable plans={data?.plans ?? []} isLoading={isLoading} />
    </div>
  );
}
