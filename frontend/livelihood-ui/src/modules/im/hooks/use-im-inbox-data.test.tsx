import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import i18next from "i18next";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { useJurisdictionStore } from "@/shared";
import * as inboxService from "../services/inbox";
import * as mdmsService from "../services/mdms";
import { useImAssetTypes, useImInboxData, useImInboxSummary } from "./use-im-inbox-data";

/**
 * Unit tests for the IM inbox data hooks (`use-im-inbox-data.tsx`):
 * `useImInboxSummary`, `useImInboxData`, and `useImAssetTypes`.
 *
 * These are React Query hooks that fetch inbox/asset-type data from the
 * inbox and mdms services, gated behind an `enabled` flag derived from the
 * auth store (access token / employee tenant) and, for the inbox hooks,
 * `hasImAccess(user?.roles)`. Rather than re-testing the service layer, the
 * tests mock `searchInbox`/`fetchAssetTypes` via `vi.spyOn` and assert on:
 *  - the `enabled` gating logic (hook must NOT call the service when the
 *    user lacks IM access or an access token), and
 *  - the shape of the query's `data` once the mocked service resolves,
 *    including the jurisdiction fallback and status-count aggregation
 *    performed inside the hooks.
 *
 * `renderHook` is wrapped with a real `QueryClientProvider` (retries
 * disabled so failed/disabled queries settle immediately) and a real
 * `I18nextProvider` with an empty translation bundle, since
 * `useImInboxData` calls `useTranslate()` internally (via
 * `combineInboxResponses`) and needs a functioning i18n instance even
 * though no translated strings are asserted on here.
 *
 * Auth state is seeded/reset per test via the `seedAuthenticatedSession` /
 * `resetAuthStore` test helpers, and jurisdiction boundaries are reset in
 * `beforeEach` so tests don't leak state through the shared Zustand store.
 */
function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testI18n = i18next.createInstance();
  testI18n.use(initReactI18next).init({
    lng: "en_IN",
    ns: ["translations"],
    defaultNS: "translations",
    resources: { en_IN: { translations: {} } },
    react: { useSuspense: false },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={testI18n}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </I18nextProvider>
    );
  };
}

beforeEach(() => {
  resetAuthStore();
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
});

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
});

// useImInboxSummary: fetches a small (limit: 10) page of inbox items scoped
// by the user's role-based summary filters and the current jurisdiction
// (defaulting to {country: ["-"]} when no boundaries are set), then derives
// aggregate counts (totalCount, nearingSlaCount, resolvedCount) from the
// response's statusMap via sumStatusCounts. Requires an access token, an
// employeeTenantId, and hasImAccess(user.roles) to be enabled.
describe("useImInboxSummary", () => {
  it("is disabled (does not query) without IM access", () => {
    // "EMPLOYEE" is not one of the IM_ROLES hasImAccess checks against
    // (COMPLAINT_RESOLVER/LIVELIHOOD_POC/COMPLAINANT/LIVELIHOOD_VENDOR/VIEWER).
    seedAuthenticatedSession({ tenantId: "livelihood", roles: [{ code: "EMPLOYEE" }] });
    const searchSpy = vi.spyOn(inboxService, "searchInbox");

    renderHook(() => useImInboxSummary(), { wrapper: createWrapper() });

    expect(searchSpy).not.toHaveBeenCalled();
  });

  // resolvedCount sums counts for every status in RESOLVED_APPLICATION_STATUSES
  // (RESOLVED + CLOSED_AFTER_RESOLUTION), not just the "RESOLVED" entry, so
  // the expected value (5) is 3 + 2 while PENDING_FOR_RESOLUTION's 5 is excluded.
  it("computes resolvedCount from the resolved-status entries once enabled", async () => {
    seedAuthenticatedSession({ tenantId: "livelihood", roles: [{ code: "LIVELIHOOD_POC" }] });
    vi.spyOn(inboxService, "searchInbox").mockResolvedValue({
      items: [],
      totalCount: 10,
      nearingSlaCount: 2,
      statusMap: [
        { statusid: "RESOLVED", count: 3 },
        { statusid: "CLOSED_AFTER_RESOLUTION", count: 2 },
        { statusid: "PENDING_FOR_RESOLUTION", count: 5 },
      ],
    });

    const { result } = renderHook(() => useImInboxSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.resolvedCount).toBe(5);
    expect(result.current.data?.totalCount).toBe(10);
  });

  // The jurisdictionStore is reset to boundaries: null in beforeEach, so the
  // hook must substitute the {country: ["-"]} placeholder rather than pass
  // null/undefined through to searchInbox as the jurisdiction argument.
  it("falls back the jurisdiction to {country: ['-']} when no boundaries are set", async () => {
    seedAuthenticatedSession({ tenantId: "livelihood", roles: [{ code: "LIVELIHOOD_POC" }] });
    const searchSpy = vi
      .spyOn(inboxService, "searchInbox")
      .mockResolvedValue({ items: [], totalCount: 0 });

    renderHook(() => useImInboxSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(searchSpy).toHaveBeenCalled());
    expect(searchSpy.mock.calls[0][1]).toEqual({ country: ["-"] });
  });
});

