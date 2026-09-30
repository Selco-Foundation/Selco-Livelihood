import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tenantId, useAuthStore, useJurisdictionStore } from "@/shared";
import { useImAssetTypes, useImInboxData, useImInboxSummary } from "./use-im-inbox-data";
import type { InboxItem } from "../types/inbox";

vi.mock("../services/inbox", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/inbox")>();
  return { ...actual, searchInbox: vi.fn() };
});
vi.mock("../services/mdms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/mdms")>();
  return { ...actual, fetchAssetTypes: vi.fn() };
});

import { searchInbox } from "../services/inbox";
import { fetchAssetTypes } from "../services/mdms";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

const resolverUser = { uuid: "user-1", roles: [{ code: "COMPLAINT_RESOLVER" }] };
const pocUser = { uuid: "user-2", roles: [{ code: "LIVELIHOOD_POC" }] };
const noAccessUser = { uuid: "user-3", roles: [{ code: "OTHER" }] };

function inboxItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    businessObject: {
      incident: {
        incidentId: "inc-1",
        incidentType: "SOLAR",
        applicationStatus: "PENDING_FOR_RESOLUTION",
        tenantId: "tenant-1",
        boundaryCode: "B1",
        reporter: { name: "John" },
      },
      slaRemaining: 3_600_000,
    },
    ProcessInstance: { assignes: [{ uuid: "user-1", name: "Agent" }] },
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(searchInbox).mockReset();
  vi.mocked(fetchAssetTypes).mockReset();
  useJurisdictionStore.setState({ boundaries: null });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
});

describe("useImInboxSummary", () => {
  it.each([
    ["missing accessToken", { accessToken: null, employeeTenantId: "tenant-1", user: resolverUser }],
    ["missing employeeTenantId", { accessToken: "token-1", employeeTenantId: null, user: resolverUser }],
    ["user lacks IM access", { accessToken: "token-1", employeeTenantId: "tenant-1", user: noAccessUser }],
  ])("never calls searchInbox when %s", async (_label, state) => {
    useAuthStore.setState(state);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useImInboxSummary(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(searchInbox).not.toHaveBeenCalled();
  });

  it("scopes the search to the assignee for an assignee-scoped role and defaults jurisdiction when there are no boundaries", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: resolverUser });
    vi.mocked(searchInbox).mockResolvedValue({
      items: [],
      totalCount: 8,
      nearingSlaCount: 2,
      statusMap: [
        { statusid: "RESOLVED", count: 3 },
        { statusid: "PENDING_FOR_RESOLUTION", count: 5 },
      ],
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useImInboxSummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchInbox).toHaveBeenCalledWith(
      "tenant-1",
      { country: ["-"] },
      {
        limit: 10,
        offset: 0,
        services: ["LivelihoodIncident"],
        sortOrder: "DESC",
        assignee: "user-1",
      },
      "token-1",
      resolverUser,
    );
    expect(result.current.data).toEqual({
      totalCount: 8,
      nearingSlaCount: 2,
      resolvedCount: 3,
      statusMap: [
        { statusid: "RESOLVED", count: 3 },
        { statusid: "PENDING_FOR_RESOLUTION", count: 5 },
      ],
    });
  });

  it("omits the assignee scope and uses the jurisdiction store's boundaries for a non-assignee-scoped role", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: pocUser });
    useJurisdictionStore.setState({ boundaries: { district: ["D1"] } });
    vi.mocked(searchInbox).mockResolvedValue({ items: [], totalCount: 0, statusMap: [] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useImInboxSummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchInbox).toHaveBeenCalledWith(
      "tenant-1",
      { district: ["D1"] },
      { limit: 10, offset: 0, services: ["LivelihoodIncident"], sortOrder: "DESC" },
      "token-1",
      pocUser,
    );
    expect(result.current.data).toMatchObject({ totalCount: 0, resolvedCount: 0 });
  });
});

