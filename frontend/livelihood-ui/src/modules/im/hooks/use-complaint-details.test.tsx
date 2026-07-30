import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import * as incidentDetailsService from "../services/incident-details";
import * as workflowService from "../services/workflow";
import { useComplaintDetails } from "./use-complaint-details";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  resetAuthStore();
  seedAuthenticatedSession();
  vi.spyOn(incidentDetailsService, "resolveVerificationMedia").mockResolvedValue({
    thumbs: [],
    images: [],
    videos: [],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
});

describe("useComplaintDetails", () => {
  it("does not query when not authenticated", () => {
    resetAuthStore();
    const searchSpy = vi.spyOn(incidentDetailsService, "searchIncidentById");
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderHook(() => useComplaintDetails("INC-1", "livelihood"), {
      wrapper: createWrapper(queryClient),
    });

    expect(searchSpy).not.toHaveBeenCalled();
  });

  it("loads complaint details and workflow details when authenticated", async () => {
    vi.spyOn(incidentDetailsService, "searchIncidentById").mockResolvedValue({
      IncidentWrappers: [
        {
          incident: {
            tenantId: "livelihood",
            incidentId: "INC-1",
            applicationStatus: "PENDING_FOR_RESOLUTION",
            incidentType: "streetlight",
            incidentSubType: "not-working",
          },
          workflow: { action: "APPLY" },
        },
      ],
    });
    vi.spyOn(workflowService, "fetchWorkflowDetails").mockResolvedValue({
      timeline: [],
      nextActions: [],
      processInstances: [],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useComplaintDetails("INC-1", "livelihood"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.complaintDetails).toBeTruthy());
    expect(result.current.complaintDetails?.incidentId).toBe("INC-1");
    expect(result.current.workflowDetails).toEqual({
      timeline: [],
      nextActions: [],
      processInstances: [],
    });
  });

  it("throws COMPLAINT_NOT_FOUND when the response has no wrapper", async () => {
    vi.spyOn(incidentDetailsService, "searchIncidentById").mockResolvedValue({
      IncidentWrappers: [],
    });
    vi.spyOn(workflowService, "fetchWorkflowDetails").mockResolvedValue({
      timeline: [],
      nextActions: [],
      processInstances: [],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useComplaintDetails("INC-1", "livelihood"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  describe("revalidate", () => {
    it("returns undefined when the workflow query state has an error after invalidation", async () => {
      vi.spyOn(incidentDetailsService, "searchIncidentById").mockResolvedValue({
        IncidentWrappers: [
          {
            incident: {
              tenantId: "livelihood",
              incidentId: "INC-1",
              applicationStatus: "PENDING_FOR_RESOLUTION",
              incidentType: "streetlight",
              incidentSubType: "not-working",
            },
            workflow: { action: "APPLY" },
          },
        ],
      });
      const workflowSpy = vi
        .spyOn(workflowService, "fetchWorkflowDetails")
        .mockResolvedValueOnce({ timeline: [], nextActions: [], processInstances: [] });
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

      const { result } = renderHook(() => useComplaintDetails("INC-1", "livelihood"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.workflowDetails).toBeTruthy());

      workflowSpy.mockRejectedValueOnce(new Error("refetch failed"));
      const revalidated = await result.current.revalidate();

      expect(revalidated).toBeUndefined();
    });

    it("returns the fresh workflow data when the refetch succeeds", async () => {
      vi.spyOn(incidentDetailsService, "searchIncidentById").mockResolvedValue({
        IncidentWrappers: [
          {
            incident: {
              tenantId: "livelihood",
              incidentId: "INC-1",
              applicationStatus: "PENDING_FOR_RESOLUTION",
              incidentType: "streetlight",
              incidentSubType: "not-working",
            },
            workflow: { action: "APPLY" },
          },
        ],
      });
      const workflowSpy = vi
        .spyOn(workflowService, "fetchWorkflowDetails")
        .mockResolvedValueOnce({ timeline: [], nextActions: [], processInstances: [] });
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

      const { result } = renderHook(() => useComplaintDetails("INC-1", "livelihood"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.workflowDetails).toBeTruthy());

      workflowSpy.mockResolvedValueOnce({
        timeline: [],
        nextActions: [{ action: "RESOLVE" }],
        processInstances: [],
      });
      const revalidated = await result.current.revalidate();

      expect(revalidated?.nextActions).toEqual([{ action: "RESOLVE" }]);
    });
  });
});
