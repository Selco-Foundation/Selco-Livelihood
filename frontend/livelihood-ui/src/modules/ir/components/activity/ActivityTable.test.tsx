import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewActivity } from "../../types/activity-review";
import { irActivityReviewPath } from "../../utils/paths";
import { ActivityTable } from "./ActivityTable";

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

function makeActivity(overrides: Partial<ReviewActivity>): ReviewActivity {
  return {
    activityId: "activity-1",
    facilityId: "facility-1",
    facilityName: "Facility One",
    componentType: "SOLAR",
    planId: "plan-1",
    status: "SUBMITTED_BY_FIELD_STAFF",
    ...overrides,
  };
}

const defaultPaginationProps = {
  currentPage: 0,
  totalRecords: 3,
  pageSizeLimit: 10,
  onNextPage: vi.fn(),
  onPrevPage: vi.fn(),
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
};

function renderTable(
  activities: ReviewActivity[],
  overrides: Partial<React.ComponentProps<typeof ActivityTable>> = {},
) {
  const onSelectedChange = vi.fn();
  const props: React.ComponentProps<typeof ActivityTable> = {
    planId: "plan-1",
    activities,
    isLoading: false,
    selected: new Set<string>(),
    onSelectedChange,
    ...defaultPaginationProps,
    ...overrides,
  };
  const result = render(<ActivityTable {...props} />);
  return { ...result, onSelectedChange };
}

function getRowCheckboxes() {
  return screen.getAllByRole("checkbox").slice(1);
}

function getMasterCheckbox() {
  return screen.getAllByRole("checkbox")[0];
}

