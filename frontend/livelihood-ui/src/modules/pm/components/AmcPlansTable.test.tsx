import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { InstallationPlanStatusWrapper } from "../types/installation-plan";
import { AmcPlansTable } from "./AmcPlansTable";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const plan: InstallationPlanStatusWrapper = {
  plan: { id: "plan-1", tenantId: "tenant-1", projectId: "project-1", name: "IN-INS-2026-28" },
};

describe("AmcPlansTable", () => {
  it("shows the section heading and description", () => {
    render(<AmcPlansTable plans={[plan]} isLoading={false} />);

    expect(screen.getByRole("heading", { name: "Edit AMC" })).toBeInTheDocument();
    expect(screen.getByText("Select Edit on an installation plan to change its AMC schedule.")).toBeInTheDocument();
  });

  it("lists each plan with an Edit link to the Edit AMC page", () => {
    render(<AmcPlansTable plans={[plan]} isLoading={false} />);

    expect(screen.getByText("IN-INS-2026-28")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit, IN-INS-2026-28" })).toHaveAttribute(
      "href",
      expect.stringContaining("/employee/pm/project/installation-plan/amc/edit"),
    );
  });

  it("shows a skeleton while loading", () => {
    const { container } = render(<AmcPlansTable plans={[]} isLoading />);

    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy();
  });

  it("shows an empty message when there are no plans", () => {
    render(<AmcPlansTable plans={[]} isLoading={false} />);

    expect(screen.getByText("No installation plans with AMC yet")).toBeInTheDocument();
  });
});
