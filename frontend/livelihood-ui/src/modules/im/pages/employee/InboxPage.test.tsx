/**
 * Unit tests for InboxPage (src/modules/im/pages/employee/InboxPage.tsx).
 *
 * InboxPage is a route-level container: it reads the current route's search
 * params (`filter`, `pageOffset`, `pageSize`, `nearing`), derives the params
 * handed to `useImInboxData`, and turns DesktopInbox's callback props
 * (filter/page/page-size changes) into `navigate({ search, replace: true })`
 * calls that rewrite those same search params. This file exercises exactly
 * that orchestration:
 *   - search-param defaults (role-based default filters, pageOffset/pageSize
 *     defaults, the `nearing === "1"` -> `nearingSLA: true` toggle)
 *   - pagination math (currentPage = floor(pageOffset/pageSize), next/prev/
 *     page-change/page-size-change offset arithmetic, the `Math.max(0, ...)`
 *     clamp on "previous")
 *   - the deliberate "only reset the page on a *genuine* filter change" rule:
 *     handleFilterChange resets pageOffset to 0 only when
 *     `JSON.stringify(nextFilters) !== JSON.stringify(filters)` — see the
 *     inline comment in InboxPage.tsx explaining this guards against
 *     InboxFilter's mount-time effect firing (with unchanged filters) on
 *     every reload and unexpectedly snapping back to page 1
 *   - the `canCreateIncident`-gated "Raise New Ticket" affordance
 *
 * Testing approach:
 *   - A *real* TanStack Router (createMemoryHistory + createRootRoute +
 *     createRoute), not the `renderWithProviders` helper's single-root-route
 *     mode, because these tests need a route whose `validateSearch` parses a
 *     URL-encoded `filter`/`pageOffset`/`pageSize`/`nearing` and whose
 *     `navigate()` calls are real enough to inspect via
 *     `router.state.location.search` after each interaction. The
 *     `validateSearch` used here is a colocated copy of the production
 *     `inboxRoute`'s (src/modules/im/routes.tsx) — that function's own
 *     coercion/default rules are already unit-tested in routes.test.ts, so
 *     it's only reproduced here to build a realistic search-driven harness.
 *   - `DesktopInbox` is replaced with a tiny stub (via `vi.mock`) that
 *     re-exposes its callback props as buttons and its numeric props as
 *     text. DesktopInbox itself renders a filter panel, table and pagination
 *     bar wired to several other API modules (boundary/facility/mdms/asset
 *     search) that are irrelevant to InboxPage's own logic and are already
 *     covered by DesktopInbox.test.tsx / InboxFilter.test.tsx — stubbing it
 *     keeps this file focused on the container, not its heaviest child.
 *   - `useImInboxData` (src/modules/im/hooks/use-im-inbox-summary.ts) is
 *     mocked directly via `vi.spyOn`, rather than mocking the underlying
 *     `searchInbox` service call. This is a deliberate exception to the
 *     "mock the service, not the hook" convention used elsewhere in this
 *     module (see ImOverview.test.tsx, InboxFilter.test.tsx): the hook
 *     *is* the exact integration boundary InboxPage owns — verifying the
 *     request-shape it builds internally (flattenInboxFilters, jurisdiction
 *     merging, etc.) is that hook's own concern and is already covered by
 *     use-im-inbox-data.test.tsx. Mocking at the hook boundary lets these
 *     tests assert precisely on the `{ filters, limit, offset, nearingSLA? }`
 *     object InboxPage computes and hands off, and on how it forwards the
 *     hook's `{ data, isLoading }` back down to DesktopInbox.
 *   - `fetchLanguages` (used transitively by the real `LanguageSwitcher` in
 *     the page header) is mocked to resolve `[]` purely to avoid an
 *     unmocked network call; the language switcher's own behavior is
 *     covered by LanguageSwitcher.test.tsx.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import * as mdmsApi from "@/shared/api/mdms";
import { buildDefaultInboxRoleFilters } from "../../hooks/inbox-defaults";
// InboxPage imports `useImInboxData` from the `use-im-inbox-summary` barrel,
// which merely re-exports it from `use-im-inbox-data` (see that file: `export
// { useImInboxData, ... } from "./use-im-inbox-data"`). Vitest's `vi.spyOn`
// patches the property on a module's own namespace object; spying on the
// barrel's re-exported binding does NOT intercept calls made through it,
// because the barrel never owns the binding, it just forwards to the
// defining module. Spying on `use-im-inbox-data` directly (the module that
// actually declares `function useImInboxData`) is what's required for the
// mock to take effect here.
import * as inboxDataHookModule from "../../hooks/use-im-inbox-data";
import type { InboxRouteSearch } from "../../routes";
import type { ImInboxFilters, InboxDataResult } from "../../types/inbox";
import { InboxPage } from "./InboxPage";

// Captured by the DesktopInbox stub below on every render so tests can read
// the props InboxPage most recently passed down (and invoke its callbacks).
const desktopInboxSpy = vi.hoisted(() => ({
  latestProps: undefined as
    | {
        data?: InboxDataResult;
        isLoading: boolean;
        onFilterChange: (filters: ImInboxFilters) => void;
        totalRecords: number;
        pageSizeLimit: number;
        currentPage: number;
        onNextPage: () => void;
        onPrevPage: () => void;
        onPageChange: (page: number) => void;
        onPageSizeChange: (size: number) => void;
      }
    | undefined,
}));

// Stubbed in place of the real DesktopInbox (see top-of-file comment for why):
// re-exposes its callback props as clickable buttons and its numeric/loading
// props as plain text so tests can assert on exactly what InboxPage computed
// and forwarded, without exercising DesktopInbox's own (separately-tested)
// filter/table/pagination internals.
vi.mock("../../components/inbox/DesktopInbox", () => ({
  DesktopInbox: (props: {
    data?: InboxDataResult;
    isLoading: boolean;
    onFilterChange: (filters: ImInboxFilters) => void;
    totalRecords: number;
    pageSizeLimit: number;
    currentPage: number;
    onNextPage: () => void;
    onPrevPage: () => void;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  }) => {
    desktopInboxSpy.latestProps = props;
    return (
      <div data-testid="desktop-inbox-stub">
        <span data-testid="current-page">{props.currentPage}</span>
        <span data-testid="total-records">{props.totalRecords}</span>
        <span data-testid="page-size-limit">{props.pageSizeLimit}</span>
        <span data-testid="is-loading">{String(props.isLoading)}</span>
        <button onClick={props.onNextPage}>Next Page</button>
        <button onClick={props.onPrevPage}>Prev Page</button>
        <button onClick={() => props.onPageChange(3)}>Go To Page 3</button>
        <button onClick={() => props.onPageSizeChange(25)}>Change Page Size</button>
      </div>
    );
  },
}));

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

// Colocated copy of the production `inboxRoute`'s validateSearch
// (src/modules/im/routes.tsx) — its own default/coercion rules are already
// unit-tested in routes.test.ts. Reproduced here only so this harness's
// route parses a `filter`/`pageOffset`/`pageSize`/`nearing` URL the same way
// the real app does, which is what makes `router.state.location.search`
// after a navigate() a trustworthy assertion target below.
function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validateSearch(search: Record<string, unknown>): InboxRouteSearch {
  return {
    filter:
      search.filter && typeof search.filter === "object"
        ? (search.filter as ImInboxFilters)
        : undefined,
    pageOffset: toFiniteNumber(search.pageOffset, 0),
    pageSize: toFiniteNumber(search.pageSize, 10),
    nearing:
      search.nearing === undefined || search.nearing === null
        ? undefined
        : String(search.nearing),
  };
}

// Builds a memory-history href whose query string round-trips through the
// router's default JSON-per-value search codec the same way a real
// `navigate({ search })` call would encode it.
function buildSearchHref(search: {
  filter?: ImInboxFilters;
  pageOffset?: number;
  pageSize?: number;
  nearing?: string;
}) {
  const params = new URLSearchParams();
  if (search.filter !== undefined) {
    params.set("filter", JSON.stringify(search.filter));
  }
  if (search.pageOffset !== undefined) {
    params.set("pageOffset", String(search.pageOffset));
  }
  if (search.pageSize !== undefined) {
    params.set("pageSize", String(search.pageSize));
  }
  if (search.nearing !== undefined) {
    params.set("nearing", search.nearing);
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function renderInboxPage(options: {
  initialSearch?: {
    filter?: ImInboxFilters;
    pageOffset?: number;
    pageSize?: number;
    nearing?: string;
  };
  hookResult?: { data?: InboxDataResult; isLoading?: boolean };
} = {}) {
  const { initialSearch = {}, hookResult = {} } = options;

  vi.spyOn(inboxDataHookModule, "useImInboxData").mockReturnValue({
    data: hookResult.data,
    isLoading: hookResult.isLoading ?? false,
  } as unknown as ReturnType<typeof inboxDataHookModule.useImInboxData>);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const inboxRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    validateSearch,
    component: InboxPage,
  });
  const routeTree = rootRoute.addChildren([inboxRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [buildSearchHref(initialSearch)] }),
  });

  const utils = render(
    <I18nextProvider i18n={createTestI18n()}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nextProvider>,
  );

  return { ...utils, router };
}

beforeEach(() => {
  vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
  desktopInboxSpy.latestProps = undefined;
});

// InboxPage builds `inboxParams` (the object handed to useImInboxData) from
// the route's search: `filters = search.filter ?? defaultFilters`,
// `limit = search.pageSize ?? 10`, `offset = search.pageOffset ?? 0`, plus a
// conditionally-spread `nearingSLA: true` when `search.nearing === "1"`.
describe("InboxPage search-param derived data-hook params", () => {
  it("uses the role-based default filters when the URL has no filter", async () => {
    // COMPLAINANT is not an assignee-scoped role (see utils/access.ts), so
    // buildDefaultInboxRoleFilters should produce the generic empty-filter
    // shape rather than one scoped to the user's own uuid.
    const user = seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
    renderInboxPage();
    await screen.findByTestId("desktop-inbox-stub");

    const lastCall = vi.mocked(inboxDataHookModule.useImInboxData).mock.calls.at(-1)!;
    expect(lastCall[0].filters).toEqual(buildDefaultInboxRoleFilters(user));
    expect(lastCall[0].limit).toBe(10);
    expect(lastCall[0].offset).toBe(0);
    expect(lastCall[0]).not.toHaveProperty("nearingSLA");
  });

  it("scopes the default filter's assignee to the user's own uuid for an assignee-scoped role", async () => {
    // LIVELIHOOD_VENDOR is assignee-scoped (isAssigneeScopedUser), so the
    // default filter should pin wfFilters.assignee to this user's uuid.
    const user = seedAuthenticatedSession({
      uuid: "vendor-uuid-1",
      roles: [{ code: "LIVELIHOOD_VENDOR" }],
    });
    renderInboxPage();
    await screen.findByTestId("desktop-inbox-stub");

    const lastCall = vi.mocked(inboxDataHookModule.useImInboxData).mock.calls.at(-1)!;
    expect(lastCall[0].filters).toEqual(buildDefaultInboxRoleFilters(user));
    expect(lastCall[0].filters?.wfFilters?.assignee).toEqual([{ code: "vendor-uuid-1" }]);
  });

  it("prefers the filter already present in the URL over the role default", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
    const urlFilter: ImInboxFilters = { pgrQuery: { state: "S1" } };
    renderInboxPage({ initialSearch: { filter: urlFilter } });
    await screen.findByTestId("desktop-inbox-stub");

    const lastCall = vi.mocked(inboxDataHookModule.useImInboxData).mock.calls.at(-1)!;
    expect(lastCall[0].filters).toEqual(urlFilter);
  });

  it("reads limit/offset from pageSize/pageOffset in the URL", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
    renderInboxPage({ initialSearch: { pageOffset: 40, pageSize: 20 } });
    await screen.findByTestId("desktop-inbox-stub");

    const lastCall = vi.mocked(inboxDataHookModule.useImInboxData).mock.calls.at(-1)!;
    expect(lastCall[0].limit).toBe(20);
    expect(lastCall[0].offset).toBe(40);
  });

  it("adds nearingSLA: true to the hook params only when search.nearing is exactly '1'", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
    renderInboxPage({ initialSearch: { nearing: "1" } });
    await screen.findByTestId("desktop-inbox-stub");

    const lastCall = vi.mocked(inboxDataHookModule.useImInboxData).mock.calls.at(-1)!;
    expect(lastCall[0].nearingSLA).toBe(true);
  });

  it("omits nearingSLA entirely (not just false) when search.nearing is any other value", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
    renderInboxPage({ initialSearch: { nearing: "0" } });
    await screen.findByTestId("desktop-inbox-stub");

    const lastCall = vi.mocked(inboxDataHookModule.useImInboxData).mock.calls.at(-1)!;
    expect(lastCall[0]).not.toHaveProperty("nearingSLA");
  });
});

// InboxPage derives `currentPage = Math.floor(pageOffset / pageSize)` for
// DesktopInbox, and turns its onNextPage/onPrevPage/onPageChange/
// onPageSizeChange callbacks into `goToOffset`/pageSize navigations that
// rewrite `pageOffset`/`pageSize` in the URL (via `replace: true`).
describe("InboxPage pagination math", () => {
  beforeEach(() => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
  });

  it("derives currentPage as floor(pageOffset / pageSize)", async () => {
    // 25 / 10 = 2.5 -> floor -> 2 (not rounded to 3).
    renderInboxPage({ initialSearch: { pageOffset: 25, pageSize: 10 } });
    expect(await screen.findByTestId("current-page")).toHaveTextContent("2");
  });

  it("advances to the next page by adding pageSize to pageOffset", async () => {
    const user = userEvent.setup();
    const { router } = renderInboxPage({ initialSearch: { pageOffset: 10, pageSize: 10 } });
    await screen.findByTestId("desktop-inbox-stub");

    await user.click(screen.getByRole("button", { name: "Next Page" }));

    await waitFor(() => expect(router.state.location.search.pageOffset).toBe(20));
    expect(await screen.findByTestId("current-page")).toHaveTextContent("2");
  });

  it("clamps the previous page at offset 0 instead of going negative", async () => {
    // pageOffset(5) - pageSize(10) would be -5; goToOffset's
    // `Math.max(0, nextOffset)` clamp must floor it at 0.
    const user = userEvent.setup();
    const { router } = renderInboxPage({ initialSearch: { pageOffset: 5, pageSize: 10 } });
    await screen.findByTestId("desktop-inbox-stub");

    await user.click(screen.getByRole("button", { name: "Prev Page" }));

    await waitFor(() => expect(router.state.location.search.pageOffset).toBe(0));
  });

  it("jumps directly to a page via onPageChange(page) => offset = page * pageSize", async () => {
    const user = userEvent.setup();
    const { router } = renderInboxPage({ initialSearch: { pageOffset: 0, pageSize: 10 } });
    await screen.findByTestId("desktop-inbox-stub");

    // Stub's "Go To Page 3" button calls onPageChange(3); with pageSize 10
    // that should land on offset 30.
    await user.click(screen.getByRole("button", { name: "Go To Page 3" }));

    await waitFor(() => expect(router.state.location.search.pageOffset).toBe(30));
    expect(await screen.findByTestId("current-page")).toHaveTextContent("3");
  });

  it("resets pageOffset to 0 when the page size changes", async () => {
    const user = userEvent.setup();
    const { router } = renderInboxPage({ initialSearch: { pageOffset: 40, pageSize: 10 } });
    await screen.findByTestId("desktop-inbox-stub");

    // Stub's "Change Page Size" button calls onPageSizeChange(25).
    await user.click(screen.getByRole("button", { name: "Change Page Size" }));

    await waitFor(() => expect(router.state.location.search.pageSize).toBe(25));
    expect(router.state.location.search.pageOffset).toBe(0);
  });
});

// handleFilterChange writes the new filter into the URL and decides whether
// to also reset pageOffset to 0, based on
// `JSON.stringify(nextFilters) !== JSON.stringify(filters)`. The source
// comment explains why: InboxFilter's state-combining effect fires once on
// every mount (including on reload) even when the filters didn't actually
// change, so resetting on every call would always snap a reloaded page back
// to page 1.
describe("InboxPage handleFilterChange - genuine-change diff", () => {
  beforeEach(() => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
  });

  it("resets pageOffset to 0 when the new filters are structurally different", async () => {
    const initialFilter: ImInboxFilters = { pgrQuery: { state: "S1" } };
    const { router } = renderInboxPage({
      initialSearch: { filter: initialFilter, pageOffset: 20, pageSize: 10 },
    });
    await screen.findByTestId("desktop-inbox-stub");

    const nextFilter: ImInboxFilters = { pgrQuery: { state: "S2" } };
    await act(async () => {
      desktopInboxSpy.latestProps!.onFilterChange(nextFilter);
    });

    await waitFor(() => expect(router.state.location.search.filter).toEqual(nextFilter));
    expect(router.state.location.search.pageOffset).toBe(0);
  });

  it("preserves the existing pageOffset when the new filters are a structurally identical new object", async () => {
    // This is the exact scenario the source comment calls out: InboxFilter
    // re-supplies a *new* filters object with the same JSON shape on mount
    // (e.g. after a page reload) — pageOffset must NOT be reset in that case.
    const initialFilter: ImInboxFilters = { pgrQuery: { state: "S1" } };
    const { router } = renderInboxPage({
      initialSearch: { filter: initialFilter, pageOffset: 20, pageSize: 10 },
    });
    await screen.findByTestId("desktop-inbox-stub");

    const sameShapeNewReference: ImInboxFilters = { pgrQuery: { state: "S1" } };
    expect(sameShapeNewReference).not.toBe(initialFilter);

    await act(async () => {
      desktopInboxSpy.latestProps!.onFilterChange(sameShapeNewReference);
    });

    await waitFor(() =>
      expect(router.state.location.search.filter).toEqual(sameShapeNewReference),
    );
    expect(router.state.location.search.pageOffset).toBe(20);
  });

  it("preserves pageOffset when the new filters match the role-based default (no filter was in the URL)", async () => {
    const user = seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
    const { router } = renderInboxPage({ initialSearch: { pageOffset: 15, pageSize: 10 } });
    await screen.findByTestId("desktop-inbox-stub");

    const defaultShapedFilter = buildDefaultInboxRoleFilters(user);
    await act(async () => {
      desktopInboxSpy.latestProps!.onFilterChange(defaultShapedFilter);
    });

    await waitFor(() =>
      expect(router.state.location.search.filter).toEqual(defaultShapedFilter),
    );
    expect(router.state.location.search.pageOffset).toBe(15);
  });
});

// canCreateIncident(user?.roles) gates the "Raise New Ticket" button/link
// (rendered once in the desktop header, once in the mobile header — both
// exist in the DOM simultaneously in jsdom since the `hidden lg:block` /
// `lg:hidden` responsive classes aren't applied by any real layout engine).
describe("InboxPage Raise New Ticket visibility", () => {
  it("shows Raise New Ticket for a role allowed to create incidents (COMPLAINANT)", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
    renderInboxPage();

    const links = await screen.findAllByText("Raise New Ticket");
    expect(links.length).toBe(2);
  });

  it("hides Raise New Ticket for a role that cannot create incidents (LIVELIHOOD_VENDOR)", async () => {
    seedAuthenticatedSession({ roles: [{ code: "LIVELIHOOD_VENDOR" }] });
    renderInboxPage();

    // "All Tickets" renders twice (desktop + mobile PageHeader instances, both
    // present in jsdom simultaneously since responsive `hidden lg:block` /
    // `lg:hidden` classes aren't applied by any real layout engine here), so
    // `findByText` (which requires a single match) is the wrong query -- use
    // `findAllByText` to just wait for the page to have rendered.
    await screen.findAllByText("All Tickets");
    expect(screen.queryByText("Raise New Ticket")).not.toBeInTheDocument();
  });
});

// InboxPage forwards useImInboxData's result almost verbatim: `totalRecords`
// defaults to 0 via `complaints?.total ?? 0`, and `isLoading` passes through
// unchanged.
describe("InboxPage forwarding of the data hook's result", () => {
  beforeEach(() => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
  });

  it("defaults totalRecords to 0 when the hook's data is undefined", async () => {
    renderInboxPage({ hookResult: { data: undefined } });
    expect(await screen.findByTestId("total-records")).toHaveTextContent("0");
  });

  it("passes through the hook's data.total as totalRecords", async () => {
    renderInboxPage({
      hookResult: { data: { combinedRes: [], total: 42, statusArray: [] } },
    });
    expect(await screen.findByTestId("total-records")).toHaveTextContent("42");
  });

  it("forwards isLoading: true from the hook to DesktopInbox", async () => {
    renderInboxPage({ hookResult: { isLoading: true } });
    expect(await screen.findByTestId("is-loading")).toHaveTextContent("true");
  });
});
