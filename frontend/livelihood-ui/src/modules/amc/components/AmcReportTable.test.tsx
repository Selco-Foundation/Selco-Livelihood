import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AmcReport } from "../types/amc-report";
import { AmcReportTable } from "./AmcReportTable";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));

const report = {
  id: "r1",
  endUserName: "user979",
  endUserPhone: "9876543210",
  state: "Assam",
  district: "Kamrup",
  block: "Rangia",
  vendorName: "Surya Power Solutions",
  amcNumber: 1,
  totalAmcs: 2,
  latestSubmissionDate: Date.now(),
  status: "PENDING_APPROVAL",
} as AmcReport;

const baseProps = {
  totalCount: 1,
  isLoading: false,
  currentPage: 0,
  pageSize: 10,
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
};

describe("AmcReportTable", () => {
  it("shows the PRD columns, including SLA on the Pending Approval tab", () => {
    render(<AmcReportTable {...baseProps} tab="pending" reports={[report]} />);

    for (const header of ["End user", "Phone number", "State", "District", "Block", "AMC No.", "Report Status", "Vendor", "SLA days remaining"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("drops the SLA column on the Auto-Approved tab", () => {
    render(<AmcReportTable {...baseProps} tab="auto" reports={[{ ...report, status: "APPROVED", approvedBy: "SYSTEM" }]} />);

    expect(screen.queryByRole("columnheader", { name: "SLA days remaining" })).not.toBeInTheDocument();
    expect(screen.getByText("Auto-approved")).toBeInTheDocument();
  });

  it("opens the report detail when a row is clicked", async () => {
    const user = userEvent.setup();
    render(<AmcReportTable {...baseProps} tab="pending" reports={[report]} />);

    await user.click(screen.getByText("user979"));

    expect(navigate).toHaveBeenCalledWith({ to: expect.stringContaining("/employee/amc/reports/r1") });
  });

  it("shows an empty message when nothing matches", () => {
    render(<AmcReportTable {...baseProps} tab="pending" reports={[]} totalCount={0} />);

    expect(screen.getByText("No AMC reports match these filters")).toBeInTheDocument();
  });
});
