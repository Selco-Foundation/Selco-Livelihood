import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore, useBoundary, useFacility } from "@/shared";
import type { ImInboxFilters } from "../../types/inbox";
import { InboxFilter } from "./InboxFilter";
import { useImAssetTypes } from "../../hooks/use-im-inbox-summary";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, useBoundary: vi.fn(), useFacility: vi.fn() };
});

vi.mock("../../hooks/use-im-inbox-summary", () => ({ useImAssetTypes: vi.fn() }));

// Radix Popover/Sheet/ScrollArea rely on pointer-capture and scroll APIs
// jsdom doesn't implement; stub them so the triggers can be opened via userEvent.
beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

const boundaryFixture = {
  states: [{ code: "ST1" }, { code: "ST2" }],
  districts: [
    { code: "D1", parentCode: "ST1" },
    { code: "D2", parentCode: "ST1" },
    { code: "D3", parentCode: "ST2" },
  ],
  blocks: [
    { code: "B1", parentCode: "D1" },
    { code: "B2", parentCode: "D3" },
  ],
  facilities: [
    { code: "FA1", parentCode: "B1" },
    { code: "FA2", parentCode: "B2" },
  ],
};

const facilityFixture = {
  facilities: [{ boundaryCode: "FA1" }, { boundaryCode: "FA2" }],
};

const assetTypesFixture = [{ code: "SOLAR" }, { code: "MACHINE" }];

function renderFilter(overrides: Partial<React.ComponentProps<typeof InboxFilter>> = {}) {
  const onFilterChange = vi.fn();
  const props: React.ComponentProps<typeof InboxFilter> = {
    searchParams: {},
    onFilterChange,
    ...overrides,
  };
  const result = render(<InboxFilter {...props} />);
  return { ...result, onFilterChange };
}

function lastCall(onFilterChange: ReturnType<typeof vi.fn>): ImInboxFilters {
  return onFilterChange.mock.calls.at(-1)![0] as ImInboxFilters;
}

async function openDesktopFilters(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Filters"));
}

