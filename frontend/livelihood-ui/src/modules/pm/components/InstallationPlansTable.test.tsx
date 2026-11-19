import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInstallationPlanFacilityCounts } from "../hooks/use-installation-plan-facility-counts";
import type { InstallationPlanStatusWrapper } from "../types/installation-plan";
import { InstallationPlansTable } from "./InstallationPlansTable";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../hooks/use-installation-plan-facility-counts", () => ({
  useInstallationPlanFacilityCounts: vi.fn(),
}));

function wrapper(overrides: Partial<InstallationPlanStatusWrapper["plan"]> = {}, status?: string): InstallationPlanStatusWrapper {
  return {
    plan: { id: "plan-1", tenantId: "tenant-1", projectId: "project-1", name: "Plan A", ...overrides },
    status,
  };
}

describe("InstallationPlansTable", () => {
  beforeEach(() => {
    vi.mocked(useInstallationPlanFacilityCounts).mockReturnValue({ data: {} } as never);
  });

  it("shows a skeleton while loading", () => {
    const { container } = render(<InstallationPlansTable plans={[]} isLoading />);

    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy();
  });

  it("shows an empty message when there are no plans", () => {
    render(<InstallationPlansTable plans={[]} isLoading={false} />);

    expect(screen.getByText("No installation plans yet")).toBeInTheDocument();
  });

  it("links the plan name to the create-installation-plan path", () => {
    render(<InstallationPlansTable plans={[wrapper()]} isLoading={false} />);

    expect(screen.getByRole("link", { name: "Plan A" })).toBeInTheDocument();
  });

  it("joins multiple sector codes for display", () => {
    render(
      <InstallationPlansTable
        plans={[wrapper({ additionalDetails: { sectorCodes: ["Solar", "Machine"] } })]}
        isLoading={false}
      />,
    );

    expect(screen.getByText("Solar, Machine")).toBeInTheDocument();
  });

  it("shows '-' when there are no sectors", () => {
    render(<InstallationPlansTable plans={[wrapper()]} isLoading={false} />);

    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("shows the site count from useInstallationPlanFacilityCounts, defaulting to 0", () => {
    vi.mocked(useInstallationPlanFacilityCounts).mockReturnValue({ data: { "plan-1": 12 } } as never);

    render(<InstallationPlansTable plans={[wrapper(), wrapper({ id: "plan-2" })]} isLoading={false} />);

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows the formatted status label", () => {
    render(<InstallationPlansTable plans={[wrapper({}, "PUBLISHED")]} isLoading={false} />);

    expect(screen.getByText("Published")).toBeInTheDocument();
  });
});
