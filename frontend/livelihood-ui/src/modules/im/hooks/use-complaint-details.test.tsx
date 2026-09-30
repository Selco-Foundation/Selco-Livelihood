import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useComplaintDetails } from "./use-complaint-details";
import type { IncidentWrapper, WorkflowProcessInstance } from "../types/incident-details";

vi.mock("../services/incident-details", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/incident-details")>();
  return { ...actual, searchIncidentById: vi.fn() };
});
vi.mock("../services/workflow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/workflow")>();
  return { ...actual, searchWorkflowProcess: vi.fn() };
});
vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, fetchFileUrls: vi.fn(), fetchWorkflowBusinessService: vi.fn() };
});

import { fetchFileUrls, fetchWorkflowBusinessService } from "@/shared";
import { searchIncidentById } from "../services/incident-details";
import { searchWorkflowProcess } from "../services/workflow";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

const authedUser = { uuid: "user-1", roles: [{ code: "COMPLAINT_RESOLVER" }] };

function wrapperFor(overrides: Partial<IncidentWrapper["incident"]> = {}): IncidentWrapper {
  return {
    incident: {
      tenantId: "tenant-1",
      incidentId: "inc-1",
      applicationStatus: "PENDING_FOR_RESOLUTION",
      incidentType: "SOLAR",
      incidentSubType: "PANEL",
      additionalDetail: {
        fileStoreId: [
          { fileStoreId: "fs1", documentUid: "u1", documentType: "Photo", additionalDetails: {} },
        ],
      },
      ...overrides,
    },
    workflow: { action: "ASSIGN", comments: "" },
  };
}

