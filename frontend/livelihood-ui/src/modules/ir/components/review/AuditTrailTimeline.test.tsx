import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ActivityAuditCheckpoint } from "../../types/activity-review";
import { AuditTrailTimeline } from "./AuditTrailTimeline";

const checkpoints: ActivityAuditCheckpoint[] = [
  {
    id: "c1",
    status: "ASSIGNED_TO_FIELD_STAFF",
    date: "2026-01-01",
    actorName: "Field Officer",
  },
  {
    id: "c2",
    status: "SUBMITTED_BY_FIELD_STAFF",
    date: "2026-01-05",
    actorName: "Field Officer",
    comment: "Submitted for review",
  },
  {
    id: "c3",
    status: "REJECTED_BY_QC_SPOC",
    date: "2026-01-06",
    actorName: "QC Reviewer",
    comment: "Needs rework",
    sectionReasons: [
      {
        sectionId: "PANEL",
        sectionLabel: "Panel",
        reasons: [{ reasonLabel: "Damaged", comment: "Cracked panel" }],
      },
      {
        sectionId: "BATTERY",
        sectionLabel: "Battery",
        reasons: [
          { reasonLabel: "Missing part", comment: "" },
          { reasonLabel: "Other", comment: "See attached" },
        ],
      },
    ],
  },
];

describe("AuditTrailTimeline", () => {
  it("renders nothing when there are no checkpoints", () => {
    const { container } = render(<AuditTrailTimeline checkpoints={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one entry per checkpoint, in the given order, with its status label and actor", () => {
    render(<AuditTrailTimeline checkpoints={checkpoints} />);
    expect(screen.getByText("Assigned")).toBeInTheDocument();
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getAllByText(/— Field Officer/)).toHaveLength(2);
    expect(screen.getByText(/— QC Reviewer/)).toBeInTheDocument();

    const statusTexts = screen.getAllByText(/Assigned|Pending Review|Rejected/).map((el) => el.textContent);
    expect(statusTexts[0]).toContain("Assigned");
    expect(statusTexts[1]).toContain("Pending Review");
    expect(statusTexts[2]).toContain("Rejected");
  });

  it("renders each checkpoint's own comment when present", () => {
    render(<AuditTrailTimeline checkpoints={checkpoints} />);
    expect(screen.getByText("Submitted for review")).toBeInTheDocument();
    expect(screen.getByText("Needs rework")).toBeInTheDocument();
  });

  it("renders per-section rejection reasons, with the comment appended when present", () => {
    render(<AuditTrailTimeline checkpoints={checkpoints} />);
    expect(screen.getByText("Panel")).toBeInTheDocument();
    expect(screen.getByText("Battery")).toBeInTheDocument();
    expect(screen.getByText("Damaged — Cracked panel")).toBeInTheDocument();
    expect(screen.getByText("Missing part")).toBeInTheDocument();
    expect(screen.getByText("Other — See attached")).toBeInTheDocument();
  });

  it("renders no section-reasons block for a checkpoint without any", () => {
    render(<AuditTrailTimeline checkpoints={[checkpoints[0]]} />);
    expect(screen.queryByText("Panel")).not.toBeInTheDocument();
  });
});
