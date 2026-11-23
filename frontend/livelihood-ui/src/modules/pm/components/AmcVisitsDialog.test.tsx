import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAmcVisits } from "../hooks/use-amc-visits";
import type { AmcScheduleRow } from "../types/amc";
import { AmcVisitsDialog } from "./AmcVisitsDialog";

vi.mock("../hooks/use-amc-visits", () => ({ useAmcVisits: vi.fn() }));

const row: AmcScheduleRow = {
  id: "amc-1",
  activityFacilityId: "af-1",
  status: "ACTIVE",
  endUserName: "Priya",
  phoneNumber: "-",
  state: "-",
  district: "-",
  block: "-",
  frequencyMonths: 6,
  years: 2,
  submittedVisits: 1,
  approvedVisits: 0,
};

function mockVisits(data: unknown[], rest = {}) {
  vi.mocked(useAmcVisits).mockReturnValue({ data, isLoading: false, isError: false, ...rest } as never);
}

beforeEach(() => mockVisits([]));

describe("AmcVisitsDialog", () => {
  it("lists each visit's progress, with later visits explained", () => {
    mockVisits([
      { id: "v1", number: 1, status: "APPROVED", autoApproved: true, fieldStaffName: "Ravi", isOverdue: false },
      { id: "v2", number: 2, status: "SCHEDULED", autoApproved: false, isOverdue: true },
    ]);
    render(<AmcVisitsDialog row={row} onClose={vi.fn()} />);

    expect(useAmcVisits).toHaveBeenCalledWith("amc-1");
    expect(screen.getByText("AMC visits of Priya")).toBeInTheDocument();
    const first = screen.getByText("1 of 4").closest("tr")!;
    expect(within(first).getByText("Auto-approved")).toBeInTheDocument();
    expect(within(first).getByText("Ravi")).toBeInTheDocument();
    expect(within(first).queryByText("Overdue")).not.toBeInTheDocument();
    expect(within(screen.getByText("2 of 4").closest("tr")!).getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText(/Each later visit/)).toBeInTheDocument();
  });

  it("explains why a pending AMC has no visits", () => {
    render(<AmcVisitsDialog row={{ ...row, status: "PENDING_ACTIVATION" }} onClose={vi.fn()} />);
    expect(screen.getByText("Visits start once the installation is approved.")).toBeInTheDocument();
  });

  it("says when the visits can't be loaded", () => {
    mockVisits([], { isError: true });
    render(<AmcVisitsDialog row={row} onClose={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the AMC visits");
  });

  it("is closed without a row", () => {
    render(<AmcVisitsDialog row={null} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
