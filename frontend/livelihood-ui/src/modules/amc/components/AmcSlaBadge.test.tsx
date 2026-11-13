import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmcSlaBadge } from "./AmcSlaBadge";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date(2026, 10, 20, 12, 0).getTime();

describe("AmcSlaBadge", () => {
  it("shows the remaining days in green early in the SLA", () => {
    render(<AmcSlaBadge latestSubmissionDate={now - DAY} status="PENDING_APPROVAL" now={now} />);

    expect(screen.getByText("6")).toHaveClass("livelihood-sla-badge");
  });

  it("turns yellow in the last three days", () => {
    render(<AmcSlaBadge latestSubmissionDate={now - 5 * DAY} status="PENDING_APPROVAL" now={now} />);

    expect(screen.getByText("2")).toHaveClass("livelihood-sla-badge-warning");
  });

  it("shows only a negative count in red once breached, with no text label", () => {
    render(<AmcSlaBadge latestSubmissionDate={now - 9 * DAY} status="PENDING_APPROVAL" now={now} />);

    expect(screen.getByText("-2")).toHaveClass("livelihood-sla-badge-urgent");
    expect(screen.queryByText("SLA Breached")).not.toBeInTheDocument();
  });

  it("shows '-' for reports that are no longer pending", () => {
    render(<AmcSlaBadge latestSubmissionDate={now - 9 * DAY} status="APPROVED" now={now} />);

    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.queryByText("SLA Breached")).not.toBeInTheDocument();
  });
});