describe("ActivityTable", () => {
  beforeEach(() => {
    // navigate({...}) is chained with .catch() in the source, so the mock
    // needs to return a promise. Cleared explicitly since this mock is
    // defined outside the component tree, so vitest's restoreMocks config
    // doesn't reset its call history between tests.
    mockNavigate.mockReset();
    mockNavigate.mockReturnValue(Promise.resolve());
  });

  it("renders a loading skeleton and no table when isLoading", () => {
    renderTable([], { isLoading: true });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders an empty state when there are no activities", () => {
    renderTable([]);
    expect(screen.getByText("No activities found for this plan")).toBeInTheDocument();
  });

  it("renders one row per activity with its facility name", () => {
    renderTable([
      makeActivity({ activityId: "a1", facilityName: "Alpha" }),
      makeActivity({ activityId: "a2", facilityName: "Beta" }),
    ]);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  describe("row selectability", () => {
    it("renders no checkbox for a non-selectable row", () => {
      renderTable([
        makeActivity({ activityId: "a1", status: "APPROVED_BY_QC_SPOC" }),
      ]);
      // Only the master checkbox exists — the row has none.
      expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    });

    it("excludes non-selectable rows from selectableIds/allSelected", () => {
      renderTable([
        makeActivity({ activityId: "a1", status: "APPROVED_BY_QC_SPOC" }),
      ]);
      expect(getMasterCheckbox()).toBeDisabled();
    });
  });

  describe("master checkbox", () => {
    it("is disabled when no rows on the page are selectable", () => {
      renderTable([makeActivity({ activityId: "a1", status: "APPROVED_BY_QC_SPOC" })]);
      expect(getMasterCheckbox()).toBeDisabled();
    });

    it("clicking a disabled master checkbox does not call onSelectedChange", async () => {
      const user = userEvent.setup();
      const { onSelectedChange } = renderTable([
        makeActivity({ activityId: "a1", status: "APPROVED_BY_QC_SPOC" }),
      ]);
      await user.click(getMasterCheckbox());
      expect(onSelectedChange).not.toHaveBeenCalled();
    });

    it("is enabled and unchecked when some rows are selectable but none selected", () => {
      renderTable([makeActivity({ activityId: "a1" })]);
      const master = getMasterCheckbox();
      expect(master).toBeEnabled();
      expect(master).not.toBeChecked();
    });

    it("checks all selectable rows when clicked from unchecked", async () => {
      const user = userEvent.setup();
      const { onSelectedChange } = renderTable([
        makeActivity({ activityId: "a1" }),
        makeActivity({ activityId: "a2" }),
      ]);
      await user.click(getMasterCheckbox());
      expect(onSelectedChange).toHaveBeenCalledWith(new Set(["a1", "a2"]));
    });

    // Regression: the master checkbox must only read as checked from every
    // selectable row on the page being individually selected — never from a
    // partial selection escalating on its own — and toggling it off from
    // that state must clear the whole selection, not partially toggle.
    it("reflects checked only once every selectable row is individually checked, and clears everything on click", async () => {
      const user = userEvent.setup();
      const activities = [
        makeActivity({ activityId: "a1" }),
        makeActivity({ activityId: "a2" }),
        makeActivity({ activityId: "a3" }),
      ];

      let selected = new Set<string>();
      const onSelectedChange = vi.fn((next: Set<string>) => {
        selected = next;
      });

      const { rerender } = render(
        <ActivityTable
          planId="plan-1"
          activities={activities}
          isLoading={false}
          selected={selected}
          onSelectedChange={onSelectedChange}
          {...defaultPaginationProps}
        />,
      );

      for (const id of ["a1", "a2", "a3"]) {
        const index = activities.findIndex((activity) => activity.activityId === id);
        await user.click(getRowCheckboxes()[index]);
        rerender(
          <ActivityTable
            planId="plan-1"
            activities={activities}
            isLoading={false}
            selected={selected}
            onSelectedChange={onSelectedChange}
            {...defaultPaginationProps}
          />,
        );
      }

      expect(selected).toEqual(new Set(["a1", "a2", "a3"]));
      expect(getMasterCheckbox()).toBeChecked();

      await user.click(getMasterCheckbox());

      expect(onSelectedChange).toHaveBeenLastCalledWith(new Set());
    });
  });

  describe("toggleOne", () => {
    it("unchecking a single row only deselects that row, leaving the rest intact", async () => {
      const user = userEvent.setup();
      const activities = [
        makeActivity({ activityId: "a1" }),
        makeActivity({ activityId: "a2" }),
        makeActivity({ activityId: "a3" }),
      ];
      const { onSelectedChange } = renderTable(activities, {
        selected: new Set(["a1", "a2"]),
      });

      // a1 is the still-checked row we uncheck; a2 must remain untouched.
      await user.click(getRowCheckboxes()[0]);

      expect(onSelectedChange).toHaveBeenCalledWith(new Set(["a2"]));
    });

    it("checking one row of several adds only that id to the selection", async () => {
      const user = userEvent.setup();
      const activities = [
        makeActivity({ activityId: "a1" }),
        makeActivity({ activityId: "a2" }),
      ];
      const { onSelectedChange } = renderTable(activities, {
        selected: new Set(["a1"]),
      });

      await user.click(getRowCheckboxes()[1]);

      expect(onSelectedChange).toHaveBeenCalledWith(new Set(["a1", "a2"]));
    });
  });

  describe("navigation", () => {
    it("navigates to the activity review path when a row is clicked", async () => {
      const user = userEvent.setup();
      renderTable([makeActivity({ activityId: "nav-row", planId: "plan-1" })]);

      // Click a plain cell (not the Link/checkbox cell, which stop
      // propagation) so it bubbles to the row's own onClick handler.
      await user.click(screen.getByText("Pending Review"));

      expect(mockNavigate).toHaveBeenCalledWith({
        to: irActivityReviewPath("plan-1", "nav-row"),
      });
    });

    it("clicking the checkbox cell does not trigger row navigation", async () => {
      const user = userEvent.setup();
      renderTable([makeActivity({ activityId: "a1" })]);

      await user.click(getRowCheckboxes()[0]);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("pagination", () => {
    it("renders pagination controls when there is more than one page", () => {
      renderTable([makeActivity({ activityId: "a1" })], { totalRecords: 30 });
      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
    });

    it("does not render pagination when totalRecords is 0", () => {
      renderTable([], { totalRecords: 0 });
      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    });

    it("calls onNextPage when the next control is clicked", async () => {
      const user = userEvent.setup();
      const onNextPage = vi.fn();
      renderTable([makeActivity({ activityId: "a1" })], {
        totalRecords: 30,
        pageSizeLimit: 10,
        currentPage: 0,
        onNextPage,
      });

      await user.click(screen.getByText("Next"));

      expect(onNextPage).toHaveBeenCalledTimes(1);
    });

    it("calls onPageSizeChange when the page size select changes", async () => {
      const user = userEvent.setup();
      const onPageSizeChange = vi.fn();
      renderTable([makeActivity({ activityId: "a1" })], {
        totalRecords: 3,
        onPageSizeChange,
      });

      await user.selectOptions(screen.getByLabelText("Items per Page"), "20");

      expect(onPageSizeChange).toHaveBeenCalledWith(20);
    });
  });
});
