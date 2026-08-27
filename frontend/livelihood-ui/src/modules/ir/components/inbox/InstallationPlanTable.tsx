import { translateOr, useTranslate } from "@/shared";
import { Skeleton } from "@/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import type { InstallationPlan } from "../../types/installation-plan";
import { irFacilityEntriesPath } from "../../utils/paths";

interface InstallationPlanTableProps {
  plans: InstallationPlan[];
  isLoading: boolean;
}

export function InstallationPlanTable({ plans, isLoading }: InstallationPlanTableProps) {
  const { t } = useTranslate();
  const navigate = useNavigate();

  const columns = [
    { key: "plan", label: translateOr(t, "ES_IR_INSTALLATION_PLAN", "Installation Plan") },
    { key: "activityType", label: translateOr(t, "ES_IR_ACTIVITY_TYPE", "Activity Type") },
    { key: "endUserSite", label: translateOr(t, "ES_IR_END_USER_SITE", "End User Site") },
    { key: "startDate", label: translateOr(t, "ES_IR_START_DATE", "Start Date") },
    { key: "endDate", label: translateOr(t, "ES_IR_END_DATE", "End Date") },
    { key: "pending", label: translateOr(t, "ES_IR_PENDING_REVIEW", "Pending Review") },
    { key: "completion", label: translateOr(t, "ES_IR_COMPLETION", "Completion") },
  ] as const;

  if (isLoading) {
    return (
      <div className="livelihood-card p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
        {translateOr(t, "ES_IR_NO_PLANS", "No installation plans to review")}
      </div>
    );
  }

  return (
    <div className="livelihood-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-5 py-3 text-left text-sm font-semibold text-ink-950"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.map((plan, index) => {
              const entriesPath = irFacilityEntriesPath(plan.planId);

              return (
                <tr
                  key={plan.planId}
                  className={
                    "cursor-pointer border-b border-border/70 hover:bg-muted/40" +
                    (index % 2 === 1 ? " bg-accent" : "")
                  }
                  onClick={() => {
                    navigate({ to: entriesPath }).catch(() => {});
                  }}
                >
                  <td className="px-5 py-4">
                    <Link
                      to={entriesPath}
                      className="font-semibold text-foreground hover:text-primary hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {plan.planName}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-foreground">{plan.activityType}</td>
                  <td className="px-5 py-4 text-foreground">{plan.totalFacilities}</td>
                  <td className="px-5 py-4 text-foreground">{plan.startDate}</td>
                  <td className="px-5 py-4 text-foreground">{plan.endDate}</td>
                  <td className="px-5 py-4">
                    <span className="livelihood-sla-badge">{plan.pendingReviewCount}</span>
                  </td>
                  <td className="px-5 py-4 text-foreground">{plan.completionRate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
