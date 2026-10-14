import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination, type PaginationProps } from "./pagination";

const defaultProps: PaginationProps = {
  currentPage: 0,
  totalRecords: 30,
  pageSizeLimit: 10,
  onNextPage: vi.fn(),
  onPrevPage: vi.fn(),
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
};

function renderPagination(overrides: Partial<PaginationProps> = {}) {
  return render(<Pagination {...defaultProps} {...overrides} />);
}

describe("Pagination", () => {
  it("renders the items-per-page select with the current page size", () => {
    renderPagination({ pageSizeLimit: 20 });

    expect(screen.getByLabelText("Items per Page")).toHaveValue("20");
  });

  it("calls onPageSizeChange with a number when the page size select changes", async () => {
    const user = userEvent.setup();
    const onPageSizeChange = vi.fn();
    renderPagination({ onPageSizeChange });

    await user.selectOptions(screen.getByLabelText("Items per Page"), "50");

    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("disables Previous on the first page and enables Next when more pages remain", () => {
    renderPagination({ currentPage: 0, totalRecords: 30, pageSizeLimit: 10 });

    expect(screen.getByText("Previous").closest("button")).toBeDisabled();
    expect(screen.getByText("Next").closest("button")).toBeEnabled();
  });

  it("disables Next on the last page and enables Previous", () => {
    renderPagination({ currentPage: 2, totalRecords: 30, pageSizeLimit: 10 });

    expect(screen.getByText("Next").closest("button")).toBeDisabled();
    expect(screen.getByText("Previous").closest("button")).toBeEnabled();
  });

  it("calls onNextPage and onPrevPage when their controls are clicked", async () => {
    const user = userEvent.setup();
    const onNextPage = vi.fn();
    const onPrevPage = vi.fn();
    renderPagination({ currentPage: 1, totalRecords: 30, pageSizeLimit: 10, onNextPage, onPrevPage });

    await user.click(screen.getByText("Next"));
    await user.click(screen.getByText("Previous"));

    expect(onNextPage).toHaveBeenCalledTimes(1);
    expect(onPrevPage).toHaveBeenCalledTimes(1);
  });

  it("renders a page button for each page when there are 7 or fewer", () => {
    renderPagination({ currentPage: 0, totalRecords: 70, pageSizeLimit: 10 });

    for (const page of [1, 2, 3, 4, 5, 6, 7]) {
      expect(screen.getByRole("button", { name: String(page) })).toBeInTheDocument();
    }
  });

  it("marks the current page button with aria-current", () => {
    renderPagination({ currentPage: 2, totalRecords: 70, pageSizeLimit: 10 });

    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "1" })).not.toHaveAttribute("aria-current");
  });

  it("calls onPageChange with the zero-based page index when a page button is clicked", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderPagination({ currentPage: 0, totalRecords: 70, pageSizeLimit: 10, onPageChange });

    await user.click(screen.getByRole("button", { name: "3" }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("collapses the middle pages behind an ellipsis when there are more than 7 pages and the current page is in the middle", () => {
    // 20 pages total, current page (0-based) 9 -> falls into the "middle" branch.
    renderPagination({ currentPage: 9, totalRecords: 200, pageSizeLimit: 10 });

    expect(screen.getAllByText("…")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "20" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();
  });

  it("shows a trailing ellipsis only when the current page is near the start", () => {
    renderPagination({ currentPage: 0, totalRecords: 200, pageSizeLimit: 10 });

    expect(screen.getAllByText("…")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "20" })).toBeInTheDocument();
  });

  it("shows a leading ellipsis only when the current page is near the end", () => {
    renderPagination({ currentPage: 19, totalRecords: 200, pageSizeLimit: 10 });

    expect(screen.getAllByText("…")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
  });

  it("renders nothing when totalRecords is 0", () => {
    const { container } = renderPagination({ currentPage: 0, totalRecords: 0, pageSizeLimit: 10 });

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the items-per-page select but hides page navigation when everything fits on one page", () => {
    renderPagination({ currentPage: 0, totalRecords: 3, pageSizeLimit: 10 });

    expect(screen.getByLabelText("Items per Page")).toBeInTheDocument();
    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });
});
