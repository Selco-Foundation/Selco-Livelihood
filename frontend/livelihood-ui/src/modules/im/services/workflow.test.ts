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

describe("fetchWorkflowDetails", () => {
  it("returns empty timeline/nextActions/processInstances when there are no process instances", async () => {
    mockApiClient({ processInstances: [] });

    const result = await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(result).toEqual({ timeline: [], nextActions: [], processInstances: [] });
  });

  it("does not call the business-service or file-url endpoints when there are no instances", async () => {
    mockApiClient({ processInstances: [] });
    const getSpy = vi.spyOn(apiClient, "get");

    await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(getSpy).not.toHaveBeenCalled();
  });

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

  it("skips media resolution for instances without documents", async () => {
    mockApiClient({
      processInstances: [{ action: "APPLY", state: { applicationStatus: "PENDING_FOR_RESOLUTION" } }],
    });
    const getSpy = vi.spyOn(apiClient, "get");

    await fetchWorkflowDetails("livelihood", "INC-1", "token");

    expect(getSpy).not.toHaveBeenCalled();
  });

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
