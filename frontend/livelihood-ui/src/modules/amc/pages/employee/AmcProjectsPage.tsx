import { employeeHomePath, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Skeleton, TopBar } from "@/ui";
import { useNavigate } from "@tanstack/react-router";
import { useAmcProjects } from "../../hooks/use-amc-projects";
import { hasAmcReviewerAccess } from "../../utils/access";
import { amcProjectReportsPath } from "../../utils/paths";

function joinOrDash(values: string[]) {
  return values.length ? values.join(", ") : "-";
}

/** Project-Specific view (PRD 5.5.3): one row per project, opening that project's AMC reports. */
export function AmcProjectsPage() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data: projects = [], isLoading } = useAmcProjects();

  if (!hasAmcReviewerAccess(user?.roles)) return null;

  const columns = [
    translateOr(t, "ES_AMC_PROJECT_NAME", "Project name"),
    translateOr(t, "CS_STATE", "State"),
    translateOr(t, "CS_DISTRICT", "District"),
    translateOr(t, "CS_BLOCK", "Block"),
    translateOr(t, "ES_AMC_PENDING_REVIEW", "Pending review"),
    translateOr(t, "ES_AMC_SLA_BREACHED", "SLA Breached"),
    translateOr(t, "ES_AMC_TAB_AUTO_APPROVED", "Auto-Approved"),
  ];

  return (
    <div className="w-full space-y-6">
      <TopBar
        title={translateOr(t, "ES_AMC_PROJECTS", "AMC Projects")}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "ES_AMC_PROJECTS", "AMC Projects") },
        ]}
      />

      {isLoading ? (
        <div className="livelihood-card p-6">
          <Skeleton className="h-48 w-full" />
        </div>
      ) : projects.length === 0 ? (
        <div className="livelihood-card px-6 py-12 text-center text-sm text-muted-foreground">
          {translateOr(t, "ES_AMC_NO_PROJECTS", "No projects with AMC reports yet")}
        </div>
      ) : (
        <div className="livelihood-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
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
                {projects.map((project, index) => (
                  <tr
                    key={project.projectId}
                    onClick={() => void navigate({ to: amcProjectReportsPath(project.projectId) })}
                    className={
                      "cursor-pointer border-b border-border/70 hover:bg-muted/40" + (index % 2 === 1 ? " bg-accent" : "")
                    }
                  >
                    <td className="px-5 py-4 font-semibold text-primary">{project.projectName}</td>
                    <td className="px-5 py-4 text-foreground">{joinOrDash(project.states)}</td>
                    <td className="px-5 py-4 text-foreground">{joinOrDash(project.districts)}</td>
                    <td className="px-5 py-4 text-foreground">{joinOrDash(project.blocks)}</td>
                    <td className="px-5 py-4 text-foreground">{project.pendingCount}</td>
                    <td className="px-5 py-4">
                      {project.breachedCount > 0 ? (
                        <span className="livelihood-sla-badge-urgent">{project.breachedCount}</span>
                      ) : (
                        <span className="livelihood-sla-badge-muted">0</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-foreground">{project.autoApprovedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
