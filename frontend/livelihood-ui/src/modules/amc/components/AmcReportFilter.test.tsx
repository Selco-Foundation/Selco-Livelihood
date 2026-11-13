import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AmcFilterOptions } from "../utils/filter-options";
import { AmcReportFilter, EMPTY_AMC_REPORT_FILTERS } from "./AmcReportFilter";

const options: AmcFilterOptions = {
  vendors: [{ code: "Surya Power Solutions", name: "Surya Power Solutions" }],
  states: [{ code: "Assam", name: "Assam" }],
  districts: [{ code: "Kamrup", name: "Kamrup" }],
  blocks: [{ code: "Rangia", name: "Rangia" }],
};

function renderFilter(tab: "pending" | "auto", onFilterChange = vi.fn(), onSearchTextChange = vi.fn()) {
  render(
    <AmcReportFilter
      tab={tab}
      options={options}
      filters={EMPTY_AMC_REPORT_FILTERS}
      searchText=""
      onFilterChange={onFilterChange}
      onSearchTextChange={onSearchTextChange}
    />,
  );
}

describe("AmcReportFilter", () => {
  it("offers status, SLA breached and the date range on the Pending Approval tab", async () => {
    const user = userEvent.setup();
    renderFilter("pending");

    await user.click(screen.getByRole("button", { name: /Filters/ }));

    expect(screen.getByRole("button", { name: "Report Status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SLA Breached" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submission date" })).toBeInTheDocument();
  });

  it("offers only vendor and geography on the Auto-Approved tab", async () => {
    const user = userEvent.setup();
    renderFilter("auto");

    await user.click(screen.getByRole("button", { name: /Filters/ }));

    expect(screen.getByRole("button", { name: "Vendor" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Report Status" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submission date" })).not.toBeInTheDocument();
  });

  it("selecting a vendor reports it in the vendor filter", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderFilter("pending", onFilterChange);

    await user.click(screen.getByRole("button", { name: /Filters/ }));
    await user.click(screen.getByRole("checkbox"));

    expect(onFilterChange).toHaveBeenCalledWith({ ...EMPTY_AMC_REPORT_FILTERS, vendors: ["Surya Power Solutions"] });
  });

  it("passes search text through", async () => {
    const user = userEvent.setup();
    const onSearchTextChange = vi.fn();
    renderFilter("pending", vi.fn(), onSearchTextChange);

    await user.type(screen.getByRole("textbox", { name: "Search end user name or phone" }), "9");

    expect(onSearchTextChange).toHaveBeenCalledWith("9");
  });
});
