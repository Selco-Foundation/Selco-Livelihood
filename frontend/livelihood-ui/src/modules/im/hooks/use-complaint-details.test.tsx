/**
 * Unit tests for `useComplaintDetails`, the hook that loads a single complaint's
 * incident details and workflow details via two react-query queries and exposes a
 * `revalidate` helper that invalidates both (plus the inbox list/summary caches).
 *
 * Testing approach:
 * - The hook depends on `useAuthStore` (auth gating), `useQuery`/`useQueryClient`
 *   (react-query), and the `incident-details`/`workflow` service modules. Rather than
 *   mocking react-query itself, tests render the hook inside a real
 *   `QueryClientProvider` (see `createWrapper`) so query state (loading/error/data,
 *   cache invalidation) behaves exactly as it does in the app.
 * - `searchIncidentById`, `resolveVerificationMedia`, and `fetchWorkflowDetails` are
 *   spied on via `vi.spyOn` so each test controls the network-shaped responses without
 *   hitting real services. `resolveVerificationMedia` is stubbed globally in
 *   `beforeEach` with an empty media payload since most tests don't care about media
 *   resolution and only need it to resolve so the complaint query can settle.
 * - Auth state is seeded/reset per test via the shared `resetAuthStore` /
 *   `seedAuthenticatedSession` test helpers, since the hook's queries are gated on
 *   `Boolean(accessToken && tenantId && incidentId)`.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import * as incidentDetailsService from "../services/incident-details";
import * as workflowService from "../services/workflow";
import { useComplaintDetails } from "./use-complaint-details";

// Wraps the hook under test in a `QueryClientProvider` so react-query's cache,
// loading/error state, and `invalidateQueries` all behave like production.
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

// `useComplaintDetails(incidentId, tenantId)` runs two react-query queries in
// parallel: one fetches the incident (via `searchIncidentById` + media resolution,
// then maps it through `buildComplaintDetailsData`), the other fetches workflow
// details (via `fetchWorkflowDetails`). Both queries are gated on
// `Boolean(accessToken && tenantId && incidentId)`, so an unauthenticated caller gets
// no network calls. The hook also returns a `revalidate()` helper that invalidates
// both queries (plus the inbox caches) and returns the settled workflow data, or
// `undefined` if the post-invalidation refetch left the workflow query in an error
// state.
describe("useComplaintDetails", () => {
  // Precondition: no access token in the auth store. Both queries are `enabled: false`
  // in that case, so the incident search service must never be invoked.
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

  // Precondition: `searchIncidentById` resolves but `IncidentWrappers` is empty, so
  // `response.IncidentWrappers?.[0]` is undefined. The queryFn throws
  // `new Error("COMPLAINT_NOT_FOUND")` in that case, which react-query surfaces as
  // `isError`.
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

  // `revalidate()` invalidates the complaint, workflow, and inbox query caches, then
  // reads the workflow query's state directly (not react-query's cached `data`)
  // because `invalidateQueries` resolves even when the triggered refetch fails, and
  // a failed refetch leaves the previous successful data sitting in the cache.
  // These tests exercise both branches of that error-state check.
  describe("revalidate", () => {
    // Setup: the workflow query first succeeds (mockResolvedValueOnce), so the hook
    // finishes loading; then the *next* fetch (triggered by revalidate's
    // invalidateQueries) is made to reject via `mockRejectedValueOnce`. Because the
    // query state now has an error, `revalidate()` must return `undefined` rather than
    // the stale pre-error data.
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

    // Setup: mirrors the error case above, but the refetch triggered by revalidate
    // succeeds with new data (`nextActions` now populated). `revalidate()` should
    // return that fresh workflow data rather than the earlier empty snapshot.
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
