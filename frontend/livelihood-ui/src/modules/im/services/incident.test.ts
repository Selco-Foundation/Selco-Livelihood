import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/shared";
import {
  buildCreateIncidentPayload,
  buildVerificationDocuments,
  createIncident,
  searchPotentialDuplicates,
  type CreateIncidentInput,
} from "./incident";
import type { LivelihoodAsset, LivelihoodFacility } from "../types/facility-asset";
import type { VerificationDocument } from "../types/create-incident";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
  };
});

const endUser: LivelihoodFacility = {
  tenantId: "tenant-1",
  facilityId: "facility-1",
  facilityPocName: "Poc Name",
  facilityPocUsername: "poc-user",
  facilityPocPhone: "9999999999",
  facilityPocEmail: "poc@example.com",
  endUserUuid: "eu1",
  boundaryCode: "b1",
};

const asset: LivelihoodAsset = {
  assetId: "a1",
  tenantId: "tenant-1",
  facilityId: "facility-1",
  boundaryCode: "b1",
  assetTypeId: "PANEL",
  name: "Panel",
};

function buildInput(overrides: Partial<CreateIncidentInput> = {}): CreateIncidentInput {
  return {
    tenantId: "tenant-1",
    endUser,
    asset,
    complaintType: { code: "NOT_WORKING", name: "Not working" },
    uploadedDocuments: [],
    user: { uuid: "u1", userName: "user-1", name: "User One", tenantId: "tenant-1", roles: [] },
    accessToken: "token-1",
    ...overrides,
  };
}

describe("buildVerificationDocuments", () => {
  it("normalizes a documentType starting with 'video' (any case) to VIDEO", () => {
    const docs: VerificationDocument[] = [
      { fileStoreId: "fs1", documentUid: "id1", documentType: "Video/mp4", additionalDetails: {} },
    ];
    expect(buildVerificationDocuments(docs)[0].documentType).toBe("VIDEO");
  });

  it("normalizes a documentType starting with 'image' (any case) to PHOTO", () => {
    const docs: VerificationDocument[] = [
      { fileStoreId: "fs1", documentUid: "id1", documentType: "IMAGE/png", additionalDetails: {} },
    ];
    expect(buildVerificationDocuments(docs)[0].documentType).toBe("PHOTO");
  });

  it("leaves any other documentType unchanged", () => {
    const docs: VerificationDocument[] = [
      { fileStoreId: "fs1", documentUid: "id1", documentType: "FIR", additionalDetails: {} },
    ];
    expect(buildVerificationDocuments(docs)[0].documentType).toBe("FIR");
  });
});

describe("buildCreateIncidentPayload", () => {
  it("resolves incidentType with priority serviceCode > key > code", () => {
    expect(
      buildCreateIncidentPayload(
        buildInput({ complaintType: { code: "C", key: "K", serviceCode: "S", name: "n" } }),
      ).incident.incidentType,
    ).toBe("S");
    expect(
      buildCreateIncidentPayload(buildInput({ complaintType: { code: "C", key: "K", name: "n" } }))
        .incident.incidentType,
    ).toBe("K");
    expect(
      buildCreateIncidentPayload(buildInput({ complaintType: { code: "C", name: "n" } })).incident
        .incidentType,
    ).toBe("C");
  });

  it("builds the POC on-behalf shape when the user holds LIVELIHOOD_POC", () => {
    const input = buildInput({ user: { uuid: "poc-u", roles: [{ code: "LIVELIHOOD_POC" }] } });

    const payload = buildCreateIncidentPayload(input);

    expect(payload.incident).toMatchObject({
      reporterType: "COMPLAINANT",
      accountId: "eu1",
      reporterTenant: "tenant-1",
      facilityId: "facility-1",
      assetId: "a1",
      boundaryCode: "b1",
      createdOnBehalf: true,
      entryChannel: "POC_MANUAL",
      reporter: {
        uuid: "eu1",
        userName: "poc-user",
        name: "Poc Name",
        mobileNumber: "9999999999",
        emailId: "poc@example.com",
        type: "EMPLOYEE",
        tenantId: "tenant-1",
      },
    });
    expect(payload.workflow).toEqual({ action: "CREATE", verificationDocuments: [] });
  });

  it("builds the direct-report shape when the user does not hold LIVELIHOOD_POC", () => {
    const input = buildInput({
      user: { uuid: "u1", userName: "user-1", name: "User One", tenantId: "tenant-1", roles: [] },
    });

    const payload = buildCreateIncidentPayload(input);

    expect(payload.incident).toMatchObject({
      tenantId: "tenant-1",
      facilityId: "facility-1",
      assetId: "a1",
      boundaryCode: "b1",
      entryChannel: "DIRECT",
      reporter: {
        uuid: "u1",
        userName: "user-1",
        name: "User One",
        tenantId: "tenant-1",
        type: "EMPLOYEE",
      },
    });
    expect(payload.incident).not.toHaveProperty("createdOnBehalf");
  });

  it("only includes additionalDetail.fileStoreId when there are uploaded documents", () => {
    const withoutDocs = buildCreateIncidentPayload(buildInput({ uploadedDocuments: [] }));
    expect(withoutDocs.incident).not.toHaveProperty("additionalDetail");

    const doc: VerificationDocument = {
      fileStoreId: "fs1",
      documentUid: "id1",
      documentType: "PHOTO",
      additionalDetails: {},
    };
    const withDocs = buildCreateIncidentPayload(buildInput({ uploadedDocuments: [doc] }));
    expect(withDocs.incident).toMatchObject({ additionalDetail: { fileStoreId: [doc] } });
  });
});