function processInstance(overrides: Partial<WorkflowProcessInstance> = {}): WorkflowProcessInstance {
  return {
    action: "ASSIGN",
    businessService: "LivelihoodIncident",
    tenantId: "tenant-1",
    state: { uuid: "state-1", applicationStatus: "PENDING_FOR_RESOLUTION" },
    nextActions: [{ action: "RESOLVE", roles: "COMPLAINT_RESOLVER" }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(searchIncidentById).mockReset();
  vi.mocked(searchWorkflowProcess).mockReset();
  vi.mocked(fetchFileUrls).mockReset();
  vi.mocked(fetchWorkflowBusinessService).mockReset();
  vi.mocked(fetchFileUrls).mockImplementation(async (ids: string[]) => ({
    fileStoreIds: ids.map((id) => ({ id, url: `https://cdn/${id}` })),
  }));
  vi.mocked(fetchWorkflowBusinessService).mockResolvedValue({
    BusinessServices: [
      { states: [{ uuid: "state-1", actions: [{ action: "RESOLVE", roles: ["COMPLAINT_RESOLVER"], nextState: "state-2" }] }] },
    ],
  });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
});

describe("useComplaintDetails", () => {
  it.each([
    ["missing accessToken", null, "tenant-1", "inc-1"],
    ["missing tenantId", "token-1", "", "inc-1"],
    ["missing incidentId", "token-1", "tenant-1", ""],
  ])("never calls searchIncidentById/searchWorkflowProcess when %s", async (_label, accessToken, tenantId, incidentId) => {
    useAuthStore.setState({ accessToken, employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useComplaintDetails(incidentId, tenantId), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(searchIncidentById).not.toHaveBeenCalled();
    expect(searchWorkflowProcess).not.toHaveBeenCalled();
  });

  it("builds complaint details from the incident wrapper and resolves its media", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchIncidentById).mockResolvedValue({ IncidentWrappers: [wrapperFor()] });
    vi.mocked(searchWorkflowProcess).mockResolvedValue({ ProcessInstances: [] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useComplaintDetails("inc-1", "tenant-1"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(searchIncidentById).toHaveBeenCalledWith("tenant-1", "inc-1", "token-1", authedUser);
    expect(fetchFileUrls).toHaveBeenCalledWith(["fs1"], "tenant-1", "token-1", authedUser);
    expect(result.current.complaintDetails).toMatchObject({
      incidentId: "inc-1",
      tenantId: "tenant-1",
      images: ["https://cdn/fs1"],
      videos: [],
      thumbnails: ["https://cdn/fs1"],
    });
  });

  it("throws COMPLAINT_NOT_FOUND (surfaced as isError) when the response has no wrapper", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchIncidentById).mockResolvedValue({ IncidentWrappers: [] });
    vi.mocked(searchWorkflowProcess).mockResolvedValue({ ProcessInstances: [] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useComplaintDetails("inc-1", "tenant-1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error("COMPLAINT_NOT_FOUND"));
  });

  it("returns empty workflow details without fetching the business service when there are no process instances", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchIncidentById).mockResolvedValue({ IncidentWrappers: [wrapperFor()] });
    vi.mocked(searchWorkflowProcess).mockResolvedValue({ ProcessInstances: [] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useComplaintDetails("inc-1", "tenant-1"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workflowDetails).toEqual({ timeline: [], nextActions: [], processInstances: [] });
    expect(fetchWorkflowBusinessService).not.toHaveBeenCalled();
  });

  it("resolves the business service and per-instance media for non-empty process instances", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchIncidentById).mockResolvedValue({ IncidentWrappers: [wrapperFor()] });
    vi.mocked(searchWorkflowProcess).mockResolvedValue({
      ProcessInstances: [
        processInstance({
          documents: [{ fileStoreId: "fs2", documentUid: "u2", documentType: "Photo", additionalDetails: {} }],
        }),
      ],
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useComplaintDetails("inc-1", "tenant-1"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchWorkflowBusinessService).toHaveBeenCalledWith("tenant-1", "LivelihoodIncident", "token-1", authedUser);
    expect(fetchFileUrls).toHaveBeenCalledWith(["fs2"], "tenant-1", "token-1", authedUser);
    expect(result.current.workflowDetails?.applicationBusinessService).toBe("LivelihoodIncident");
    expect(result.current.workflowDetails?.processInstances[0].thumbnailsToShow?.images).toEqual([
      "https://cdn/fs2",
    ]);
  });

  it("falls back to LIVELIHOOD_INCIDENT_BUSINESS_SERVICE when the instance has no businessService", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchIncidentById).mockResolvedValue({ IncidentWrappers: [wrapperFor()] });
    vi.mocked(searchWorkflowProcess).mockResolvedValue({
      ProcessInstances: [processInstance({ businessService: undefined })],
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useComplaintDetails("inc-1", "tenant-1"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchWorkflowBusinessService).toHaveBeenCalledWith(
      "tenant-1",
      "LivelihoodIncident",
      "token-1",
      authedUser,
    );
  });

  describe("revalidate", () => {
    it("invalidates complaint-details, workflow-details, im-inbox, and im-inbox-summary caches", async () => {
      useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
      vi.mocked(searchIncidentById).mockResolvedValue({ IncidentWrappers: [wrapperFor()] });
      vi.mocked(searchWorkflowProcess).mockResolvedValue({ ProcessInstances: [] });
      const { wrapper, queryClient } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useComplaintDetails("inc-1", "tenant-1"), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.revalidate();

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["complaint-details", "tenant-1", "inc-1"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["workflow-details", "tenant-1", "inc-1"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["im-inbox"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["im-inbox-summary"] });
    });

    it("returns the latest workflow data once the revalidation refetch succeeds", async () => {
      useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
      vi.mocked(searchIncidentById).mockResolvedValue({ IncidentWrappers: [wrapperFor()] });
      vi.mocked(searchWorkflowProcess).mockResolvedValue({ ProcessInstances: [] });
      const { wrapper } = createWrapper();

      const { result } = renderHook(() => useComplaintDetails("inc-1", "tenant-1"), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const data = await result.current.revalidate();
      expect(data).toEqual({ timeline: [], nextActions: [], processInstances: [] });
    });

    it("returns undefined instead of stale data when the revalidation refetch fails", async () => {
      useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
      vi.mocked(searchIncidentById).mockResolvedValue({ IncidentWrappers: [wrapperFor()] });
      vi.mocked(searchWorkflowProcess).mockResolvedValueOnce({ ProcessInstances: [] });
      const { wrapper } = createWrapper();

      const { result } = renderHook(() => useComplaintDetails("inc-1", "tenant-1"), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      vi.mocked(searchWorkflowProcess).mockRejectedValueOnce(new Error("workflow search failed"));

      const data = await result.current.revalidate();
      expect(data).toBeUndefined();
    });
  });
});