describe("useImInboxData", () => {
  it.each([
    ["missing accessToken", { accessToken: null, employeeTenantId: "tenant-1", user: resolverUser }],
    ["missing employeeTenantId", { accessToken: "token-1", employeeTenantId: null, user: resolverUser }],
    ["user lacks IM access", { accessToken: "token-1", employeeTenantId: "tenant-1", user: noAccessUser }],
  ])("never calls searchInbox when %s", async (_label, state) => {
    useAuthStore.setState(state);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useImInboxData({}), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(searchInbox).not.toHaveBeenCalled();
  });

  it("flattens the pgr/wf filter queries onto the search params and maps the response to inbox rows", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: resolverUser });
    vi.mocked(searchInbox).mockResolvedValue({
      items: [inboxItem()],
      totalCount: 1,
      statusMap: [{ statusid: "PENDING_FOR_RESOLUTION", count: 1 }],
    });
    const { wrapper } = createWrapper();

    const searchParams = {
      limit: 5,
      offset: 10,
      nearingSLA: true,
      filters: {
        pgrQuery: { facility: "FAC1" },
        wfQuery: { assignee: "user-1" },
      },
    };

    const { result } = renderHook(() => useImInboxData(searchParams), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchInbox).toHaveBeenCalledWith(
      "tenant-1",
      { country: ["-"] },
      {
        limit: 5,
        offset: 10,
        services: ["LivelihoodIncident"],
        sortOrder: "DESC",
        facility: "FAC1",
        assignee: "user-1",
        nearingSLA: true,
      },
      "token-1",
      resolverUser,
    );
    expect(result.current.data).toEqual({
      total: 1,
      statusArray: [{ statusid: "PENDING_FOR_RESOLUTION", count: 1 }],
      combinedRes: [
        {
          incidentId: "inc-1",
          incidentType: "SOLAR",
          assetLabel: "BOUNDARY_B1",
          status: "PENDING_FOR_RESOLUTION",
          taskOwner: "Agent",
          sla: "1",
          slaUrgent: true,
          endUser: "John",
          tenantId: "tenant-1",
          potentialDuplicate: false,
        },
      ],
    });
  });

  // flattenInboxFilters (utils/inbox-filters.ts) computes its `defaults.limit`/
  // `defaults.offset` with a `?? 10`/`?? 0` fallback, but then unconditionally
  // overwrites them again with the raw `searchParams.limit`/`searchParams.offset`
  // afterwards — so omitting limit/offset from searchParams actually sends
  // `undefined` through to searchInbox, not the 10/0 default. Asserting the
  // real (buggy) behavior here; see final report.
  it("sends limit/offset/nearingSLA as undefined when the caller omits them, not the computed 10/0 default", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: resolverUser });
    vi.mocked(searchInbox).mockResolvedValue({ items: [], totalCount: 0 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useImInboxData({}), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchInbox).toHaveBeenCalledWith(
      "tenant-1",
      { country: ["-"] },
      {
        limit: undefined,
        offset: undefined,
        nearingSLA: undefined,
        services: ["LivelihoodIncident"],
        sortOrder: "DESC",
      },
      "token-1",
      resolverUser,
    );
  });
});

describe("useImAssetTypes", () => {
  it("does not call fetchAssetTypes when accessToken is missing", async () => {
    useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useImAssetTypes(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchAssetTypes).not.toHaveBeenCalled();
  });

  it("fetches asset types keyed by the state-level tenantId once an accessToken is present", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: resolverUser });
    vi.mocked(fetchAssetTypes).mockResolvedValue([{ code: "PANEL", name: "PANEL" }]);
    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useImAssetTypes(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchAssetTypes).toHaveBeenCalledWith("token-1", resolverUser);
    expect(result.current.data).toEqual([{ code: "PANEL", name: "PANEL" }]);
    expect(
      queryClient.getQueryData(["im-asset-types", tenantId()]),
    ).toEqual([{ code: "PANEL", name: "PANEL" }]);
  });
});
