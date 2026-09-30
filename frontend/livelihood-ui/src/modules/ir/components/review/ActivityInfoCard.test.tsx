import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReviewActivity } from "../../types/activity-review";
import { ActivityInfoCard } from "./ActivityInfoCard";

function makeActivity(overrides: Partial<ReviewActivity> = {}): ReviewActivity {
  return {
    activityId: "activity-1",
    facilityId: "facility-1",
    facilityName: "Facility One",
    componentType: "SOLAR",
    planId: "plan-1",
    status: "SUBMITTED_BY_FIELD_STAFF",
    ...overrides,
  };
}

describe("ActivityInfoCard", () => {
  it("renders a dash for district and block when neither is present", () => {
    render(<ActivityInfoCard activity={makeActivity()} />);
    const dashes = screen.getAllByText("-");
    expect(dashes).toHaveLength(2);
  });

  it("renders the district and block names when present", () => {
    render(
      <ActivityInfoCard
        activity={makeActivity({
          district: { code: "D1", name: "Alpha District" },
          block: { code: "B1", name: "Block One" },
        })}
      />,
    );
    expect(screen.getByText("Alpha District")).toBeInTheDocument();
    expect(screen.getByText("Block One")).toBeInTheDocument();
  });

  it("falls back to the boundary code when a boundary node has no name", () => {
    render(<ActivityInfoCard activity={makeActivity({ district: { code: "D1" } })} />);
    expect(screen.getByText("D1")).toBeInTheDocument();
  });

  it("shows Machine as the type label for a MACHINE activity", () => {
    render(<ActivityInfoCard activity={makeActivity({ componentType: "MACHINE" })} />);
    expect(screen.getByText("Machine")).toBeInTheDocument();
  });

  it("shows Solar as the type label for a SOLAR activity", () => {
    render(<ActivityInfoCard activity={makeActivity({ componentType: "SOLAR" })} />);
    expect(screen.getByText("Solar")).toBeInTheDocument();
  });

  it("shows the translated status label for the activity's status", () => {
    render(<ActivityInfoCard activity={makeActivity({ status: "APPROVED_BY_QC_SPOC" })} />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });
});
