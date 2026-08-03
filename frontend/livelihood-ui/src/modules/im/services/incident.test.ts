/**
 * Unit tests for `src/modules/im/services/incident.ts`.
 *
 * Covers the four exported building blocks used by the "create incident" flow:
 *  - `buildVerificationDocuments`  – pure mapping of raw MIME-ish documentType
 *    strings to the coarse VIDEO/PHOTO/other bucket the backend expects.
 *  - `buildCreateIncidentPayload`  – pure function that shapes the request
 *    body differently depending on whether the acting user is a facility POC
 *    (creating "on behalf of" the end user) or a regular employee.
 *  - `createIncident`              – thin async wrapper around `apiClient.post`
 *    that normalizes both success and failure into a `CreateIncidentResponse`
 *    shape, swallowing axios errors instead of throwing.
 *  - `searchPotentialDuplicates`   – queries the inbox search service for
 *    open incidents against the same facility/incidentType and reshapes the
 *    results into ticket id/tenant pairs, filtering out unresolved ids.
 *
 * Mocking strategy:
 *  - `buildVerificationDocuments`/`buildCreateIncidentPayload` are pure, so
 *    they are exercised directly with plain object builders (`buildEndUser`,
 *    `buildAsset`, `buildComplaintType`, `buildInput`) and need no mocks.
 *  - `createIncident` mocks `apiClient.post` via `vi.spyOn` to simulate
 *    success/rejection without hitting the network; `mockAxiosSuccess` wraps
 *    a payload in the axios response envelope the real client would return.
 *  - `searchPotentialDuplicates` mocks the `searchInbox` module function
 *    (imported as `inboxService`) rather than the HTTP layer, since that is
 *    the collaborator this function actually calls.
 *  - `afterEach(vi.restoreAllMocks)` ensures spies from one test (e.g. on
 *    `apiClient.post` or `searchInbox`) never leak into the next.
 */
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

// `buildVerificationDocuments` takes the raw uploaded documents (each with a
// free-form `documentType` string, typically a MIME type like "video/mp4")
// and normalizes it to "VIDEO", "PHOTO", or leaves it untouched if it matches
// neither prefix (e.g. a document type code like "FIR_DOCUMENT"). It is a
// pure array map with no side effects, so no mocking is required.
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

// `buildCreateIncidentPayload` is a pure function that assembles the
// incident/workflow request body sent to the create-incident API. Its shape
// branches on `hasRole(input.user.roles, "LIVELIHOOD_POC")`:
//  - POC users are creating the incident "on behalf of" the facility end
//    user, so the payload marks `createdOnBehalf: true`, uses
//    `entryChannel: "POC_MANUAL"`, and sets the reporter to the end user's
//    POC details (via `buildOnBehalfReporter`).
//  - Non-POC (regular employee) users get `entryChannel: "DIRECT"` and the
//    reporter is the acting user themselves.
// In both branches `incidentType` is derived from complaintType with
// serviceCode > key > code precedence, and `additionalDetail` is only
// attached when there are uploaded documents.
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

  // The incidentType field falls back through three complaintType properties
  // in order (serviceCode, then key, then code) via nullish coalescing, so
  // each precedence level must be verified with a complaintType that only
  // provides fields from that level downward.
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

  // `additionalDetail` is spread in conditionally: an empty object when
  // `uploadedDocuments` is empty (so the key is absent, not just falsy) vs.
  // an object carrying `fileStoreId` when documents exist. `Object.hasOwn`
  // is used rather than a truthiness check to assert the key's presence.
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

// `createIncident` builds the payload via `buildCreateIncidentPayload`,
// POSTs it to `/im-services/v2/request/_create`, and never throws: it
// catches any axios rejection and returns the server's `Errors` body when
// present, or a generic `{ Errors: [{ message: "CREATE_FAILED" }] }` when the
// rejection has no structured response (e.g. a network error). `apiClient.post`
// is mocked with `vi.spyOn` so no real HTTP call is made.
describe("createIncident", () => {
  it("returns the response data on success", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ IncidentWrappers: [{ incident: { incidentId: "INC-1" } }] }),
    );
    const result = await createIncident(buildInput());
    expect(result).toEqual({ IncidentWrappers: [{ incident: { incidentId: "INC-1" } }] });
  });

  // Simulates the backend rejecting the axios promise with a response body
  // shaped like `{ response: { data: { Errors: [...] } } }`; the function
  // must unwrap and return that `data` rather than throwing.
  it("returns the error response body when the request fails with a structured error", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValue({
      response: { data: { Errors: [{ message: "DUPLICATE_INCIDENT" }] } },
    });
    const result = await createIncident(buildInput());
    expect(result).toEqual({ Errors: [{ message: "DUPLICATE_INCIDENT" }] });
  });

  // A plain Error (e.g. a network failure) has no `.response` property at
  // all, so the optional chaining on `axiosError.response?.data` yields
  // undefined and the function must fall back to the generic CREATE_FAILED
  // error rather than crashing or returning undefined.
  it("falls back to a generic CREATE_FAILED error when the rejection has no response body", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValue(new Error("network down"));
    const result = await createIncident(buildInput());
    expect(result).toEqual({ Errors: [{ message: "CREATE_FAILED" }] });
  });
});

// `searchPotentialDuplicates` queries the shared inbox search (`searchInbox`)
// scoped to the livelihood incident business service, the given facility and
// incidentType, and the "open" duplicate application statuses
// (`OPEN_DUPLICATE_APPLICATION_STATUSES`), then reshapes each returned item
// into a `{ ticketId, ticketTenantId }` pair. `ticketTenantId` falls back to
// the passed-in `tenantId` when the item's incident lacks one, and any item
// whose `incidentId` resolves to an empty string (e.g. no `businessObject`)
// is filtered out. `searchInbox` is mocked directly since it is the only
// collaborator this function calls.
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
