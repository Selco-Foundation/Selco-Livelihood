import { translateOr, useTranslate } from "@/shared";
import { Button, Skeleton } from "@/ui";
import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import type { InstallationPlanStatusWrapper } from "../types/installation-plan";
import { pmEditAmcPath } from "../utils/paths";

interface AmcPlansTableProps {
  plans: InstallationPlanStatusWrapper[];
  isLoading: boolean;
}

/**
 * The "Edit AMC" section of the project page. Prototype: lists every plan of the project; once the
 * AMC API exists it should list only plans that have AMC configured.
 */
export function AmcPlansTable({ plans, isLoading }: Readonly<AmcPlansTableProps>) {
  const { t } = useTranslate();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">{translateOr(t, "ES_PM_EDIT_AMC", "Edit AMC")}</h2>
        <p className="text-sm text-muted-foreground">
          {translateOr(t, "ES_PM_EDIT_AMC_SECTION_DESC", "Select Edit on an installation plan to change its AMC schedule.")}
        </p>
      </div>

      {isLoading ? (
        <div className="livelihood-card p-6">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : plans.length === 0 ? (
        <div className="livelihood-card px-6 py-12 text-center text-sm text-muted-foreground">
          {translateOr(t, "ES_PM_NO_AMC_PLANS", "No installation plans with AMC yet")}
        </div>
      ) : (
        <div className="livelihood-card overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                  {translateOr(t, "ES_PM_INSTALLATION_PLAN_NAME", "Installation Plan Name")}
                </th>
                <th className="px-5 py-3 text-right text-sm font-semibold text-ink-950">
                  {translateOr(t, "ES_PM_ACTION", "Action")}
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map(({ plan }) => (
                <tr key={plan.id} className="border-b border-border/70 last:border-b-0 hover:bg-muted/40">
                  <td className="px-5 py-4 font-semibold text-primary">{plan.name ?? "-"}</td>
                  <td className="px-5 py-4 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to={pmEditAmcPath()}
                        search={{ projectId: plan.projectId, planId: plan.id }}
                        aria-label={`${translateOr(t, "CORE_COMMON_EDIT", "Edit")}, ${plan.name ?? ""}`}
                      >
                        <Pencil className="size-4" />
                        {translateOr(t, "CORE_COMMON_EDIT", "Edit")}
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
