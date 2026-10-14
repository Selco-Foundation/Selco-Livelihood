import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActivityInfoCard } from "./activity-info-card";
import type { ActivityInfoCardFields } from "./types";

function makeActivity(overrides: Partial<ActivityInfoCardFields> = {}): ActivityInfoCardFields {
  return {
    componentType: "SOLAR",
    status: "SUBMITTED_BY_FIELD_STAFF",
    ...overrides,
  };
}

const resolveBoundaryName = vi.fn((code: string) => code);

describe("ActivityInfoCard", () => {
  it("renders a dash for district and block when neither is present", () => {
    render(<ActivityInfoCard activity={makeActivity()} resolveBoundaryName={resolveBoundaryName} />);
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
        resolveBoundaryName={resolveBoundaryName}
      />,
    );
    expect(screen.getByText("Alpha District")).toBeInTheDocument();
    expect(screen.getByText("Block One")).toBeInTheDocument();
  });

  it("falls back to resolveBoundaryName when a boundary node has no name", () => {
    render(
      <ActivityInfoCard
        activity={makeActivity({ district: { code: "D1" } })}
        resolveBoundaryName={(code) => `Resolved ${code}`}
      />,
    );
    expect(screen.getByText("Resolved D1")).toBeInTheDocument();
  });

  it("shows Machine as the type label for a MACHINE activity", () => {
    render(
      <ActivityInfoCard
        activity={makeActivity({ componentType: "MACHINE" })}
        resolveBoundaryName={resolveBoundaryName}
      />,
    );
    expect(screen.getByText("Machine")).toBeInTheDocument();
  });

  it("shows Solar as the type label for a SOLAR activity", () => {
    render(
      <ActivityInfoCard
        activity={makeActivity({ componentType: "SOLAR" })}
        resolveBoundaryName={resolveBoundaryName}
      />,
    );
    expect(screen.getByText("Solar")).toBeInTheDocument();
  });

  it("shows the translated status label for the activity's status", () => {
    render(
      <ActivityInfoCard
        activity={makeActivity({ status: "APPROVED_BY_QC_SPOC" })}
        resolveBoundaryName={resolveBoundaryName}
      />,
    );
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });
});
