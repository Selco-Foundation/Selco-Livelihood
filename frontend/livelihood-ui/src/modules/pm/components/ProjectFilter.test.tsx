import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBoundaryTree } from "../hooks/use-boundary-tree";
import type { ProjectListFilters } from "../types/project";
import { ProjectFilter } from "./ProjectFilter";

vi.mock("../hooks/use-boundary-tree", () => ({ useBoundaryTree: vi.fn() }));

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
  vi.mocked(useBoundaryTree).mockReturnValue({
    data: { states: [{ code: "KA", name: "Karnataka" }, { code: "AS", name: "Assam" }] },
  } as never);
});

function renderFilter(overrides: Partial<React.ComponentProps<typeof ProjectFilter>> = {}) {
  const onChange = vi.fn();
  const value: ProjectListFilters = { stateCodes: [], statuses: [] };
  const props: React.ComponentProps<typeof ProjectFilter> = {
    value,
    onChange,
    searchSlot: null,
    ...overrides,
  };
  const result = render(<ProjectFilter {...props} />);
  return { ...result, onChange };
}

describe("ProjectFilter", () => {
  it("shows the State category's options by default", async () => {
    const user = userEvent.setup();
    renderFilter();

    await user.click(screen.getByText("Filters"));

    expect(screen.getByText("Karnataka")).toBeInTheDocument();
    expect(screen.getByText("Assam")).toBeInTheDocument();
    expect(screen.queryByText("Scheduled")).not.toBeInTheDocument();
  });

  it("switches to the Status category", async () => {
    const user = userEvent.setup();
    renderFilter();
    await user.click(screen.getByText("Filters"));

    await user.click(screen.getByText("Status"));

    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.queryByText("Karnataka")).not.toBeInTheDocument();
  });

  it("toggles a state code in and out of stateCodes", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilter();
    await user.click(screen.getByText("Filters"));

    await user.click(screen.getByText("Karnataka"));

    expect(onChange).toHaveBeenLastCalledWith({ stateCodes: ["KA"], statuses: [] });
  });

  it("removes a state code when toggled again", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilter({ value: { stateCodes: ["KA"], statuses: [] } });
    await user.click(screen.getByText("Filters"));

    await user.click(screen.getByText("Karnataka"));

    expect(onChange).toHaveBeenLastCalledWith({ stateCodes: [], statuses: [] });
  });

  it("filters visible options by the search text", async () => {
    const user = userEvent.setup();
    renderFilter();
    await user.click(screen.getByText("Filters"));

    await user.type(screen.getByPlaceholderText("Search"), "karn");

    expect(screen.getByText("Karnataka")).toBeInTheDocument();
    expect(screen.queryByText("Assam")).not.toBeInTheDocument();
  });

  it("disables 'clear all filters' when nothing is selected, and enables it once something is", () => {
    const { rerender } = renderFilter();

    expect(screen.getByRole("button", { name: "clear all filters" })).toBeDisabled();

    rerender(
      <ProjectFilter value={{ stateCodes: ["KA"], statuses: [] }} onChange={vi.fn()} searchSlot={null} />,
    );

    expect(screen.getByRole("button", { name: "clear all filters" })).toBeEnabled();
  });

  it("resets both stateCodes and statuses when 'clear all filters' is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilter({ value: { stateCodes: ["KA"], statuses: ["DRAFT"] } });

    await user.click(screen.getByRole("button", { name: "clear all filters" }));

    expect(onChange).toHaveBeenCalledWith({ stateCodes: [], statuses: [] });
  });

  it("renders the given searchSlot", () => {
    renderFilter({ searchSlot: <div>Search here</div> });

    expect(screen.getByText("Search here")).toBeInTheDocument();
  });
});
