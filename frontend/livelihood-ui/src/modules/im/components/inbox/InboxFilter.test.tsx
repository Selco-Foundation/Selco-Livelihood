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

describe("InboxFilter", () => {
  it("calls onFilterChange with the flattened query on mount", async () => {
    const onFilterChange = vi.fn();
    renderFilter({}, onFilterChange);

    await waitFor(() => expect(onFilterChange).toHaveBeenCalled());
    const call = onFilterChange.mock.calls[0][0];
    expect(call).toHaveProperty("pgrQuery");
    expect(call).toHaveProperty("wfQuery");
  });

  it("defaults the assigned-to radio to 'All Tickets' when the assignee doesn't match the current user", async () => {
    renderFilter({ wfFilters: { assignee: [{ code: "someone-else" }] } });
    expect(await screen.findByRole("radio", { name: "All Tickets" })).toBeChecked();
  });

  it("defaults the assigned-to radio to 'My Tickets' when the assignee matches the current user", async () => {
    renderFilter({ wfFilters: { assignee: [{ code: "user-uuid-1" }] } });
    expect(await screen.findByRole("radio", { name: "My Tickets" })).toBeChecked();
  });

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

  it("opens the desktop filter popover showing the default Asset Type category", async () => {
    const user = userEvent.setup();
    renderFilter();

    await openDesktopFilters(user);

    expect(await screen.findByText("STREETLIGHT")).toBeInTheDocument();
    expect(screen.getByText("WATER_PUMP")).toBeInTheDocument();
  });

  it("shows geo filter categories (State/District/Block) for non-end-user roles", async () => {
    const user = userEvent.setup();
    renderFilter();

    await openDesktopFilters(user);

    expect(await screen.findByText("State")).toBeInTheDocument();
    expect(screen.getByText("District")).toBeInTheDocument();
    expect(screen.getByText("Block")).toBeInTheDocument();
  });

  it("hides geo filter categories for an end user", async () => {
    seedAuthenticatedSession({ roles: [{ code: "EMPLOYEE" }] });
    const user = userEvent.setup();
    renderFilter();

    await openDesktopFilters(user);
    await screen.findByText("STREETLIGHT");

    expect(screen.queryByText("State")).not.toBeInTheDocument();
  });

  it("filters the visible options by the search box (case-insensitive)", async () => {
    const user = userEvent.setup();
    renderFilter();

    await openDesktopFilters(user);
    await screen.findByText("STREETLIGHT");
    await user.type(screen.getByPlaceholderText("Search"), "water");

    expect(screen.getByText("WATER_PUMP")).toBeInTheDocument();
    expect(screen.queryByText("STREETLIGHT")).not.toBeInTheDocument();
  });

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

  it("shows 'clear all filters' as disabled when there are no active filters", async () => {
    renderFilter();
    const clearButtons = await screen.findAllByRole("button", { name: /clear all filters/i });
    expect(clearButtons.some((button) => button.hasAttribute("disabled"))).toBe(true);
  });

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
