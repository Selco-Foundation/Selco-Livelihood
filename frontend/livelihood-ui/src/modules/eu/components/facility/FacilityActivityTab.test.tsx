import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useActivityTypeOptions } from "../../hooks/use-activity-type-options";
import { useFacilityActivities } from "../../hooks/use-facility-activities";
import type { FacilityActivity } from "../../types/activity";
import { FacilityActivityTab } from "./FacilityActivityTab";

vi.mock("../../hooks/use-activity-type-options", () => ({ useActivityTypeOptions: vi.fn() }));
vi.mock("../../hooks/use-facility-activities", () => ({ useFacilityActivities: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}));

const solarActivity: FacilityActivity = {
  id: "activity-1",
  activityType: "INSTALLATION",
  componentType: "SOLAR",
  projectCode: "PROJ-1",
  fieldPlanCode: "IN-INS-1",
  activityStartDate: "01/01/2026",
  activityEndDate: "01/10/2026",
};

function mockHooks(
  activities: FacilityActivity[],
  overrides: Partial<ReturnType<typeof useFacilityActivities>> = {},
) {
  vi.mocked(useActivityTypeOptions).mockReturnValue({ activityTypes: [], isLoading: false } as never);
  vi.mocked(useFacilityActivities).mockReturnValue({
    data: { activities, total: activities.length },
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.mocked(useActivityTypeOptions).mockReset();
  vi.mocked(useFacilityActivities).mockReset();
});

describe("FacilityActivityTab", () => {
  it("shows a loading skeleton while the activities query is loading", () => {
    mockHooks([], { isLoading: true, data: undefined });

    const { container } = render(<FacilityActivityTab facilityId="facility-1" facilityBoundaryCode="B1" />);

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it("shows an error state when the activities query fails", () => {
    mockHooks([], { isError: true, error: new Error("boom"), data: undefined });

    render(<FacilityActivityTab facilityId="facility-1" facilityBoundaryCode="B1" />);

    expect(screen.getByText("Failed to load activities")).toBeInTheDocument();
  });

  it("shows an empty state when there are no activities", () => {
    mockHooks([]);

    render(<FacilityActivityTab facilityId="facility-1" facilityBoundaryCode="B1" />);

    expect(screen.getByText("No activities found")).toBeInTheDocument();
  });

  it("renders the Asset Type column header and the activity's componentType label", () => {
    mockHooks([solarActivity]);

    render(<FacilityActivityTab facilityId="facility-1" facilityBoundaryCode="B1" />);

    expect(screen.getByRole("columnheader", { name: "Asset Type" })).toBeInTheDocument();
    expect(screen.getByText("SOLAR")).toBeInTheDocument();
  });

  it("renders a dash in the Asset Type column when componentType is missing", () => {
    mockHooks([{ ...solarActivity, componentType: undefined }]);

    render(<FacilityActivityTab facilityId="facility-1" facilityBoundaryCode="B1" />);

    const row = screen.getByText("PROJ-1").closest("tr");
    expect(row).not.toBeNull();
    expect(row!.textContent).toContain("-");
  });
});