// useImInboxData: paginated/filterable inbox query for the IM list view.
// Flattens the caller's searchParams (filters, limit/offset) via
// flattenInboxFilters, applies the same jurisdiction fallback as the
// summary hook, and on success runs combineInboxResponses (which needs the
// i18n `t` function from useTranslate) over the raw items to build display
// rows. Same enabled gating as useImInboxSummary: access token + employee
// tenant + hasImAccess(user.roles).
describe("useImInboxData", () => {
  it("is disabled without IM access", () => {
    seedAuthenticatedSession({ tenantId: "livelihood", roles: [{ code: "EMPLOYEE" }] });
    const searchSpy = vi.spyOn(inboxService, "searchInbox");

    renderHook(() => useImInboxData({}), { wrapper: createWrapper() });

    expect(searchSpy).not.toHaveBeenCalled();
  });

  // The mock response mirrors the raw searchInbox item shape (a nested
  // businessObject.incident payload), verifying combineInboxResponses
  // correctly flattens it into a row with a top-level incidentId.
  it("combines inbox items into rows once enabled", async () => {
    seedAuthenticatedSession({ tenantId: "livelihood", roles: [{ code: "LIVELIHOOD_POC" }] });
    vi.spyOn(inboxService, "searchInbox").mockResolvedValue({
      items: [
        {
          businessObject: {
            incident: {
              incidentId: "INC-1",
              incidentType: "streetlight",
              applicationStatus: "RESOLVED",
              tenantId: "livelihood",
            },
          },
        },
      ],
      totalCount: 1,
    });

    const { result } = renderHook(() => useImInboxData({}), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.combinedRes).toHaveLength(1);
    expect(result.current.data?.combinedRes[0].incidentId).toBe("INC-1");
  });
});

// useImAssetTypes: fetches the list of MDMS asset types for the current
// tenant. Unlike the inbox hooks it only requires an access token to be
// enabled (no IM role check), and caches indefinitely (staleTime: Infinity)
// since asset types rarely change.
describe("useImAssetTypes", () => {
  // resetAuthStore() leaves accessToken unset, so the query must stay disabled.
  it("is disabled without an access token", () => {
    resetAuthStore();
    const fetchSpy = vi.spyOn(mdmsService, "fetchAssetTypes");

    renderHook(() => useImAssetTypes(), { wrapper: createWrapper() });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns asset types once enabled", async () => {
    seedAuthenticatedSession();
    vi.spyOn(mdmsService, "fetchAssetTypes").mockResolvedValue([
      { code: "STREETLIGHT", name: "Streetlight" },
    ]);

    const { result } = renderHook(() => useImAssetTypes(), { wrapper: createWrapper() });

    await waitFor(() =>
      expect(result.current.data).toEqual([{ code: "STREETLIGHT", name: "Streetlight" }]),
    );
  });
});
