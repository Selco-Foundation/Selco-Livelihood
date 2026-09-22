import { translateOr, useTranslate } from "@/shared";
import { Badge, Skeleton } from "@/ui";
import { Link } from "@tanstack/react-router";
import { useInstallationPlanFacilityCounts } from "../hooks/use-installation-plan-facility-counts";
import type { InstallationPlanStatusWrapper } from "../types/installation-plan";
import { pmCreateInstallationPlanPath } from "../utils/paths";

interface InstallationPlansTableProps {
  plans: InstallationPlanStatusWrapper[];
  isLoading: boolean;
}

function formatDate(value?: number) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Sector codes are the sector name itself (e.g. "Textile & craft") — derived from the live
// `Installation.Solution` MDMS master's `sectorName` field, no separate lookup needed. A plan may
// carry more than one, so join them for display.
function sectorNames(sectorCodes?: string[]) {
  return sectorCodes?.length ? sectorCodes.join(", ") : "-";
}

export function InstallationPlansTable({ plans, isLoading }: InstallationPlansTableProps) {
  const { t } = useTranslate();
  const planIds = plans.map(({ plan }) => plan.id).filter((id): id is string => Boolean(id));
  const { data: facilityCounts = {} } = useInstallationPlanFacilityCounts(planIds);

  const columns = [
    translateOr(t, "ES_PM_INSTALLATION_PLAN_NAME", "Installation Plan Name"),
    translateOr(t, "ES_PM_ACTIVITIES", "Activities"),
    translateOr(t, "ES_PM_SECTORS", "Sector(s)"),
    translateOr(t, "ES_PM_START_DATE", "Start Date"),
    translateOr(t, "ES_PM_END_DATE", "End Date"),
    translateOr(t, "ES_PM_NO_OF_END_USER_SITES", "No. of End user sites"),
    translateOr(t, "ES_PM_INSTALLATION_PLAN_STATUS", "Installation Plan Status"),
  ];

  if (isLoading) {
    return (
      <div className="livelihood-card p-6">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="livelihood-card px-6 py-12 text-center text-sm text-muted-foreground">
        {translateOr(t, "ES_PM_NO_INSTALLATION_PLANS", "No installation plans yet")}
      </div>
    );
  }

  return (
    <div className="livelihood-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((column) => (
                <th key={column} className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.map(({ plan, status }, index) => {
              const siteCount = (plan.id ? facilityCounts[plan.id] : undefined) ?? 0;

              return (
                <tr
                  key={plan.id}
                  className={"border-b border-border/70 hover:bg-muted/40" + (index % 2 === 1 ? " bg-accent" : "")}
                >
                  <td className="px-5 py-4">
                    <Link
                      to={pmCreateInstallationPlanPath()}
                      search={{ projectId: plan.projectId, planId: plan.id, step: 1 }}
                      className="font-semibold text-primary hover:underline"
                    >
                      {plan.name ?? "-"}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="secondary" className="bg-accent text-primary">
                      {translateOr(t, "ES_PM_INSTALLATION", "Installation")}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-foreground">{sectorNames(plan.additionalDetails?.sectorCodes)}</td>
                  <td className="px-5 py-4 text-foreground">{formatDate(plan.startDate)}</td>
                  <td className="px-5 py-4 text-foreground">{formatDate(plan.endDate)}</td>
                  <td className="px-5 py-4 text-foreground">{siteCount}</td>
                  <td className="px-5 py-4 text-foreground">{status ?? "DRAFT"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
