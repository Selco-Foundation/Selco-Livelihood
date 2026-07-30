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

describe("useImInboxSummary", () => {
  it("is disabled (does not query) without IM access", () => {
    // "EMPLOYEE" is not one of the IM_ROLES hasImAccess checks against
    // (COMPLAINT_RESOLVER/LIVELIHOOD_POC/COMPLAINANT/LIVELIHOOD_VENDOR/VIEWER).
    seedAuthenticatedSession({ tenantId: "livelihood", roles: [{ code: "EMPLOYEE" }] });
    const searchSpy = vi.spyOn(inboxService, "searchInbox");

    renderHook(() => useImInboxSummary(), { wrapper: createWrapper() });

    expect(searchSpy).not.toHaveBeenCalled();
  });

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

describe("useImInboxData", () => {
  it("is disabled without IM access", () => {
    seedAuthenticatedSession({ tenantId: "livelihood", roles: [{ code: "EMPLOYEE" }] });
    const searchSpy = vi.spyOn(inboxService, "searchInbox");

    renderHook(() => useImInboxData({}), { wrapper: createWrapper() });

    expect(searchSpy).not.toHaveBeenCalled();
  });

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

describe("useImAssetTypes", () => {
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
