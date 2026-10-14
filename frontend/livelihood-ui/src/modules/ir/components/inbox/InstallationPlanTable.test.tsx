import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InstallationPlan } from "../../types/installation-plan";
import { irActivitiesPath } from "../../utils/paths";
import { InstallationPlanTable } from "./InstallationPlanTable";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({
    to,
    children,
    onClick,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent) => void;
  }) => (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

function makePlan(overrides: Partial<InstallationPlan> = {}): InstallationPlan {
  return {
    planId: "plan-1",
    planName: "Plan One",
    tenantId: "tenant-1",
    totalFacilities: 10,
    startDate: "2024-01-01",
    endDate: "2024-06-01",
    pendingReviewCount: 2,
    completionRate: 40,
    ...overrides,
  };
}

function renderTable(plans: InstallationPlan[], isLoading = false) {
  return render(<InstallationPlanTable plans={plans} isLoading={isLoading} />);
}

describe("InstallationPlanTable", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockNavigate.mockReturnValue(Promise.resolve());
  });

  it("renders a loading skeleton and no table when isLoading", () => {
    renderTable([], true);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders an empty state when there are no plans", () => {
    renderTable([]);
    expect(screen.getByText("No installation plans to review")).toBeInTheDocument();
  });

  it("renders one row per plan with its data", () => {
    renderTable([
      makePlan({ planId: "p1", planName: "Alpha Plan", totalFacilities: 5 }),
      makePlan({ planId: "p2", planName: "Beta Plan", totalFacilities: 8 }),
    ]);

    expect(screen.getByText("Alpha Plan")).toBeInTheDocument();
    expect(screen.getByText("Beta Plan")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("renders start/end dates, pending review count, and completion rate", () => {
    renderTable([
      makePlan({
        startDate: "2024-01-01",
        endDate: "2024-06-01",
        pendingReviewCount: 7,
        completionRate: 55,
      }),
    ]);

    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("2024-06-01")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument();
  });

  it("navigates to the plan's activities path when a row is clicked", async () => {
    const user = userEvent.setup();
    renderTable([makePlan({ planId: "nav-plan", totalFacilities: 3 })]);

    await user.click(screen.getByText("3"));

    expect(mockNavigate).toHaveBeenCalledWith({ to: irActivitiesPath("nav-plan") });
  });

  it("clicking the plan name link does not trigger row navigation", async () => {
    const user = userEvent.setup();
    renderTable([makePlan({ planId: "nav-plan", planName: "Alpha Plan" })]);

    await user.click(screen.getByText("Alpha Plan"));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
