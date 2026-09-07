import { contextPath } from "@/shared";
import { Button } from "@/ui";
import { Link } from "@tanstack/react-router";
import { PM_ROUTES } from "../constants/routes";
import type { ProjectStatusWrapper } from "../types/project";

interface ProjectsTableProps {
  data: ProjectStatusWrapper[];
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatStates(project: ProjectStatusWrapper["project"]): string {
  const states = project.additionalDetails?.geographyDetails?.states;
  if (states?.length) {
    return states.map((state) => state.code).join(", ");
  }
  return project.address?.boundary ?? "-";
}

export function ProjectsTable({ data }: ProjectsTableProps) {
  const basePath = `/${contextPath()}`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">Project Name</th>
            <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">State</th>
            <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">Start Date</th>
            <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">End Date</th>
            <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">Status</th>
            <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950" />
          </tr>
        </thead>
        <tbody>
          {data.map(({ project, status }) => {
            const isDraft = !status;
            const resumePath = `${basePath}${PM_ROUTES.createProject}`;

            return (
              <tr key={project.id} className="border-b border-border/70">
                <td className="px-5 py-4 font-medium text-foreground">
                  {project.name ?? project.projectNumber ?? "-"}
                </td>
                <td className="px-5 py-4 text-foreground">{formatStates(project)}</td>
                <td className="px-5 py-4 text-foreground">{formatDate(project.startDate)}</td>
                <td className="px-5 py-4 text-foreground">{formatDate(project.endDate)}</td>
                <td className="px-5 py-4 text-foreground">{status ?? "DRAFT"}</td>
                <td className="px-5 py-4 text-right">
                  {isDraft ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to={resumePath} search={{ projectId: project.id, step: 3 }}>
                        Resume setup
                      </Link>
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
