import { employeeHomePath, translateOr, useTranslate } from "@/shared";
import { Button, TopBar } from "@/ui";
import { Link, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { InstallationPlansTable } from "../../components/InstallationPlansTable";
import { useInstallationPlansSearch } from "../../hooks/use-installation-plans-search";
import { useProjectById } from "../../hooks/use-project-by-id";
import type { ProjectDetailsRouteSearch } from "../../routes";
import { resolveStateNames } from "../../utils/geography";
import { pmCreateInstallationPlanPath, pmMyProjectsPath } from "../../utils/paths";

function formatDate(value?: number) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function ProjectDetailsPage() {
  const { t } = useTranslate();
  const search = useSearch({ strict: false }) as ProjectDetailsRouteSearch;
  const projectId = search.projectId;

  const { data: project } = useProjectById(projectId);
  const { data, isLoading } = useInstallationPlansSearch({ projectId });

  const geography = project?.additionalDetails?.geographyDetails;
  const districtCount = geography?.districts?.length ?? 0;
  const blockCount = geography?.blocks?.length ?? 0;

  return (
    <div className="w-full space-y-6">
      <TopBar
        title={project?.name ?? "-"}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "ES_PM_MY_PROJECTS", "My Projects"), to: pmMyProjectsPath() },
          { label: project?.name ?? "-" },
        ]}
      />

      <div className="livelihood-card p-6">
        <h2 className="mb-6 text-lg font-semibold text-primary">
          {translateOr(t, "ES_PM_PROJECT_DETAILS", "Project Details")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{translateOr(t, "ES_PM_STATE", "State")}</p>
              <p className="text-sm text-foreground">{resolveStateNames(geography, t).join(", ") || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {translateOr(t, "ES_PM_DISTRICTS", "District(s)")}
              </p>
              <p className="text-sm font-medium text-primary">
                {translateOr(t, "ES_PM_N_SELECTED", "{{count}} selected").replace("{{count}}", String(districtCount))}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{translateOr(t, "ES_PM_BLOCKS", "Block(s)")}</p>
              <p className="text-sm font-medium text-primary">
                {translateOr(t, "ES_PM_N_SELECTED", "{{count}} selected").replace("{{count}}", String(blockCount))}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {translateOr(t, "ES_PM_PROJECT_STATUS", "Project Status")}
              </p>
              <p className="text-sm text-foreground">{project?.additionalDetails?.status ?? "DRAFT"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {translateOr(t, "ES_PM_PROJECT_DATES", "Project Dates")}
              </p>
              <p className="text-sm text-foreground">
                {formatDate(project?.startDate)} - {formatDate(project?.endDate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">
            {translateOr(t, "ES_PM_INSTALLATION_PLANS", "Installation Plans")}
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link to={pmCreateInstallationPlanPath()} search={{ projectId }}>
              <Plus className="size-4" />
              {translateOr(t, "ES_PM_ADD_NEW", "Add New")}
            </Link>
          </Button>
        </div>
        <InstallationPlansTable plans={data?.plans ?? []} isLoading={isLoading} />
      </div>
    </div>
  );
}
