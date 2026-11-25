import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmcSlaBadge } from "./AmcSlaBadge";

describe("AmcSlaBadge", () => {
  it("shows the days left in green while well inside the SLA", () => {
    render(<AmcSlaBadge sla={{ daysRemaining: 5, breached: false }} />);
    expect(screen.getByText("5")).toHaveClass("livelihood-sla-badge");
  });

  it("turns yellow with 3 days or fewer left", () => {
    render(<AmcSlaBadge sla={{ daysRemaining: 2, breached: false }} />);
    expect(screen.getByText("2")).toHaveClass("livelihood-sla-badge-warning");
  });

  it("turns red once the server says the SLA is breached", () => {
    render(<AmcSlaBadge sla={{ daysRemaining: -2, breached: true }} />);
    expect(screen.getByText("-2")).toHaveClass("livelihood-sla-badge-urgent");
  });

  it("shows a dash when the report is not waiting for review", () => {
    render(<AmcSlaBadge />);
    expect(screen.getByText("-")).toHaveClass("livelihood-sla-badge-muted");
  });
});
