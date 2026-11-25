import { employeeHomePath, translateOr, useAuthStore, useTranslate } from "@/shared";
import { TopBar } from "@/ui";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AmcReportList } from "../../components/AmcReportList";
import type { AmcReportsRouteSearch } from "../../routes";
import { hasAmcReviewerAccess } from "../../utils/access";
import { amcReportsPath } from "../../utils/paths";

export function AmcReportsPage() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { tab = "pending" } = useSearch({ strict: false }) as AmcReportsRouteSearch;

  if (!hasAmcReviewerAccess(user?.roles)) return null;

  return (
    <div className="w-full space-y-6">
      <TopBar
        title={translateOr(t, "ES_AMC_REPORTS", "AMC Reports")}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "ES_AMC_REPORTS", "AMC Reports") },
        ]}
      />
      <AmcReportList
        tab={tab}
        onTabChange={(next) => void navigate({ to: amcReportsPath(), search: { tab: next }, replace: true })}
      />
    </div>
  );
}
