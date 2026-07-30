import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, type AuthUser, type JurisdictionBoundaries } from "@/shared";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import type { LivelihoodAsset, LivelihoodFacility } from "../types/facility-asset";
import type { SelectOption, VerificationDocument } from "../types/create-incident";
import * as inboxService from "./inbox";
import {
  buildCreateIncidentPayload,
  buildVerificationDocuments,
  createIncident,
  searchPotentialDuplicates,
  type CreateIncidentInput,
} from "./incident";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildVerificationDocuments", () => {
  it("maps a video/* documentType to VIDEO", () => {
    const docs: VerificationDocument[] = [
      { fileStoreId: "f1", documentUid: "", documentType: "video/mp4", additionalDetails: {} },
    ];
    expect(buildVerificationDocuments(docs)[0].documentType).toBe("VIDEO");
  });

  it("maps an image/* documentType to PHOTO", () => {
    const docs: VerificationDocument[] = [
      { fileStoreId: "f1", documentUid: "", documentType: "image/png", additionalDetails: {} },
    ];
    expect(buildVerificationDocuments(docs)[0].documentType).toBe("PHOTO");
  });

  it("leaves any other documentType unchanged", () => {
    const docs: VerificationDocument[] = [
      { fileStoreId: "f1", documentUid: "", documentType: "FIR_DOCUMENT", additionalDetails: {} },
    ];
    expect(buildVerificationDocuments(docs)[0].documentType).toBe("FIR_DOCUMENT");
  });
});

function buildEndUser(overrides: Partial<LivelihoodFacility> = {}): LivelihoodFacility {
  return {
    tenantId: "livelihood",
    facilityId: "fac-1",
    facilityPocName: "Poc Name",
    boundaryCode: "B1",
    endUserUuid: "end-user-1",
    facilityPocUsername: "poc.user",
    facilityPocPhone: "9999999999",
    facilityPocEmail: "poc@example.com",
    ...overrides,
  };
}

function buildAsset(overrides: Partial<LivelihoodAsset> = {}): LivelihoodAsset {
  return {
    assetId: "asset-1",
    tenantId: "livelihood",
    facilityId: "fac-1",
    boundaryCode: "B1",
    assetTypeId: "streetlight",
    name: "Streetlight 1",
    ...overrides,
  };
}

function buildComplaintType(overrides: Partial<SelectOption> = {}): SelectOption {
  return { code: "STREETLIGHT", name: "Streetlight", ...overrides };
}

function buildInput(overrides: Partial<CreateIncidentInput> = {}): CreateIncidentInput {
  return {
    tenantId: "livelihood",
    endUser: buildEndUser(),
    asset: buildAsset(),
    complaintType: buildComplaintType(),
    uploadedDocuments: [],
    user: { uuid: "user-1", roles: [{ code: "LIVELIHOOD_VENDOR" }] },
    accessToken: "token",
    ...overrides,
  };
}

