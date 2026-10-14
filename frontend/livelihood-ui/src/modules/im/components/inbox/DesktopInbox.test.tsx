import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { InboxDataResult, InboxRow } from "../../types/inbox";
import { DesktopInbox } from "./DesktopInbox";

vi.mock("./InboxFilter", () => ({
  InboxFilter: () => <div>Filter Stub</div>,
}));
vi.mock("./ComplaintTable", () => ({
  ComplaintTable: ({ data }: { data: InboxRow[] }) => (
    <div data-testid="complaint-table">{data.length} rows</div>
  ),
}));
vi.mock("./MobileComplaintList", () => ({
  MobileComplaintList: ({ data }: { data: InboxRow[] }) => (
    <div data-testid="mobile-list">{data.length} rows</div>
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

const defaultPaginationProps = {
  onNextPage: vi.fn(),
  onPrevPage: vi.fn(),
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
  currentPage: 0,
  pageSizeLimit: 10,
};

function renderInbox(overrides: Partial<React.ComponentProps<typeof DesktopInbox>> = {}) {
  const onFilterChange = vi.fn();
  const props: React.ComponentProps<typeof DesktopInbox> = {
    isLoading: false,
    onFilterChange,
    searchParams: {},
    totalRecords: 0,
    ...defaultPaginationProps,
    ...overrides,
  };
  const result = render(<DesktopInbox {...props} />);
  return { ...result, onFilterChange };
}

describe("DesktopInbox", () => {
  it("always renders the filter bar regardless of load state", () => {
    renderInbox({ isLoading: true });
    expect(screen.getByText("Filter Stub")).toBeInTheDocument();
  });

  it("shows a loading skeleton and no table/list when isLoading", () => {
    renderInbox({ isLoading: true });
    expect(screen.queryByTestId("complaint-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mobile-list")).not.toBeInTheDocument();
  });

  it("shows a no-results message when data has zero rows", () => {
    const data: InboxDataResult = { combinedRes: [], total: 0, statusArray: [] };
    renderInbox({ isLoading: false, data, totalRecords: 0 });
    expect(screen.getByText("No Tickets Found")).toBeInTheDocument();
  });

  it("renders both the table and mobile list with the fetched rows", () => {
    const data: InboxDataResult = {
      combinedRes: [makeRow({ incidentId: "a1" }), makeRow({ incidentId: "a2" })],
      total: 2,
      statusArray: [],
    };
    renderInbox({ isLoading: false, data, totalRecords: 2 });

    expect(screen.getByTestId("complaint-table")).toHaveTextContent("2 rows");
    expect(screen.getByTestId("mobile-list")).toHaveTextContent("2 rows");
  });

  it("shows an error fallback when there is no data and it isn't loading", () => {
    renderInbox({ isLoading: false, data: undefined, totalRecords: 0 });
    expect(screen.getByText("Unable to load results")).toBeInTheDocument();
  });

  it("renders pagination only when there are records", () => {
    const data: InboxDataResult = {
      combinedRes: [makeRow()],
      total: 1,
      statusArray: [],
    };
    const { rerender } = render(
      <DesktopInbox
        isLoading={false}
        onFilterChange={vi.fn()}
        searchParams={{}}
        data={data}
        totalRecords={0}
        {...defaultPaginationProps}
      />,
    );
    expect(screen.queryByText("Previous")).not.toBeInTheDocument();

    rerender(
      <DesktopInbox
        isLoading={false}
        onFilterChange={vi.fn()}
        searchParams={{}}
        data={data}
        totalRecords={30}
        {...defaultPaginationProps}
      />,
    );
    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("calls onNextPage when the pagination Next control is clicked", async () => {
    const user = userEvent.setup();
    const onNextPage = vi.fn();
    const data: InboxDataResult = { combinedRes: [makeRow()], total: 1, statusArray: [] };
    renderInbox({ data, totalRecords: 30, onNextPage });

    await user.click(screen.getByText("Next"));

    expect(onNextPage).toHaveBeenCalledTimes(1);
  });
});
