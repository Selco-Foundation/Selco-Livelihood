import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ActivityFilter,
  EMPTY_ACTIVITY_FILTERS,
  type ActivityFilterOption,
  type ActivityFilterState,
} from "./ActivityFilter";

const districtOptions: ActivityFilterOption[] = [
  { code: "D1", name: "Alpha District" },
  { code: "D2", name: "Beta District" },
];
const blockOptions: ActivityFilterOption[] = [{ code: "B1", name: "Block One" }];
const statusOptions: ActivityFilterOption[] = [
  { code: "SUBMITTED_BY_FIELD_STAFF", name: "Pending Review" },
];
const typeOptions: ActivityFilterOption[] = [
  { code: "SOLAR", name: "Solar" },
  { code: "MACHINE", name: "Machine" },
];

function renderFilter(overrides: Partial<React.ComponentProps<typeof ActivityFilter>> = {}) {
  const onFilterChange = vi.fn();
  const onSearchTextChange = vi.fn();
  const onApprove = vi.fn();
  const props: React.ComponentProps<typeof ActivityFilter> = {
    districtOptions,
    blockOptions,
    statusOptions,
    typeOptions,
    filters: EMPTY_ACTIVITY_FILTERS,
    searchText: "",
    onFilterChange,
    onSearchTextChange,
    selectedCount: 0,
    onApprove,
    isApproving: false,
    ...overrides,
  };
  const result = render(<ActivityFilter {...props} />);
  return { ...result, onFilterChange, onSearchTextChange, onApprove };
}

async function openFilters(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Filters"));
}

