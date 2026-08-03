/**
 * Unit tests for `fetchWorkflowDetails` (src/modules/im/services/workflow.ts).
 *
 * `fetchWorkflowDetails` orchestrates several calls to build the incident
 * workflow timeline shown in the UI:
 *  1. Search egov-workflow-v2 for the process instances of an incident.
 *  2. Fetch the business-service definition (its list of states/actions) so
 *     the current state's next actions and their assignee roles can be
 *     resolved.
 *  3. Resolve any verification-document thumbnails/images/videos for
 *     instances that have documents attached.
 *  4. Merge consecutive COMMENT-only instances into the wfComments of the
 *     following "real" action, then flatten everything into timeline
 *     checkpoints (formatting epoch timestamps to display dates).
 *
 * Testing approach: `apiClient.post`/`apiClient.get` are the only network
 * boundary, so they are mocked via `mockApiClient` below, which fakes the
 * two POST endpoints (process search, business-service search) by URL and
 * fakes the GET endpoint used to resolve file-store URLs for documents.
 * Everything else (comment merging, timeline shaping, date formatting,
 * next-action/role resolution) is real production logic exercised through
 * `fetchWorkflowDetails`, so these are effectively integration tests of the
 * whole function against a stubbed API layer.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import type {
  WorkflowBusinessServiceResponse,
  WorkflowProcessInstance,
  WorkflowProcessSearchResponse,
} from "../types/incident-details";
import { fetchWorkflowDetails } from "./workflow";

afterEach(() => {
  vi.restoreAllMocks();
});

// Stubs apiClient.post to answer the process-search and business-service
// endpoints by URL (returning empty data for anything else), and stubs
// apiClient.get to return the given fileStoreId -> url mapping used when
// resolving verification-document thumbnails/images/videos.
function mockApiClient({
  processInstances,
  businessServiceStates = [],
  fileUrls = [],
}: {
  processInstances: WorkflowProcessInstance[];
  businessServiceStates?: Array<{
    uuid?: string;
    state?: string;
    applicationStatus?: string;
    actions?: Array<{ action?: string; roles?: string[]; nextState?: string }>;
  }>;
  fileUrls?: Array<{ id: string; url: string }>;
}) {
  vi.spyOn(apiClient, "post").mockImplementation((url: string) => {
    if (url === "/egov-workflow-v2/egov-wf/process/_search") {
      return mockAxiosSuccess<WorkflowProcessSearchResponse>({
        ProcessInstances: processInstances,
      });
    }
    if (url === "/egov-workflow-v2/egov-wf/businessservice/_search") {
      return mockAxiosSuccess<WorkflowBusinessServiceResponse>({
        BusinessServices: [{ states: businessServiceStates }],
      });
    }
    return mockAxiosSuccess({});
  });
  vi.spyOn(apiClient, "get").mockReturnValue(mockAxiosSuccess({ fileStoreIds: fileUrls }));
}

// fetchWorkflowDetails(tenantId, incidentId, accessToken, user?) fetches the
// egov-workflow-v2 process history for an incident, resolves the applicable
// business-service states to compute the current state's next actions (and
// the assignee roles those next actions lead to), attaches resolved media
// for any process instances with documents, and merges COMMENT-only
// instances into the wfComments of the following non-comment action to
// build the final timeline. It requires only a tenantId/incidentId/token;
// `user` is optional and forwarded to the request-info builder.
describe("fetchWorkflowDetails", () => {
  // With no process instances there is nothing to look up or merge, so the
  // function should short-circuit to empty arrays rather than calling the
  // business-service/media endpoints.
  it("returns empty timeline/nextActions/processInstances when there are no process instances", async () => {
    mockApiClient({ processInstances: [] });

    const result = await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(result).toEqual({ timeline: [], nextActions: [], processInstances: [] });
  });

  // Confirms the early-return path (empty processInstances) genuinely skips
  // the follow-up network calls rather than just happening to produce an
  // empty result while still fetching business-service/media data.
  it("does not call the business-service or file-url endpoints when there are no instances", async () => {
    mockApiClient({ processInstances: [] });
    const getSpy = vi.spyOn(apiClient, "get");

    await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(getSpy).not.toHaveBeenCalled();
  });

  // Business rule (mergeCommentEvents): instances whose action is "COMMENT"
  // carry no other state and are buffered on a stack; when a non-comment
  // action arrives, all buffered comments plus that action's own comment
  // (if any) collapse into a single timeline entry's wfComments, in order.
  it("attaches consecutive COMMENT actions to the next non-comment action's wfComments", async () => {
    mockApiClient({
      processInstances: [
        { action: "COMMENT", comment: "First remark" },
        { action: "COMMENT", comment: "Second remark" },
        { action: "RESOLVE", comment: "Resolved now", state: { applicationStatus: "RESOLVED" } },
      ],
    });

    const result = await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0].wfComment).toEqual(["First remark", "Second remark", "Resolved now"]);
    expect(result.timeline[0].performedAction).toBe("RESOLVE");
  });

  // When no COMMENT instances precede an action, its wfComments should be an
  // empty array (not undefined/omitted) and each non-comment action still
  // produces its own timeline entry.
  it("emits one timeline entry per non-comment action when there are no comments to merge", async () => {
    mockApiClient({
      processInstances: [
        { action: "APPLY", state: { applicationStatus: "PENDING_FOR_RESOLUTION" } },
        { action: "RESOLVE", state: { applicationStatus: "RESOLVED" } },
      ],
    });

    const result = await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(result.timeline.map((entry) => entry.performedAction)).toEqual(["APPLY", "RESOLVE"]);
    expect(result.timeline[0].wfComment).toEqual([]);
  });

  // Guards against a bug where the comment-stack buffer would leak into a
  // later, unrelated action: once a COMMENT batch is consumed by the next
  // action, the stack must be cleared so a subsequent action doesn't also
  // receive "Only for APPLY".
  it("resets the comment stack after it's attached, so it isn't reused by a later action", async () => {
    mockApiClient({
      processInstances: [
        { action: "COMMENT", comment: "Only for APPLY" },
        { action: "APPLY", state: { applicationStatus: "PENDING_FOR_RESOLUTION" } },
        { action: "RESOLVE", state: { applicationStatus: "RESOLVED" } },
      ],
    });

    const result = await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(result.timeline[0].wfComment).toEqual(["Only for APPLY"]);
    expect(result.timeline[1].wfComment).toEqual([]);
  });

  // enrichProcessInstancesWithMedia only calls the media-resolution helper
  // (which hits apiClient.get) for instances with a non-empty `documents`
  // array; instances without documents should pass through untouched.
  it("skips media resolution for instances without documents", async () => {
    mockApiClient({
      processInstances: [{ action: "APPLY", state: { applicationStatus: "PENDING_FOR_RESOLUTION" } }],
    });
    const getSpy = vi.spyOn(apiClient, "get");

    await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(getSpy).not.toHaveBeenCalled();
  });

  // When an instance has documents, resolveVerificationMedia is invoked
  // (via the fake apiClient.get file-store lookup) and the resulting image
  // URL must surface as timeline `thumbnailsToShow.fullImage` (buildTimeline
  // renames `images` -> `fullImage`).
  it("resolves and attaches media for instances with documents", async () => {
    mockApiClient({
      processInstances: [
        {
          action: "APPLY",
          state: { applicationStatus: "PENDING_FOR_RESOLUTION" },
          tenantId: "livelihood",
          documents: [
            { fileStoreId: "fs-1", documentUid: "", documentType: "image/jpeg", additionalDetails: {} },
          ],
        },
      ],
      fileUrls: [{ id: "fs-1", url: "https://cdn/img.jpg" }],
    });

    const result = await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(result.timeline[0].thumbnailsToShow?.fullImage).toEqual(["https://cdn/img.jpg"]);
  });

  // `nextActions` is filtered to drop entries whose `action` is falsy
  // (e.g. an empty string), so malformed/incomplete next-action entries
  // from the API don't leak into the UI.
  it("filters out next actions with a falsy action string", async () => {
    mockApiClient({
      processInstances: [
        {
          action: "APPLY",
          state: { applicationStatus: "PENDING_FOR_RESOLUTION" },
          nextActions: [{ action: "RESOLVE" }, { action: "" }],
        },
      ],
    });

    const result = await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(result.nextActions).toEqual([{ action: "RESOLVE", roles: undefined }]);
  });

  // actionState is only populated when the current process instance's state
  // uuid matches one of the business-service's states. For each action
  // available from that state, `assigneeRoles` is derived by looking up the
  // state that action transitions to (`nextState`) and collecting the
  // roles of all actions available from there — i.e. "who could act next
  // after this action is taken".
  it("computes actionState.nextActions with assigneeRoles from the resultant state when currentState matches", async () => {
    mockApiClient({
      processInstances: [
        {
          action: "APPLY",
          state: { applicationStatus: "PENDING_FOR_RESOLUTION", uuid: "state-1" },
        },
      ],
      businessServiceStates: [
        {
          uuid: "state-1",
          actions: [{ action: "RESOLVE", roles: ["COMPLAINT_RESOLVER"], nextState: "state-2" }],
        },
        { uuid: "state-2", actions: [{ action: "CLOSE", roles: ["LIVELIHOOD_POC"] }] },
      ],
    });

    const result = await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(result.actionState?.nextActions).toEqual([
      { action: "RESOLVE", roles: ["COMPLAINT_RESOLVER"], assigneeRoles: ["LIVELIHOOD_POC"] },
    ]);
  });

  it("leaves actionState undefined when the current instance's state uuid has no match", async () => {
    mockApiClient({
      processInstances: [
        { action: "APPLY", state: { applicationStatus: "PENDING_FOR_RESOLUTION", uuid: "unknown" } },
      ],
      businessServiceStates: [{ uuid: "state-1", actions: [] }],
    });

    const result = await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(result.actionState).toBeUndefined();
  });

  it("formats createdTime/lastModifiedTime in the timeline auditDetails", async () => {
    mockApiClient({
      processInstances: [
        {
          action: "APPLY",
          state: { applicationStatus: "PENDING_FOR_RESOLUTION" },
          auditDetails: { createdTime: 1700000000000, lastModifiedTime: 1700000000000 },
        },
      ],
    });

    const result = await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(result.timeline[0].auditDetails?.created).not.toBe("-");
    expect(result.timeline[0].auditDetails?.lastModifiedEpoch).toBe(1700000000000);
  });
});
