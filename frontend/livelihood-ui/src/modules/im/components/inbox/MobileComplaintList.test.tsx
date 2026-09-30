import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import type { InboxRow } from "../../types/inbox";
import { MobileComplaintList } from "./MobileComplaintList";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
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

describe("MobileComplaintList", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockNavigate.mockReturnValue(Promise.resolve());
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINT_RESOLVER" }] } });
  });

  it("renders one card per row with its field values", () => {
    render(
      <MobileComplaintList
        data={[
          makeRow({ incidentId: "INC-1", endUser: "Alpha User" }),
          makeRow({ incidentId: "INC-2", endUser: "Beta User" }),
        ]}
      />,
    );

    expect(screen.getByText("INC-1")).toBeInTheDocument();
    expect(screen.getByText("INC-2")).toBeInTheDocument();
    expect(screen.getByText("Alpha User")).toBeInTheDocument();
    expect(screen.getByText("Beta User")).toBeInTheDocument();
  });

  it("shows a potential-duplicate note only for rows flagged as such", () => {
    render(
      <MobileComplaintList
        data={[
          makeRow({ incidentId: "INC-1", potentialDuplicate: true }),
          makeRow({ incidentId: "INC-2", potentialDuplicate: false }),
        ]}
      />,
    );

    expect(screen.getAllByText("Potential duplicate")).toHaveLength(1);
  });

  it("shows the SLA Days Remaining label and value for a non-end-user", () => {
    render(<MobileComplaintList data={[makeRow({ sla: "5 days" })]} />);
    expect(screen.getByText(/SLA Days Remaining/)).toBeInTheDocument();
    expect(screen.getByText("5 days")).toBeInTheDocument();
  });

  it("shows the Days Remaining label for an end user", () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINANT" }] } });
    render(<MobileComplaintList data={[makeRow()]} />);
    expect(screen.getByText(/^Days Remaining/)).toBeInTheDocument();
  });

  it("shows the translated Overdue label in place of the overdue marker", () => {
    render(<MobileComplaintList data={[makeRow({ sla: "OVERDUE" })]} />);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("styles the SLA value as urgent when slaUrgent is true", () => {
    render(<MobileComplaintList data={[makeRow({ sla: "1 day", slaUrgent: true })]} />);
    expect(screen.getByText("1 day")).toHaveClass("livelihood-sla-badge-urgent");
  });

  it("navigates to the complaint details path when the card is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileComplaintList data={[makeRow({ incidentId: "INC-1", tenantId: "tenant-9" })]} />);

    await user.click(screen.getByText("INC-1"));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/livelihood-ui/employee/im/complaint/details/INC-1/tenant-9",
    });
  });
});
