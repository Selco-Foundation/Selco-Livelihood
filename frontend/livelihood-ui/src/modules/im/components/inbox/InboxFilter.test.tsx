/**
 * Unit tests for InboxFilter.
 *
 * InboxFilter renders the IM inbox's "assigned to" radios plus a desktop
 * Popover / mobile Sheet filter panel (Asset Type, and — for non-end-user
 * roles — State/District/Block/End User, plus Ticket Status). It derives its
 * filter menus from boundary/facility/asset-type data fetched over React
 * Query, prunes any child selection (district/block/facility) that falls
 * outside its currently selected parent, and reports the combined
 * pgr/workflow filter state to the parent via `onFilterChange` on every
 * change.
 *
 * Testing approach:
 * - The component is rendered through a real QueryClientProvider (so its
 *   `useBoundary`/`useFacility`/`useImAssetTypes` hooks run for real) with
 *   `boundaryApi.fetchBoundaryRelations`, `facilityApi.fetchFacilities`, and
 *   `mdmsService.fetchAssetTypes` mocked at the API-module boundary — this
 *   exercises the component's own data-shaping/pruning logic instead of
 *   stubbing it away.
 * - A real i18next instance with empty translation resources is used via
 *   I18nextProvider so `translateOr` calls fall through to their fallback
 *   English strings, giving deterministic, human-readable assertions without
 *   needing translation fixtures.
 * - Auth/jurisdiction Zustand stores are seeded per test via the shared
 *   `seedAuthenticatedSession` helper and `useJurisdictionStore.setState`,
 *   and reset in `afterEach` so tests don't leak state into one another.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { useJurisdictionStore } from "@/shared";
import * as boundaryApi from "@/shared/api/boundary";
import * as facilityApi from "@/shared/api/facility";
import * as mdmsService from "../../services/mdms";
import type { ImInboxFilters } from "../../types/inbox";
import { InboxFilter } from "./InboxFilter";

function createTestI18n() {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng: "en_IN",
    ns: ["translations"],
    defaultNS: "translations",
    resources: { en_IN: { translations: {} } },
    react: { useSuspense: false },
  });
  return instance;
}

function mockDataApis() {
  vi.spyOn(boundaryApi, "fetchBoundaryRelations").mockResolvedValue({
    states: [{ code: "S1", parentCode: "" }],
    districts: [{ code: "D1", parentCode: "S1" }],
    blocks: [{ code: "B1", parentCode: "D1" }],
    facilities: [{ code: "F1", parentCode: "B1" }],
  });
  vi.spyOn(facilityApi, "fetchFacilities").mockResolvedValue({
    facilities: [{ boundaryCode: "F1", facilityId: "fac-1" }],
    total: 1,
  });
  // InboxFilter builds each option's display name via
  // translateOr(t, `ASSETTYPE_${item.code}`, item.code) — with no matching
  // translation resource registered, it falls back to the raw code itself.
  vi.spyOn(mdmsService, "fetchAssetTypes").mockResolvedValue([
    { code: "STREETLIGHT", name: "STREETLIGHT" },
    { code: "WATER_PUMP", name: "WATER_PUMP" },
  ]);
}

function renderFilter(
  filters: ImInboxFilters = {},
  onFilterChange: (filters: ImInboxFilters) => void = vi.fn(),
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <QueryClientProvider client={queryClient}>
        <InboxFilter searchParams={{ filters }} onFilterChange={onFilterChange} />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

async function openDesktopFilters(user: ReturnType<typeof userEvent.setup>) {
  const triggers = await screen.findAllByRole("button", { name: /filters/i });
  await user.click(triggers[0]);
}

beforeEach(() => {
  seedAuthenticatedSession({ roles: [{ code: "COMPLAINT_RESOLVER" }] });
  useJurisdictionStore.setState({ boundaries: { state: ["S1"] }, hrmsUser: null });
  mockDataApis();
});

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
});

// InboxFilter (src/modules/im/components/inbox/InboxFilter.tsx) renders the
// "Assigned to me / All" radios and the desktop Popover / mobile Sheet filter
// UI, keeping pgrfilters (assetType/state/district/block/facility/
// applicationStatus) and wfFilters (assignee) as internal state seeded from
// `searchParams.filters` (falling back to `buildDefaultInboxRoleFilters(user)`
// per the signed-in user's role). Selecting a state/district/block prunes any
// child selections that fall outside the new parent's scope via
// `pruneToValidCodes`, and every state change is flattened through
// `buildFilterQueryFromState` and reported to the parent via
// `onFilterChange({ pgrQuery, wfQuery, wfFilters, pgrfilters })`.
describe("InboxFilter", () => {
  it("calls onFilterChange with the flattened query on mount", async () => {
    const onFilterChange = vi.fn();
    renderFilter({}, onFilterChange);

    await waitFor(() => expect(onFilterChange).toHaveBeenCalled());
    const call = onFilterChange.mock.calls[0][0];
    expect(call).toHaveProperty("pgrQuery");
    expect(call).toHaveProperty("wfQuery");
  });

  // InboxFilter's initial `selectAssigned` state is derived by comparing
  // `searchParams.filters.wfFilters.assignee[0].code` against the signed-in
  // user's uuid (seeded as "user-uuid-1" by seedAuthenticatedSession) — a
  // mismatch should select "All Tickets".
  it("defaults the assigned-to radio to 'All Tickets' when the assignee doesn't match the current user", async () => {
    renderFilter({ wfFilters: { assignee: [{ code: "someone-else" }] } });
    expect(await screen.findByRole("radio", { name: "All Tickets" })).toBeChecked();
  });

  // Same rule as above, but with the assignee code matching the seeded
  // user's uuid, which should select "My Tickets" instead.
  it("defaults the assigned-to radio to 'My Tickets' when the assignee matches the current user", async () => {
    renderFilter({ wfFilters: { assignee: [{ code: "user-uuid-1" }] } });
    expect(await screen.findByRole("radio", { name: "My Tickets" })).toBeChecked();
  });

  // Selecting "My Tickets" should populate wfFilters.assignee with the
  // current user's uuid (the effect that maps selectAssigned -> wfFilters),
  // whereas "All Tickets" clears it to an empty array.
  it("switches wfFilters.assignee when 'My Tickets' is selected", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderFilter({}, onFilterChange);

    await user.click(await screen.findByRole("radio", { name: "My Tickets" }));

    await waitFor(() =>
      expect(onFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          wfFilters: expect.objectContaining({ assignee: [{ code: "user-uuid-1" }] }),
        }),
      ),
    );
  });

  // `activeCategory` initializes to "assetType", so the first category shown
  // in the popover should be the mocked STREETLIGHT/WATER_PUMP options
  // without needing to click a category tab first.
  it("opens the desktop filter popover showing the default Asset Type category", async () => {
    const user = userEvent.setup();
    renderFilter();

    await openDesktopFilters(user);

    expect(await screen.findByText("STREETLIGHT")).toBeInTheDocument();
    expect(screen.getByText("WATER_PUMP")).toBeInTheDocument();
  });

  // `showGeoFilters = !isEndUser(roles)`: the seeded COMPLAINT_RESOLVER role
  // is not an end user, so the geo categories should be present alongside
  // Asset Type and Ticket Status.
  it("shows geo filter categories (State/District/Block) for non-end-user roles", async () => {
    const user = userEvent.setup();
    renderFilter();

    await openDesktopFilters(user);

    expect(await screen.findByText("State")).toBeInTheDocument();
    expect(screen.getByText("District")).toBeInTheDocument();
    expect(screen.getByText("Block")).toBeInTheDocument();
  });

  // Re-seeds the session with the EMPLOYEE role, which `isEndUser` treats as
  // an end user, so `showGeoFilters` should be false and the State category
  // (and its siblings) should be omitted from the popover's category list.
  it("hides geo filter categories for an end user", async () => {
    seedAuthenticatedSession({ roles: [{ code: "EMPLOYEE" }] });
    const user = userEvent.setup();
    renderFilter();

    await openDesktopFilters(user);
    await screen.findByText("STREETLIGHT");

    expect(screen.queryByText("State")).not.toBeInTheDocument();
  });

  // `visibleOptions` filters the active category's options by
  // `categorySearch.trim().toLowerCase()` against the option name, so typing
  // "water" (lowercase) should still match "WATER_PUMP" and exclude
  // "STREETLIGHT".
  it("filters the visible options by the search box (case-insensitive)", async () => {
    const user = userEvent.setup();
    renderFilter();

    await openDesktopFilters(user);
    await screen.findByText("STREETLIGHT");
    await user.type(screen.getByPlaceholderText("Search"), "water");

    expect(screen.getByText("WATER_PUMP")).toBeInTheDocument();
    expect(screen.queryByText("STREETLIGHT")).not.toBeInTheDocument();
  });

  // Clicking an unselected option label calls `toggleArrayFilter`, which
  // appends the option (including its display `name`) to `pgrfilters` for
  // that category, and the resulting state change should flow through to
  // `onFilterChange`.
  it("selecting an asset type checkbox updates the filter and calls onFilterChange", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderFilter({}, onFilterChange);

    await openDesktopFilters(user);
    await screen.findByText("STREETLIGHT");
    await user.click(screen.getByText("STREETLIGHT"));

    await waitFor(() =>
      expect(onFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pgrfilters: expect.objectContaining({
            assetType: [{ code: "STREETLIGHT", name: "STREETLIGHT" }],
          }),
        }),
      ),
    );
  });

  // Renders with STREETLIGHT already selected (via searchParams.filters), so
  // `toggleArrayFilter` should take the "exists" branch and filter it back
  // out of assetType rather than appending a duplicate.
  it("deselecting an already-selected option removes it", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderFilter(
      { pgrfilters: { assetType: [{ code: "STREETLIGHT", name: "STREETLIGHT" }] } },
      onFilterChange,
    );

    await openDesktopFilters(user);
    await screen.findByText("STREETLIGHT");
    await user.click(screen.getByText("STREETLIGHT"));

    await waitFor(() =>
      expect(onFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pgrfilters: expect.objectContaining({ assetType: [] }),
        }),
      ),
    );
  });

  // Ticket Status options are groups (from ORDERED_INBOX_STATUSES), each
  // covering one or more underlying status codes; `toggleStatusGroup` adds
  // all of a group's codes to `applicationStatus` at once when none are
  // selected yet (areAllStatusesSelected is false).
  it("toggles an entire status group when its checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderFilter({}, onFilterChange);

    await openDesktopFilters(user);
    await user.click(await screen.findByRole("button", { name: "Ticket Status" }));
    await user.click(screen.getByText("PENDING_FOR_RESOLUTION"));

    await waitFor(() =>
      expect(onFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pgrfilters: expect.objectContaining({
            applicationStatus: [{ code: "PENDING_FOR_RESOLUTION" }],
          }),
        }),
      ),
    );
  });

  // `hasActiveFilters` is false when every pgrfilters array is empty and
  // selectAssigned is still the default "All Tickets", so both the desktop
  // and mobile "clear all filters" buttons should render disabled.
  it("shows 'clear all filters' as disabled when there are no active filters", async () => {
    renderFilter();
    const clearButtons = await screen.findAllByRole("button", { name: /clear all filters/i });
    expect(clearButtons.some((button) => button.hasAttribute("disabled"))).toBe(true);
  });

  // With an assetType filter pre-selected, `hasActiveFilters` is true so one
  // of the (desktop/mobile) clear buttons should be enabled; clicking it
  // calls `handleClearAllFilters`, which resets pgrfilters back to the
  // role's default (empty) filters.
  it("enables 'clear all filters' once a filter is active, and resets on click", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderFilter(
      { pgrfilters: { assetType: [{ code: "STREETLIGHT", name: "STREETLIGHT" }] } },
      onFilterChange,
    );

    const clearButtons = await screen.findAllByRole("button", { name: /clear all filters/i });
    const clearButton = clearButtons.find((button) => !button.hasAttribute("disabled"))!;
    expect(clearButton).toBeTruthy();

    await user.click(clearButton);

    await waitFor(() =>
      expect(onFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pgrfilters: expect.objectContaining({ assetType: [] }),
        }),
      ),
    );
  });

  it("prunes an out-of-scope district selection when the parent state no longer includes it", async () => {
    const onFilterChange = vi.fn();
    renderFilter(
      {
        pgrfilters: {
          state: [{ code: "OTHER_STATE" }],
          district: [{ code: "D1" }],
        },
      },
      onFilterChange,
    );

    // D1's parentCode is S1, not OTHER_STATE, so it should be pruned out
    // once the state filter narrows the valid district set.
    await waitFor(() =>
      expect(onFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pgrfilters: expect.objectContaining({ district: [] }),
        }),
      ),
    );
  });
});