describe("createIncident", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the built payload alongside RequestInfo, with tenantId as a param", async () => {
    const responseData = { IncidentWrappers: [{ incident: { incidentId: "incident-1" } }] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: responseData });
    const input = buildInput();

    const result = await createIncident(input);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/im-services/v2/request/_create",
      expect.objectContaining({
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        incident: expect.objectContaining({ facilityId: "facility-1" }),
        workflow: expect.objectContaining({ action: "CREATE" }),
      }),
      { params: { tenantId: "tenant-1" } },
    );
    expect(result).toEqual(responseData);
    expect(result).toBe(responseData);
  });

  it("returns the error response body when the request rejects with one", async () => {
    const errorBody = { Errors: [{ message: "DUPLICATE" }] };
    vi.mocked(apiClient.post).mockRejectedValue({ response: { data: errorBody } });

    const result = await createIncident(buildInput());

    expect(result).toEqual(errorBody);
  });

  it("falls back to a generic CREATE_FAILED error when the rejection carries no response data", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("network down"));

    const result = await createIncident(buildInput());

    expect(result).toEqual({ Errors: [{ message: "CREATE_FAILED" }] });
  });
});

describe("searchPotentialDuplicates", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("searches the inbox scoped to the facility/incidentType/open-duplicate statuses", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { items: [], totalCount: 0 } });

    await searchPotentialDuplicates(
      "tenant-1",
      { state: ["s1"] },
      "facility-1",
      "NOT_WORKING",
      "token-1",
      null,
    );

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as {
      inbox: { moduleSearchCriteria: Record<string, unknown>; processSearchCriteria: Record<string, unknown> };
    };
    expect(body.inbox.moduleSearchCriteria).toMatchObject({
      facility: ["facility-1"],
      incidentType: ["NOT_WORKING"],
    });
    expect(body.inbox.processSearchCriteria).toMatchObject({
      businessService: ["LivelihoodIncident"],
    });
  });

  it("maps inbox items to ticketId/ticketTenantId, filtering out items without an incidentId", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        items: [
          { businessObject: { incident: { incidentId: "t1", tenantId: "tenant-2" } } },
          { businessObject: { incident: { incidentId: "" } } },
          { businessObject: {} },
        ],
        totalCount: 3,
      },
    });

    const result = await searchPotentialDuplicates(
      "tenant-1",
      {},
      "facility-1",
      "NOT_WORKING",
      "token-1",
      null,
    );

    expect(result).toEqual([{ ticketId: "t1", ticketTenantId: "tenant-2" }]);
  });

  it("falls back ticketTenantId to the given tenantId when the incident has none", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { items: [{ businessObject: { incident: { incidentId: "t1" } } }], totalCount: 1 },
    });

    const result = await searchPotentialDuplicates(
      "tenant-1",
      {},
      "facility-1",
      "NOT_WORKING",
      "token-1",
      null,
    );

    expect(result).toEqual([{ ticketId: "t1", ticketTenantId: "tenant-1" }]);
  });
});
