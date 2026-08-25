import { translateOr, useAuthStore, useTranslate } from "@/shared";
import { StatTile } from "@/ui";
import { Link } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { useInstallationPlans } from "../hooks/use-installation-plans";
import { useIrOverviewSummary } from "../hooks/use-ir-overview-summary";
import { hasIrAccess } from "../utils/access";
import { irFacilityEntriesPath, irInstallationPlansPath } from "../utils/paths";

export function IrKpis() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const { isLoading, pendingReviewCount } = useIrOverviewSummary();

  if (!hasIrAccess(user?.roles)) {
    return null;
  }

  return (
    <StatTile
      icon={<ClipboardCheck className="h-6 w-6" />}
      iconClassName="bg-info text-info-foreground"
      label={translateOr(t, "ES_IR_PENDING_REVIEW", "Pending Review")}
      value={isLoading ? "-" : pendingReviewCount}
      link={irInstallationPlansPath()}
    />
  );
}

export function IrDetails() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const { data, isLoading } = useInstallationPlans();

  if (!hasIrAccess(user?.roles)) {
    return null;
  }

  const plans = data?.plans ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-950">
          {translateOr(t, "ES_IR_INSTALLATION_PLANS", "Installation Plans")}
        </h2>
        <Link
          to={irInstallationPlansPath()}
          className="text-sm font-medium text-primary hover:underline"
        >
          {translateOr(t, "ES_IR_VIEW_ALL", "View all")}
        </Link>
      </div>
      <div className="livelihood-card divide-y divide-border">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">
            {translateOr(t, "CORE_COMMON_LOADING", "Loading...")}
          </div>
        ) : plans.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            {translateOr(t, "ES_IR_NO_PLANS", "No installation plans to review")}
          </div>
        ) : (
          plans.map((plan) => (
            <Link
              key={plan.planId}
              to={irFacilityEntriesPath(plan.planId)}
              className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted"
            >
              <div>
                <p className="text-sm font-medium text-ink-950">{plan.planName}</p>
                <p className="text-xs text-ink-600">
                  {plan.totalFacilities}{" "}
                  {translateOr(t, "ES_IR_FACILITIES", "facilities")}
                </p>
              </div>
              <span className="livelihood-sla-badge">
                {plan.pendingReviewCount}{" "}
                {translateOr(t, "ES_IR_PENDING", "pending")}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
