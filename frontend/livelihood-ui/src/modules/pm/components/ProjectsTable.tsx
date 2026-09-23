import { translateOr, useTranslate } from "@/shared";
import { Skeleton } from "@/ui";
import { Link } from "@tanstack/react-router";
import type { ProjectStatusWrapper } from "../types/project";
import { formatDate } from "../utils/format-date";
import { resolveStateNames } from "../utils/geography";
import { pmCreateProjectPath, pmProjectDetailsPath } from "../utils/paths";

interface ProjectsTableProps {
  projects: ProjectStatusWrapper[];
  isLoading: boolean;
}

const STATE_SUMMARY_MAX_CHARS = 20;

export function ProjectsTable({ projects, isLoading }: ProjectsTableProps) {
  const { t } = useTranslate();

  const columns = [
    { key: "name", label: translateOr(t, "ES_PM_PROJECT_CODE", "Project Code") },
    { key: "state", label: translateOr(t, "ES_PM_STATE", "State") },
    { key: "startDate", label: translateOr(t, "ES_PM_START_DATE", "Start Date") },
    { key: "endDate", label: translateOr(t, "ES_PM_END_DATE", "End Date") },
    { key: "status", label: translateOr(t, "ES_PM_STATUS", "Status") },
    { key: "actions", label: "" },
  ] as const;

  if (isLoading) {
    return (
      <div className="livelihood-card p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
        {translateOr(t, "ES_PM_NO_PROJECTS", "No projects found")}
      </div>
    );
  }

  return (
    <div className="livelihood-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((column) => (
                <th key={column.key} className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map(({ project, status }, index) => {
              const isDraft = !status || status === "DRAFT";
              // Anything past DRAFT has a real project record to open — the workflow's actual
              // states beyond "SCHEDULED" (e.g. ASSIGNED_TO_FIELD_STAFF, SUBMITTED_BY_FIELD_STAFF)
              // should all stay navigable too, so this isn't pinned to one exact status string.
              const isNavigable = !isDraft;
              const stateNames = resolveStateNames(project.additionalDetails?.geographyDetails, t);
              const fullStateText = stateNames.join(", ");
              const stateSummary =
                fullStateText.length > STATE_SUMMARY_MAX_CHARS
                  ? `${fullStateText.slice(0, STATE_SUMMARY_MAX_CHARS)}...`
                  : fullStateText || project.address?.boundary || "-";

              return (
                <tr
                  key={project.id}
                  className={"border-b border-border/70 hover:bg-muted/40" + (index % 2 === 1 ? " bg-accent" : "")}
                >
                  <td className="px-5 py-4 font-semibold text-foreground">
                    {isNavigable && project.id ? (
                      <Link
                        to={pmProjectDetailsPath()}
                        search={{ projectId: project.id }}
                        className="hover:text-primary hover:underline"
                      >
                        {project.name ?? "-"}
                      </Link>
                    ) : (
                      (project.name ?? "-")
                    )}
                  </td>
                  <td className="px-5 py-4 text-foreground" title={fullStateText || project.address?.boundary}>
                    {stateSummary}
                  </td>
                  <td className="px-5 py-4 text-foreground">{formatDate(project.startDate)}</td>
                  <td className="px-5 py-4 text-foreground">{formatDate(project.endDate)}</td>
                  <td className="px-5 py-4">
                    <span className="livelihood-sla-badge">{status ?? "DRAFT"}</span>
                  </td>
                  <td className="px-5 py-4">
                    {isDraft && project.id ? (
                      <Link
                        to={pmCreateProjectPath()}
                        search={{ projectId: project.id, step: 3 }}
                        className="font-semibold text-primary hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {translateOr(t, "ES_PM_RESUME_SETUP", "Resume setup")}
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
