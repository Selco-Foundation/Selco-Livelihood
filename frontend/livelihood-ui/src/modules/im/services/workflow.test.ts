import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient, fetchMdmsMasters, tenantId } from "@/shared";
import { fetchReasonOptions, searchWorkflowProcess, updateIncidentAction } from "./workflow";
import type { ComplaintDetailsData } from "../types/incident-details";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
    fetchMdmsMasters: vi.fn(),
    tenantId: vi.fn(() => "state-1"),
  };
});

describe("searchWorkflowProcess", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts with tenantId, businessIds, history and isStateLevelCall as params", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ProcessInstances: [] } });

    await searchWorkflowProcess("tenant-1", "incident-1", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/egov-workflow-v2/egov-wf/process/_search",
      { RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }) },
      {
        params: {
          tenantId: "tenant-1",
          businessIds: "incident-1",
          history: true,
          isStateLevelCall: false,
        },
      },
    );
  });

  it("returns the raw response data unmodified", async () => {
    const responseData = { ProcessInstances: [{ action: "CREATE" }] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: responseData });

    const result = await searchWorkflowProcess("tenant-1", "incident-1", "token-1");

    expect(result).toEqual(responseData);
    expect(result).toBe(responseData);
  });
});

describe("fetchReasonOptions", () => {
  beforeEach(() => {
    vi.mocked(fetchMdmsMasters).mockReset();
    vi.mocked(tenantId).mockReset().mockReturnValue("state-1");
  });

  it("fetches all requested masters under the Incident module in one call", async () => {
    vi.mocked(fetchMdmsMasters).mockResolvedValue({
      OutOfScopeReason: [{ code: "R1" }],
      DeclineReason: [{ code: "R2" }],
    });

    await fetchReasonOptions("token-1", { uuid: "u1" }, ["OutOfScopeReason", "DeclineReason"]);

    expect(fetchMdmsMasters).toHaveBeenCalledWith(
      "state-1",
      "Incident",
      ["OutOfScopeReason", "DeclineReason"],
      "token-1",
      { uuid: "u1" },
    );
  });

  it("keys the result by master name, defaulting a missing master to []", async () => {
    vi.mocked(fetchMdmsMasters).mockResolvedValue({ OutOfScopeReason: [{ code: "R1" }] });

    const result = await fetchReasonOptions("token-1", null, ["OutOfScopeReason", "DeclineReason"]);

    expect(result).toEqual({ OutOfScopeReason: [{ code: "R1" }], DeclineReason: [] });
  });
});

function buildComplaintDetails(
  overrides: Partial<ComplaintDetailsData["incident"]> = {},
): ComplaintDetailsData {
  return {
    incidentId: "incident-1",
    tenantId: "tenant-1",
    rows: [],
    incident: {
      tenantId: "tenant-1",
      incidentId: "incident-1",
      applicationStatus: "PENDING_FOR_RESOLUTION",
      incidentType: "NOT_WORKING",
      incidentSubType: "",
      additionalDetail: { outOfScopeReason: [], declineReason: [], fileStoreId: undefined },
      ...overrides,
    },
    workflow: { action: "CREATE", comments: "initial" },
    images: [],
    videos: [],
    thumbnails: [],
  };
}

describe("updateIncidentAction", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the incident/workflow with the action applied and tenantId as a param", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { IncidentWrappers: [] } });
    const complaintDetails = buildComplaintDetails();

    await updateIncidentAction({
      complaintDetails,
      action: "ASSIGN_VENDOR",
      assigneeUuid: "vendor-1",
      comments: "assigning",
      accessToken: "token-1",
      user: { uuid: "u1" },
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/im-services/v2/request/_update",
      expect.objectContaining({
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        tenantId: "tenant-1",
        workflow: expect.objectContaining({
          action: "ASSIGN_VENDOR",
          assignes: ["vendor-1"],
          comments: "assigning",
        }),
      }),
      { params: { tenantId: "tenant-1" } },
    );
  });

  it("sets workflow.assignes to null when no assigneeUuid is given, and comments to '' when omitted", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    await updateIncidentAction({
      complaintDetails: buildComplaintDetails(),
      action: "RESOLVE",
      accessToken: "token-1",
      user: { uuid: "u1" },
    });

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as {
      workflow: { assignes: unknown; comments: string };
    };
    expect(body.workflow.assignes).toBeNull();
    expect(body.workflow.comments).toBe("");
  });

  it("records an outOfScopeReason's code on the workflow and appends it to additionalDetail", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    await updateIncidentAction({
      complaintDetails: buildComplaintDetails(),
      action: "MARK_OUT_OF_SCOPE",
      outOfScopeReason: { code: "NO_WARRANTY" },
      accessToken: "token-1",
      user: { uuid: "u1" },
    });

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as {
      workflow: { outOfScopeReason?: string };
      incident: { additionalDetail: { outOfScopeReason: string[] } };
    };
    expect(body.workflow.outOfScopeReason).toBe("NO_WARRANTY");
    expect(body.incident.additionalDetail.outOfScopeReason).toEqual(["NO_WARRANTY"]);
  });

  it("falls back to localizedCode for outOfScopeReason/declineReason when code is absent", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    await updateIncidentAction({
      complaintDetails: buildComplaintDetails(),
      action: "DECLINE",
      declineReason: { localizedCode: "REASON.NOT_ELIGIBLE" },
      accessToken: "token-1",
      user: { uuid: "u1" },
    });

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as {
      workflow: { declineReason?: string };
    };
    expect(body.workflow.declineReason).toBe("REASON.NOT_ELIGIBLE");
  });

  it("preserves other additionalDetail fields untouched (e.g. assetCategory)", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const complaintDetails = buildComplaintDetails({
      additionalDetail: {
        outOfScopeReason: [],
        declineReason: [],
        fileStoreId: undefined,
        // @ts-expect-error extra field not modeled by IncidentAdditionalDetail
        assetCategory: "Solar",
      },
    });

    await updateIncidentAction({
      complaintDetails,
      action: "RESOLVE",
      accessToken: "token-1",
      user: { uuid: "u1" },
    });

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as {
      incident: { additionalDetail: Record<string, unknown> };
    };
    expect(body.incident.additionalDetail.assetCategory).toBe("Solar");
  });

  it("returns the raw response data unmodified on success", async () => {
    const responseData = { IncidentWrappers: [{ incident: { incidentId: "incident-1" } }] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: responseData });

    const result = await updateIncidentAction({
      complaintDetails: buildComplaintDetails(),
      action: "RESOLVE",
      accessToken: "token-1",
      user: { uuid: "u1" },
    });

    expect(result).toEqual(responseData);
    expect(result).toBe(responseData);
  });

  it("returns the error response body when the request rejects with one", async () => {
    const errorBody = { Errors: [{ message: "STALE_STATE" }] };
    vi.mocked(apiClient.post).mockRejectedValue({ response: { data: errorBody } });

    const result = await updateIncidentAction({
      complaintDetails: buildComplaintDetails(),
      action: "RESOLVE",
      accessToken: "token-1",
      user: { uuid: "u1" },
    });

    expect(result).toEqual(errorBody);
  });

  it("falls back to a generic UPDATE_FAILED error when the rejection carries no response data", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("network down"));

    const result = await updateIncidentAction({
      complaintDetails: buildComplaintDetails(),
      action: "RESOLVE",
      accessToken: "token-1",
      user: { uuid: "u1" },
    });

    expect(result).toEqual({ Errors: [{ message: "UPDATE_FAILED" }] });
  });
});
