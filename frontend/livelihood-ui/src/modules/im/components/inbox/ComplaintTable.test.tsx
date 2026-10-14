import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import type { InboxRow } from "../../types/inbox";
import { ComplaintTable } from "./ComplaintTable";

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

function makeRow(overrides: Partial<InboxRow> = {}): InboxRow {
  return {
    incidentId: "INC-1",
    incidentType: "solar",
    assetLabel: "Rooftop Panel",
    status: "PENDING_FOR_RESOLUTION",
    taskOwner: "Jane Doe",
    sla: "5 days",
    slaUrgent: false,
    endUser: "John Smith",
    tenantId: "tenant-1",
    potentialDuplicate: false,
    ...overrides,
  };
}

describe("ComplaintTable", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockNavigate.mockReturnValue(Promise.resolve());
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINT_RESOLVER" }] } });
  });

  it("shows the SLA Days Remaining header for a non-end-user", () => {
    render(<ComplaintTable data={[]} />);
    expect(screen.getByText("SLA Days Remaining")).toBeInTheDocument();
  });

  it("shows the Days Remaining header for an end user", () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINANT" }] } });
    render(<ComplaintTable data={[]} />);
    expect(screen.getByText("Days Remaining")).toBeInTheDocument();
  });

  it("renders one row per item with its raw field values", () => {
    render(
      <ComplaintTable
        data={[
          makeRow({ incidentId: "INC-1", endUser: "Alpha User" }),
          makeRow({ incidentId: "INC-2", endUser: "Beta User" }),
        ]}
      />,
    );

    expect(screen.getByText("Alpha User")).toBeInTheDocument();
    expect(screen.getByText("Beta User")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "INC-1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "INC-2" })).toBeInTheDocument();
  });

  it("shows a potential-duplicate note only for rows flagged as such", () => {
    render(
      <ComplaintTable
        data={[
          makeRow({ incidentId: "INC-1", potentialDuplicate: true }),
          makeRow({ incidentId: "INC-2", potentialDuplicate: false }),
        ]}
      />,
    );

    expect(screen.getAllByText("Potential duplicate")).toHaveLength(1);
  });

  describe("SLA badge", () => {
    it("shows a muted dash for a '-' value", () => {
      render(<ComplaintTable data={[makeRow({ sla: "-" })]} />);
      expect(screen.getByText("-")).toHaveClass("livelihood-sla-badge-muted");
    });

    it("shows the translated Overdue label for the overdue marker", () => {
      render(<ComplaintTable data={[makeRow({ sla: "OVERDUE" })]} />);
      expect(screen.getByText("Overdue")).toHaveClass("livelihood-sla-badge-urgent");
    });

    it("shows the raw value with urgent styling when slaUrgent is true", () => {
      render(<ComplaintTable data={[makeRow({ sla: "1 day", slaUrgent: true })]} />);
      expect(screen.getByText("1 day")).toHaveClass("livelihood-sla-badge-urgent");
    });

    it("shows the raw value with normal styling when slaUrgent is false", () => {
      render(<ComplaintTable data={[makeRow({ sla: "5 days", slaUrgent: false })]} />);
      expect(screen.getByText("5 days")).toHaveClass("livelihood-sla-badge");
    });
  });

  describe("navigation", () => {
    it("navigates to the complaint details path when a plain cell is clicked", async () => {
      const user = userEvent.setup();
      render(<ComplaintTable data={[makeRow({ incidentId: "INC-1", tenantId: "tenant-9" })]} />);

      await user.click(screen.getByText("John Smith"));

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/livelihood-ui/employee/im/complaint/details/INC-1/tenant-9",
      });
    });

    it("does not navigate when the ticket number link itself is clicked", async () => {
      const user = userEvent.setup();
      render(<ComplaintTable data={[makeRow({ incidentId: "INC-1" })]} />);

      await user.click(screen.getByRole("link", { name: "INC-1" }));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