describe("ActivityFilter", () => {
  describe("toggleOption", () => {
    it("adds a code to the active category's filter array when an unselected option is clicked", async () => {
      const user = userEvent.setup();
      const { onFilterChange } = renderFilter();
      await openFilters(user);

      await user.click(screen.getByText("Alpha District"));

      expect(onFilterChange).toHaveBeenCalledWith({
        ...EMPTY_ACTIVITY_FILTERS,
        district: ["D1"],
      });
    });

    it("removes a code from the active category's filter array when a selected option is clicked", async () => {
      const user = userEvent.setup();
      const filters: ActivityFilterState = { ...EMPTY_ACTIVITY_FILTERS, district: ["D1"] };
      const { onFilterChange } = renderFilter({ filters });
      await openFilters(user);

      await user.click(screen.getByText("Alpha District"));

      expect(onFilterChange).toHaveBeenCalledWith({
        ...EMPTY_ACTIVITY_FILTERS,
        district: [],
      });
    });

    it("only touches the active category, leaving other categories' filters untouched", async () => {
      const user = userEvent.setup();
      const filters: ActivityFilterState = { ...EMPTY_ACTIVITY_FILTERS, type: ["SOLAR"] };
      const { onFilterChange } = renderFilter({ filters });
      await openFilters(user);

      await user.click(screen.getByText("Alpha District"));

      expect(onFilterChange).toHaveBeenCalledWith({
        ...EMPTY_ACTIVITY_FILTERS,
        district: ["D1"],
        type: ["SOLAR"],
      });
    });
  });

  describe("hasActiveFilters", () => {
    it("disables clear-all when no filter category has any selection", () => {
      renderFilter({ filters: EMPTY_ACTIVITY_FILTERS });
      expect(screen.getByRole("button", { name: "clear all filters" })).toBeDisabled();
    });

    it("enables clear-all when any single category has a selection", () => {
      renderFilter({ filters: { ...EMPTY_ACTIVITY_FILTERS, block: ["B1"] } });
      expect(screen.getByRole("button", { name: "clear all filters" })).toBeEnabled();
    });
  });

  describe("handleClearAllFilters", () => {
    it("resets filters to EMPTY_ACTIVITY_FILTERS when clear-all is clicked", async () => {
      const user = userEvent.setup();
      const filters: ActivityFilterState = {
        district: ["D1"],
        block: ["B1"],
        status: ["SUBMITTED_BY_FIELD_STAFF"],
        type: ["SOLAR"],
      };
      const { onFilterChange } = renderFilter({ filters });

      await user.click(screen.getByRole("button", { name: "clear all filters" }));

      expect(onFilterChange).toHaveBeenCalledWith(EMPTY_ACTIVITY_FILTERS);
    });
  });

  describe("category switching", () => {
    it("shows the district category's options by default", async () => {
      const user = userEvent.setup();
      renderFilter();
      await openFilters(user);

      expect(screen.getByText("Alpha District")).toBeInTheDocument();
      expect(screen.queryByText("Block One")).not.toBeInTheDocument();
    });

    it("shows only the clicked category's options", async () => {
      const user = userEvent.setup();
      renderFilter();
      await openFilters(user);

      await user.click(screen.getByRole("button", { name: "Block" }));

      expect(screen.getByText("Block One")).toBeInTheDocument();
      expect(screen.queryByText("Alpha District")).not.toBeInTheDocument();
    });

    it("switches to the Status and Type categories on request", async () => {
      const user = userEvent.setup();
      renderFilter();
      await openFilters(user);

      await user.click(screen.getByRole("button", { name: "Status" }));
      expect(screen.getByText("Pending Review")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Type" }));
      expect(screen.getByText("Solar")).toBeInTheDocument();
      expect(screen.getByText("Machine")).toBeInTheDocument();
      expect(screen.queryByText("Pending Review")).not.toBeInTheDocument();
    });
  });

  describe("category search", () => {
    it("narrows the visible options to those matching the search text", async () => {
      const user = userEvent.setup();
      renderFilter();
      await openFilters(user);

      await user.type(screen.getByPlaceholderText("Search"), "Alp");

      expect(screen.getByText("Alpha District")).toBeInTheDocument();
      expect(screen.queryByText("Beta District")).not.toBeInTheDocument();
    });

    it("shows a no-options message when nothing matches", async () => {
      const user = userEvent.setup();
      renderFilter();
      await openFilters(user);

      await user.type(screen.getByPlaceholderText("Search"), "zzz-no-match");

      expect(screen.getByText("No options found")).toBeInTheDocument();
    });
  });

  describe("Approve Selected button", () => {
    it("stays mounted at selectedCount 0 rather than unmounting", () => {
      renderFilter({ selectedCount: 0 });
      expect(screen.getByRole("button", { name: /Approve Selected/ })).toBeInTheDocument();
    });

    it("stays mounted with a nonzero selectedCount too", () => {
      renderFilter({ selectedCount: 5 });
      expect(screen.getByRole("button", { name: /Approve Selected \(5\)/ })).toBeInTheDocument();
    });

    it("is disabled when selectedCount is 0", () => {
      renderFilter({ selectedCount: 0, isApproving: false });
      expect(screen.getByRole("button", { name: /Approve Selected/ })).toBeDisabled();
    });

    it("is disabled while isApproving even with a nonzero selectedCount", () => {
      renderFilter({ selectedCount: 3, isApproving: true });
      expect(screen.getByRole("button", { name: /Approve Selected/ })).toBeDisabled();
    });

    it("is enabled when selectedCount is nonzero and not approving", () => {
      renderFilter({ selectedCount: 3, isApproving: false });
      expect(screen.getByRole("button", { name: /Approve Selected/ })).toBeEnabled();
    });

    it("fires onApprove when clicked while enabled", async () => {
      const user = userEvent.setup();
      const { onApprove } = renderFilter({ selectedCount: 2, isApproving: false });

      await user.click(screen.getByRole("button", { name: /Approve Selected/ }));

      expect(onApprove).toHaveBeenCalledTimes(1);
    });
  });

  describe("search text", () => {
    it("fires onSearchTextChange when typing in the end-user search box", async () => {
      const user = userEvent.setup();
      const { onSearchTextChange } = renderFilter();

      await user.type(screen.getByPlaceholderText("Search End Users"), "a");

      expect(onSearchTextChange).toHaveBeenCalledWith("a");
    });
  });
});
