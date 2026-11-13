import { translateOr, useAuthStore, useTranslate } from "@/shared";
import { StatTile } from "@/ui";
import { FileText } from "lucide-react";
import { useAmcReportCount } from "../hooks/use-amc-report-count";
import { hasAmcReviewerAccess } from "../utils/access";
import { amcReportsPath } from "../utils/paths";

export function AmcKpis() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const { data, isLoading } = useAmcReportCount();

  if (!hasAmcReviewerAccess(user?.roles)) {
    return null;
  }

  return (
    <StatTile
      icon={<FileText className="h-6 w-6" />}
      iconClassName="bg-info text-info-foreground"
      label={translateOr(t, "ES_AMC_TOTAL_REPORTS", "Total AMC Reports")}
      value={isLoading ? "-" : String(data ?? 0)}
      link={amcReportsPath()}
    />
  );
}
