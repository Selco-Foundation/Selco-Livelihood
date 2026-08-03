/**
 * Unit tests for `DesktopInbox`, the desktop/tablet inbox view that renders one of four
 * mutually-exclusive states based on `isLoading` / `data` / `totalRecords`: a loading skeleton,
 * an empty-state message ("No Tickets Found"), the results table + mobile list, or an
 * error-loading message when `data` is undefined. It also conditionally renders `InboxPagination`
 * only when `totalRecords > 0`.
 *
 * Testing approach:
 * - `DesktopInbox` is mounted inside `RouterProvider` + `QueryClientProvider` +
 *   `I18nextProvider` because its child `InboxFilter` relies on the router (for filter state)
 *   and react-query (for boundary/facility/asset-type lookups) via context, so a bare `render()`
 *   of the component alone would throw.
 * - `boundaryApi.fetchBoundaryRelations`, `facilityApi.fetchFacilities`, and
 *   `mdmsService.fetchAssetTypes` are mocked to resolve empty data so `InboxFilter`'s internal
 *   queries settle immediately without hitting real network/services.
 * - An isolated i18next instance with empty translation resources is created per test so that
 *   `translateOr` falls back to its default English strings (e.g. "No Tickets Found"), letting
 *   assertions match on that fallback text.
 * - Auth state is seeded/reset per test since `InboxFilter`/jurisdiction lookups expect an
 *   authenticated session and a clean jurisdiction store.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { useJurisdictionStore } from "@/shared";
import * as boundaryApi from "@/shared/api/boundary";
import * as facilityApi from "@/shared/api/facility";
import * as mdmsService from "../../services/mdms";
import type { InboxDataResult } from "../../types/inbox";
import { DesktopInbox } from "./DesktopInbox";

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

function renderInbox(props: {
  data?: InboxDataResult;
  isLoading: boolean;
  totalRecords?: number;
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({
    component: () => (
      <DesktopInbox
        data={props.data}
        isLoading={props.isLoading}
        onFilterChange={vi.fn()}
        searchParams={{}}
        onNextPage={vi.fn()}
        onPrevPage={vi.fn()}
        currentPage={0}
        totalRecords={props.totalRecords ?? 0}
        pageSizeLimit={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    ),
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

beforeEach(() => {
  seedAuthenticatedSession();
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
  vi.spyOn(boundaryApi, "fetchBoundaryRelations").mockResolvedValue({});
  vi.spyOn(facilityApi, "fetchFacilities").mockResolvedValue({ facilities: [], total: 0 });
  vi.spyOn(mdmsService, "fetchAssetTypes").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
});

describe("DesktopInbox", () => {
  // `isLoading` takes priority over every other prop: while true, DesktopInbox renders the
  // `InboxFilter` plus a skeleton card and skips the empty/error/results branches entirely.
  it("shows a loading skeleton while isLoading is true", async () => {
    const { container } = renderInbox({ isLoading: true });
    // Wait for the filter panel (always rendered) before asserting on the skeleton, so the
    // query below doesn't race the initial render.
    await screen.findByText("Filters", {}, { timeout: 3000 });
    expect(container.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  // When loading finishes and `data.combinedRes` is an empty array (as opposed to `data` being
  // undefined), the component shows the "nothing to show" empty state rather than the
  // error-loading state -- this distinguishes "successful fetch, no rows" from "fetch failed".
  it("shows the empty-state message when data resolves with zero rows", async () => {
    renderInbox({ isLoading: false, data: { combinedRes: [], total: 0, statusArray: [] } });
    expect(await screen.findByText("No Tickets Found")).toBeInTheDocument();
  });

  // With at least one row in `combinedRes`, the desktop table (`ComplaintTable`) and the
  // responsive mobile list (`MobileComplaintList`) are both rendered (one is hidden via CSS
  // depending on viewport), so the same row data appears twice in the DOM -- hence
  // `findAllByText` rather than `findByText`.
  it("shows the results table when data has rows", async () => {
    renderInbox({
      isLoading: false,
      data: {
        combinedRes: [
          {
            incidentId: "INC-1",
            incidentType: "streetlight",
            assetLabel: "-",
            status: "PENDING_FOR_RESOLUTION",
            taskOwner: "-",
            sla: "-",
            endUser: "-",
            tenantId: "livelihood",
            potentialDuplicate: false,
          },
        ],
        total: 1,
        statusArray: [],
      },
    });
    expect((await screen.findAllByText("INC-1")).length).toBeGreaterThan(0);
  });

  // `data` being `undefined` (fetch never resolved / errored) is treated differently from an
  // empty `combinedRes` array: it falls through to the final else-branch and shows the
  // "unable to load results" error message instead of the empty-state message.
  it("shows the error-loading message when data is undefined and not loading", async () => {
    renderInbox({ isLoading: false, data: undefined });
    expect(await screen.findByText("Unable to load results")).toBeInTheDocument();
  });

  // `InboxPagination` is only rendered when `totalRecords > 0`; with `totalRecords: 0` (and no
  // `data`, so the error-loading branch also renders) pagination controls must be absent.
  it("hides pagination when totalRecords is 0", async () => {
    renderInbox({ isLoading: false, totalRecords: 0 });
    await screen.findByText("Unable to load results", {}, { timeout: 3000 });
    expect(screen.queryByText("Items per Page")).not.toBeInTheDocument();
  });

  // A positive `totalRecords` (independent of whether `combinedRes` has rows) is the sole
  // condition that gates rendering `InboxPagination`, so pagination controls should appear.
  it("renders pagination when totalRecords is positive", async () => {
    renderInbox({
      isLoading: false,
      totalRecords: 25,
      data: { combinedRes: [], total: 0, statusArray: [] },
    });
    expect(await screen.findByText("Items per Page")).toBeInTheDocument();
  });
});