describe("buildCreateIncidentPayload", () => {
  it("builds a POC-create payload when the user has the LIVELIHOOD_POC role", () => {
    const input = buildInput({ user: { uuid: "poc-1", roles: [{ code: "LIVELIHOOD_POC" }] } });
    const payload = buildCreateIncidentPayload(input);

    expect(payload.incident.reporterType).toBe("COMPLAINANT");
    expect(payload.incident.entryChannel).toBe("POC_MANUAL");
    expect(payload.incident.createdOnBehalf).toBe(true);
    expect(payload.incident.reporter).toMatchObject({ uuid: "end-user-1", type: "EMPLOYEE" });
  });

  it("builds a direct-create payload for a non-POC user", () => {
    const input = buildInput({
      user: { uuid: "emp-1", userName: "emp.user", name: "Employee One", roles: [{ code: "COMPLAINT_RESOLVER" }] },
    });
    const payload = buildCreateIncidentPayload(input);

    expect(payload.incident.entryChannel).toBe("DIRECT");
    expect((payload.incident as { createdOnBehalf?: boolean }).createdOnBehalf).toBeUndefined();
    expect(payload.incident.reporter).toMatchObject({ uuid: "emp-1", type: "EMPLOYEE" });
  });

  it("derives incidentType with the serviceCode > key > code precedence", () => {
    const withServiceCode = buildCreateIncidentPayload(
      buildInput({ complaintType: { code: "C", key: "K", serviceCode: "SC", name: "n" } }),
    );
    const withKeyOnly = buildCreateIncidentPayload(
      buildInput({ complaintType: { code: "C", key: "K", name: "n" } }),
    );
    const withCodeOnly = buildCreateIncidentPayload(
      buildInput({ complaintType: { code: "C", name: "n" } }),
    );
    expect(withServiceCode.incident.incidentType).toBe("SC");
    expect(withKeyOnly.incident.incidentType).toBe("K");
    expect(withCodeOnly.incident.incidentType).toBe("C");
  });

  it("includes additionalDetail only when there are uploaded documents", () => {
    const withDocs = buildCreateIncidentPayload(
      buildInput({
        uploadedDocuments: [
          { fileStoreId: "f1", documentUid: "", documentType: "image/jpeg", additionalDetails: {} },
        ],
      }),
    );
    const withoutDocs = buildCreateIncidentPayload(buildInput({ uploadedDocuments: [] }));

    expect(Object.hasOwn(withDocs.incident, "additionalDetail")).toBe(true);
    expect(Object.hasOwn(withoutDocs.incident, "additionalDetail")).toBe(false);
  });

  it("always sets workflow.action to CREATE", () => {
    expect(buildCreateIncidentPayload(buildInput()).workflow.action).toBe("CREATE");
  });
});

describe("createIncident", () => {
  it("returns the response data on success", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ IncidentWrappers: [{ incident: { incidentId: "INC-1" } }] }),
    );
    const result = await createIncident(buildInput());
    expect(result).toEqual({ IncidentWrappers: [{ incident: { incidentId: "INC-1" } }] });
  });

  it("returns the error response body when the request fails with a structured error", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValue({
      response: { data: { Errors: [{ message: "DUPLICATE_INCIDENT" }] } },
    });
    const result = await createIncident(buildInput());
    expect(result).toEqual({ Errors: [{ message: "DUPLICATE_INCIDENT" }] });
  });

  it("falls back to a generic CREATE_FAILED error when the rejection has no response body", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValue(new Error("network down"));
    const result = await createIncident(buildInput());
    expect(result).toEqual({ Errors: [{ message: "CREATE_FAILED" }] });
  });
});

describe("searchPotentialDuplicates", () => {
  const jurisdiction: JurisdictionBoundaries = { state: ["S1"] };

  it("maps inbox items to ticket id/tenantId pairs", async () => {
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

    const result = await searchPotentialDuplicates(
      "livelihood",
      jurisdiction,
      "fac-1",
      "streetlight",
      "token",
      { uuid: "user-1" },
    );

    expect(result).toEqual([{ ticketId: "INC-1", ticketTenantId: "livelihood" }]);
  });

  it("filters out items with no incidentId", async () => {
    vi.spyOn(inboxService, "searchInbox").mockResolvedValue({
      items: [{ businessObject: {} }],
      totalCount: 1,
    });

    const result = await searchPotentialDuplicates(
      "livelihood",
      jurisdiction,
      "fac-1",
      "streetlight",
      "token",
      null,
    );

    expect(result).toEqual([]);
  });

  it("returns an empty array when the inbox response has no items", async () => {
    vi.spyOn(inboxService, "searchInbox").mockResolvedValue({ items: [], totalCount: 0 });

    const result = await searchPotentialDuplicates(
      "livelihood",
      jurisdiction,
      "fac-1",
      "streetlight",
      "token",
      null,
    );

    expect(result).toEqual([]);
  });
});
