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
import * as mdmsApi from "@/shared/api/mdms";
import * as inboxService from "../services/inbox";
import * as facilityApi from "@/shared/api/facility";
import * as assetService from "../services/asset-search";
import { ImOverview } from "./ImOverview";

/**
 * Unit tests for `ImOverview`, the IM (Incident Management) module landing
 * page shown to authenticated users.
 *
 * The component gates its entire output on the current user's roles
 * (`hasImAccess`), so most tests seed a role via `seedAuthenticatedSession`
 * and then assert on what is/isn't rendered. It also depends on:
 *  - `useImInboxSummary` / `useEndUserAssets` (React Query hooks that hit
 *    `inboxService.searchInbox`, `facilityApi.fetchFacilities`, and
 *    `assetService.searchAssetsForFacility`) — these network calls are
 *    stubbed with `vi.spyOn` in `beforeEach` so tests never hit real APIs
 *    and always resolve to an empty/loading-free state.
 *  - `useTranslate`/`translateOr` for i18n — a real (but empty-resource)
 *    i18next instance is wired up via `I18nextProvider` so `translateOr`'s
 *    fallback strings (e.g. "Welcome", "Raise New Ticket") are what render,
 *    letting assertions match on plain English text.
 *  - `@tanstack/react-router`'s `Link`/`RouterProvider` — a minimal memory
 *    router with a single root route is created per test so the component's
 *    `<Link>` usage doesn't throw for lack of routing context.
 *  - `useJurisdictionStore` — reset in `beforeEach`/`afterEach` so state
 *    doesn't leak between tests that indirectly trigger jurisdiction-aware
 *    hooks.
 */
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

function renderOverview() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <ImOverview /> });
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
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
  vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([]);
  vi.spyOn(inboxService, "searchInbox").mockResolvedValue({ items: [], totalCount: 0 });
  vi.spyOn(facilityApi, "fetchFacilities").mockResolvedValue({ facilities: [], total: 0 });
  vi.spyOn(assetService, "searchAssetsForFacility").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
});

/**
 * `ImOverview` renders the IM landing page: a welcome header (with the
 * user's display name and a language switcher), a "Raise New Ticket" button
 * gated by `canCreateIncident`, two `StatTile`s summarizing the inbox
 * (total tickets / tickets nearing SLA), and — for end users only — the
 * `EndUserAssetsList` of the user's registered assets.
 *
 * The whole component returns `null` when `hasImAccess(user?.roles)` is
 * false, so it expects an authenticated user object with a `roles` array
 * (as provided by `useAuthStore`, seeded here via `seedAuthenticatedSession`)
 * before it will render anything.
 */
describe("ImOverview", () => {
  // `hasImAccess` only allows a fixed allowlist of IM role codes; a role
  // outside that list must cause the component to render nothing at all.
  it("renders nothing when the user has no IM access", () => {
    seedAuthenticatedSession({ roles: [{ code: "SOME_OTHER_ROLE" }] });
    const { container } = renderOverview();
    expect(container).toBeEmptyDOMElement();
  });

  // `canCreateIncident` allowlists COMPLAINANT/LIVELIHOOD_POC — for these
  // roles the "Raise New Ticket" CTA (translateOr fallback text) must show.
  it("shows the Raise Ticket button for a role that can create incidents", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
    renderOverview();
    expect(await screen.findByText("Raise New Ticket")).toBeInTheDocument();
  });

  // LIVELIHOOD_VENDOR has IM access (so the page renders) but is not in
  // `canCreateIncident`'s allowlist, so the CTA must be absent even though
  // the rest of the page ("Welcome") renders normally.
  it("hides the Raise Ticket button for a role that cannot create incidents", async () => {
    seedAuthenticatedSession({ roles: [{ code: "LIVELIHOOD_VENDOR" }] });
    renderOverview();
    await screen.findByText("Welcome");
    expect(screen.queryByText("Raise New Ticket")).not.toBeInTheDocument();
  });

  // `isEndUser` treats a roles array made up solely of EMPLOYEE/COMPLAINANT
  // codes as an end user; only then is `EndUserAssetsList` mounted.
  it("shows the registered-assets list for an end user", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
    renderOverview();
    expect(await screen.findByText("My Registered Assets")).toBeInTheDocument();
  });

  // A staff-only role (LIVELIHOOD_VENDOR) fails `isEndUser`'s check, so the
  // assets list must not be rendered even though the page itself is visible.
  it("does not show the registered-assets list for a non-end-user (staff)", async () => {
    seedAuthenticatedSession({ roles: [{ code: "LIVELIHOOD_VENDOR" }] });
    renderOverview();
    await screen.findByText("Welcome");
    expect(screen.queryByText("My Registered Assets")).not.toBeInTheDocument();
  });

  // The header falls back through `user?.name ?? user?.userName ?? ""`;
  // when a name is present it must be interpolated next to "Welcome".
  it("shows the user's display name", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }], name: "Jane Doe" });
    renderOverview();
    expect(await screen.findByText(/Jane Doe/)).toBeInTheDocument();
  });
});
