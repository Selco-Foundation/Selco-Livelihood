import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { InboxStatusMapEntry } from "../../types/inbox";
import { InboxStatus } from "./InboxStatus";

describe("InboxStatus", () => {
  it("renders the Ticket Status label", () => {
    render(<InboxStatus selectedStatuses={[]} onAssignmentChange={vi.fn()} />);
    expect(screen.getByText("Ticket Status")).toBeInTheDocument();
  });

  it("renders every ordered status with no count suffix when statusMap is empty", () => {
    render(<InboxStatus selectedStatuses={[]} onAssignmentChange={vi.fn()} />);

    expect(screen.getByText("PENDING_FOR_RESOLUTION")).toBeInTheDocument();
    expect(screen.getByText("RESOLVED")).toBeInTheDocument();
    expect(screen.getByText("CLOSED_AFTER_DECLINE")).toBeInTheDocument();
  });

  it("appends the status's count in parentheses when statusMap provides one", () => {
    const statusMap: InboxStatusMapEntry[] = [{ statusid: "RESOLVED", count: 5 }];
    render(<InboxStatus statusMap={statusMap} selectedStatuses={[]} onAssignmentChange={vi.fn()} />);

    expect(screen.getByText("RESOLVED (5)")).toBeInTheDocument();
  });

  it("appends a status code from statusMap that isn't in the ordered list, at the end", () => {
    const statusMap: InboxStatusMapEntry[] = [{ statusid: "SOME_OTHER_STATUS", count: 2 }];
    render(<InboxStatus statusMap={statusMap} selectedStatuses={[]} onAssignmentChange={vi.fn()} />);

    expect(screen.getByText("SOME_OTHER_STATUS (2)")).toBeInTheDocument();
  });

  it("checks only the option(s) present in selectedStatuses", () => {
    render(
      <InboxStatus
        selectedStatuses={[{ code: "RESOLVED" }]}
        onAssignmentChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "RESOLVED" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "PENDING_FOR_RESOLUTION" })).not.toBeChecked();
  });

  it("fires onAssignmentChange with checked=true and the clicked option when an unchecked status is clicked", async () => {
    const user = userEvent.setup();
    const onAssignmentChange = vi.fn();
    render(<InboxStatus selectedStatuses={[]} onAssignmentChange={onAssignmentChange} />);

    await user.click(screen.getByText("RESOLVED"));

    expect(onAssignmentChange).toHaveBeenCalledWith(true, {
      code: "RESOLVED",
      statuses: ["RESOLVED"],
      count: 0,
    });
  });

  it("fires onAssignmentChange with checked=false when an already-checked status is clicked", async () => {
    const user = userEvent.setup();
    const onAssignmentChange = vi.fn();
    render(
      <InboxStatus
        selectedStatuses={[{ code: "RESOLVED" }]}
        onAssignmentChange={onAssignmentChange}
      />,
    );

    await user.click(screen.getByText("RESOLVED"));

    expect(onAssignmentChange).toHaveBeenCalledWith(false, {
      code: "RESOLVED",
      statuses: ["RESOLVED"],
      count: 0,
    });
  });
});
