import { employeeHomePath, translateOr, useAuthStore, useTranslate } from "@/shared";
import { TopBar } from "@/ui";
import { useState } from "react";
import { InstallationPlanSearch } from "../../components/inbox/InstallationPlanSearch";
import { InstallationPlanTable } from "../../components/inbox/InstallationPlanTable";
import { useInstallationPlans } from "../../hooks/use-installation-plans";
import { hasIrAccess } from "../../utils/access";

export function InstallationPlanInboxPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useInstallationPlans(searchText);

  if (!hasIrAccess(user?.roles)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <TopBar
        title={translateOr(t, "ES_IR_INSTALLATION_PLANS", "Installation Plans")}
        description={translateOr(
          t,
          "ES_IR_INSTALLATION_PLANS_SUBTITLE",
          "Review submitted installation sites for each plan",
        )}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "ES_IR_INSTALLATION_PLANS", "Installation Plans") },
        ]}
      />
      <InstallationPlanSearch
        initialSearchText={searchText}
        onSearch={setSearchText}
      />
      <InstallationPlanTable plans={data?.plans ?? []} isLoading={isLoading} />
    </div>
  );
}