describe("InboxFilter", () => {
  beforeEach(() => {
    vi.mocked(useBoundary).mockReturnValue({ data: boundaryFixture } as never);
    vi.mocked(useFacility).mockReturnValue({ data: facilityFixture } as never);
    vi.mocked(useImAssetTypes).mockReturnValue({ data: assetTypesFixture } as never);
    useAuthStore.setState({ user: { uuid: "user-1", roles: [{ code: "VIEWER" }] } });
  });

  describe("category switching", () => {
    it("shows the Asset Type category's options by default", async () => {
      const user = userEvent.setup();
      renderFilter();
      await openDesktopFilters(user);

      expect(screen.getByText("MACHINE")).toBeInTheDocument();
      expect(screen.getByText("SOLAR")).toBeInTheDocument();
      expect(screen.queryByText("ST1")).not.toBeInTheDocument();
    });

    it("switches to State, District, Block, End User (facility), and Ticket Status", async () => {
      const user = userEvent.setup();
      renderFilter();
      await openDesktopFilters(user);

      await user.click(screen.getByRole("button", { name: "State" }));
      expect(screen.getByText("ST1")).toBeInTheDocument();
      expect(screen.getByText("ST2")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "District" }));
      expect(screen.getByText("D1")).toBeInTheDocument();
      expect(screen.getByText("D3")).toBeInTheDocument();
      expect(screen.queryByText("ST1")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Block" }));
      expect(screen.getByText("B1")).toBeInTheDocument();
      expect(screen.getByText("B2")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "End User" }));
      expect(screen.getByText("FA1")).toBeInTheDocument();
      expect(screen.getByText("FA2")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Ticket Status" }));
      expect(screen.getByText("RESOLVED")).toBeInTheDocument();
      expect(screen.queryByText("FA1")).not.toBeInTheDocument();
    });

    it("hides the State/District/Block/End User categories for an end user", async () => {
      useAuthStore.setState({ user: { uuid: "user-1", roles: [{ code: "COMPLAINANT" }] } });
      const user = userEvent.setup();
      renderFilter();
      await openDesktopFilters(user);

      expect(screen.queryByRole("button", { name: "State" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "District" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Block" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "End User" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Asset Type" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ticket Status" })).toBeInTheDocument();
    });
  });

  describe("geo cascade", () => {
    it("narrows District options to the selected State's children", async () => {
      const user = userEvent.setup();
      renderFilter();
      await openDesktopFilters(user);
      await user.click(screen.getByRole("button", { name: "State" }));
      await user.click(screen.getByText("ST1"));

      await user.click(screen.getByRole("button", { name: "District" }));
      expect(screen.getByText("D1")).toBeInTheDocument();
      expect(screen.getByText("D2")).toBeInTheDocument();
      expect(screen.queryByText("D3")).not.toBeInTheDocument();
    });

    it("narrows Block options to the selected District's children", async () => {
      const user = userEvent.setup();
      renderFilter();
      await openDesktopFilters(user);
      await user.click(screen.getByRole("button", { name: "District" }));
      await user.click(screen.getByText("D1"));

      await user.click(screen.getByRole("button", { name: "Block" }));
      expect(screen.getByText("B1")).toBeInTheDocument();
      expect(screen.queryByText("B2")).not.toBeInTheDocument();
    });

    it("narrows End User (facility) options to the selected Block's children", async () => {
      const user = userEvent.setup();
      renderFilter();
      await openDesktopFilters(user);
      await user.click(screen.getByRole("button", { name: "Block" }));
      await user.click(screen.getByText("B1"));

      await user.click(screen.getByRole("button", { name: "End User" }));
      expect(screen.getByText("FA1")).toBeInTheDocument();
      expect(screen.queryByText("FA2")).not.toBeInTheDocument();
    });
  });

  describe("toggling an option", () => {
    it("adds the code to pgrQuery when an unselected option is clicked", async () => {
      const user = userEvent.setup();
      const { onFilterChange } = renderFilter();
      await openDesktopFilters(user);

      await user.click(screen.getByText("MACHINE"));

      expect(lastCall(onFilterChange).pgrQuery).toMatchObject({ assetType: "MACHINE" });
    });

    it("removes the code from pgrQuery when the same option is clicked again", async () => {
      const user = userEvent.setup();
      const { onFilterChange } = renderFilter();
      await openDesktopFilters(user);

      await user.click(screen.getByText("MACHINE"));
      await user.click(screen.getByText("MACHINE"));

      expect(lastCall(onFilterChange).pgrQuery?.assetType).toBeUndefined();
    });

    it("keeps one category's selection untouched while another category is changed", async () => {
      const user = userEvent.setup();
      const { onFilterChange } = renderFilter();
      await openDesktopFilters(user);

      await user.click(screen.getByText("MACHINE"));
      await user.click(screen.getByRole("button", { name: "State" }));
      await user.click(screen.getByText("ST1"));

      expect(lastCall(onFilterChange).pgrQuery).toMatchObject({
        assetType: "MACHINE",
        state: "ST1",
      });
    });
  });

  describe("Ticket Status category", () => {
    it("toggles a status code in and out of pgrQuery", async () => {
      const user = userEvent.setup();
      const { onFilterChange } = renderFilter();
      await openDesktopFilters(user);
      await user.click(screen.getByRole("button", { name: "Ticket Status" }));

      await user.click(screen.getByText("RESOLVED"));
      expect(lastCall(onFilterChange).pgrQuery).toMatchObject({ applicationStatus: "RESOLVED" });

      await user.click(screen.getByText("RESOLVED"));
      expect(lastCall(onFilterChange).pgrQuery?.applicationStatus).toBeUndefined();
    });
  });

  describe("category search", () => {
    it("narrows visible options to the search text", async () => {
      const user = userEvent.setup();
      renderFilter();
      await openDesktopFilters(user);

      await user.type(screen.getByPlaceholderText("Search"), "mach");

      expect(screen.getByText("MACHINE")).toBeInTheDocument();
      expect(screen.queryByText("SOLAR")).not.toBeInTheDocument();
    });

    it("shows a no-options message when nothing matches", async () => {
      const user = userEvent.setup();
      renderFilter();
      await openDesktopFilters(user);

      await user.type(screen.getByPlaceholderText("Search"), "zzz-no-match");

      expect(screen.getByText("No options found")).toBeInTheDocument();
    });
  });

  describe("assignedTo", () => {
    it("defaults to All Tickets and switches wfQuery.assignee to the signed-in user's uuid on My Tickets", async () => {
      const user = userEvent.setup();
      const { onFilterChange } = renderFilter();
      expect(screen.getByRole("radio", { name: "All Tickets" })).toBeChecked();

      await user.click(screen.getByRole("radio", { name: "My Tickets" }));

      expect(lastCall(onFilterChange).wfQuery).toMatchObject({ assignee: "user-1" });
    });

    it("switches back to All Tickets, clearing the assignee filter", async () => {
      const user = userEvent.setup();
      const { onFilterChange } = renderFilter();
      await user.click(screen.getByRole("radio", { name: "My Tickets" }));

      await user.click(screen.getByRole("radio", { name: "All Tickets" }));

      expect(lastCall(onFilterChange).wfQuery?.assignee).toBeUndefined();
    });

    // Documents current behavior: buildDefaultInboxRoleFilters scopes an
    // assignee-restricted role (e.g. COMPLAINT_RESOLVER) to "My Tickets" by
    // default, but the assignedTo radio's own initial state only looks at
    // searchParams.filters (not at that role-based default), so it always
    // starts on "All Tickets" — and the effect that syncs wfFilters from the
    // radio then overwrites the role-scoped default with an empty assignee
    // right after mount, discarding it.
    it("BUG: discards the role-scoped 'My Tickets' default for an assignee-scoped role, showing All Tickets instead", () => {
      useAuthStore.setState({ user: { uuid: "user-1", roles: [{ code: "COMPLAINT_RESOLVER" }] } });
      renderFilter();

      expect(screen.getByRole("radio", { name: "All Tickets" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "My Tickets" })).not.toBeChecked();
    });
  });

  describe("clear all filters", () => {
    it("is disabled when nothing is selected", () => {
      renderFilter();
      expect(screen.getByRole("button", { name: "clear all filters" })).toBeDisabled();
    });

    it("is enabled once a filter is selected, and resets everything when clicked", async () => {
      const user = userEvent.setup();
      const { onFilterChange } = renderFilter();
      await openDesktopFilters(user);
      await user.click(screen.getByText("MACHINE"));

      const clearButton = screen.getByRole("button", { name: "clear all filters" });
      expect(clearButton).toBeEnabled();

      await user.click(clearButton);

      expect(clearButton).toBeDisabled();
      expect(lastCall(onFilterChange).pgrQuery).toEqual({});
    });

    it("is enabled when only the assignedTo radio is switched to My Tickets", async () => {
      const user = userEvent.setup();
      renderFilter();

      await user.click(screen.getByRole("radio", { name: "My Tickets" }));

      expect(screen.getByRole("button", { name: "clear all filters" })).toBeEnabled();
    });
  });

  describe("mobile filter sheet", () => {
    function getMobileTrigger() {
      return screen.getAllByRole("button").find((button) => button.textContent === "")!;
    }

    it("opens as a dialog with category tabs and Apply/Clear actions, closing on Apply without resetting selections", async () => {
      const user = userEvent.setup();
      const { onFilterChange } = renderFilter();

      await user.click(getMobileTrigger());
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("MACHINE")).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Apply filters" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "clear all filters" })).toBeInTheDocument();

      await user.click(within(dialog).getByText("MACHINE"));
      await user.click(screen.getByRole("button", { name: "Apply filters" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(lastCall(onFilterChange).pgrQuery).toMatchObject({ assetType: "MACHINE" });
    });

    it("resets and closes when Clear all filters is clicked inside the sheet", async () => {
      const user = userEvent.setup();
      const { onFilterChange } = renderFilter();

      await user.click(getMobileTrigger());
      const dialog = screen.getByRole("dialog");
      await user.click(within(dialog).getByText("MACHINE"));

      await user.click(within(dialog).getByRole("button", { name: "clear all filters" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(lastCall(onFilterChange).pgrQuery).toEqual({});
    });
  });
});
