import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProjectStatusWrapper } from "../types/project";
import { ProjectsTable } from "./ProjectsTable";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

function wrapper(project: Partial<ProjectStatusWrapper["project"]> = {}, status?: string): ProjectStatusWrapper {
  return { project: { tenantId: "tenant-1", id: "p1", name: "Project A", ...project }, status };
}

describe("ProjectsTable", () => {
  it("shows a skeleton while loading", () => {
    const { container } = render(<ProjectsTable projects={[]} isLoading />);

    expect(container.querySelector('[class*="animate-pulse"], [data-slot="skeleton"]')).toBeTruthy();
  });

  it("shows an empty message when there are no projects", () => {
    render(<ProjectsTable projects={[]} isLoading={false} />);

    expect(screen.getByText("No projects found")).toBeInTheDocument();
  });

  it("renders a draft project's name as plain text (not a link) with a Resume setup link", () => {
    render(<ProjectsTable projects={[wrapper()]} isLoading={false} />);

    expect(screen.getByText("Project A")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Project A" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resume setup" })).toBeInTheDocument();
  });

  it("renders a non-draft project's name as a link, without a Resume setup link", () => {
    render(<ProjectsTable projects={[wrapper({}, "SCHEDULED")]} isLoading={false} />);

    expect(screen.getByRole("link", { name: "Project A" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Resume setup" })).not.toBeInTheDocument();
  });

  it("shows the formatted status label", () => {
    render(<ProjectsTable projects={[wrapper({}, "SCHEDULED")]} isLoading={false} />);

    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });

  it("truncates a long joined state list and shows the full text in the title attribute", () => {
    render(
      <ProjectsTable
        projects={[
          wrapper({
            additionalDetails: {
              geographyDetails: {
                states: [{ code: "KA", name: "Karnataka" }, { code: "AS", name: "Assam" }, { code: "ML", name: "Meghalaya" }],
              },
            },
          }),
        ]}
        isLoading={false}
      />,
    );

    const cell = screen.getByTitle("Karnataka, Assam, Meghalaya");
    expect(cell.textContent).toMatch(/\.\.\.$/);
  });
});
