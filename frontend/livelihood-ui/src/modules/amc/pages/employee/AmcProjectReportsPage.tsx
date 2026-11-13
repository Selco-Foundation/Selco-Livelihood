import { employeeHomePath, translateOr, useAuthStore, useTranslate } from "@/shared";
import { TopBar } from "@/ui";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { AmcReportList } from "../../components/AmcReportList";
import { useAmcProjects } from "../../hooks/use-amc-projects";
import type { AmcReportsRouteSearch } from "../../routes";
import { hasAmcReviewerAccess } from "../../utils/access";
import { amcProjectReportsPath, amcProjectsPath } from "../../utils/paths";

export function AmcProjectReportsPage() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const { tab = "pending" } = useSearch({ strict: false }) as AmcReportsRouteSearch;
  const { data: projects = [] } = useAmcProjects();
  const projectName = projects.find((project) => project.projectId === projectId)?.projectName ?? "-";

  if (!hasAmcReviewerAccess(user?.roles)) return null;

  return (
    <div className="w-full space-y-6">
      <TopBar
        title={projectName}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "ES_AMC_PROJECTS", "AMC Projects"), to: amcProjectsPath() },
          { label: projectName },
        ]}
      />
      <AmcReportList
        projectId={projectId}
        tab={tab}
        onTabChange={(next) =>
          void navigate({ to: amcProjectReportsPath(projectId), search: { tab: next }, replace: true })
        }
      />
    </div>
  );
}
