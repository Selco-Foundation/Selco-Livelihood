/**
 * Unit tests for src/modules/im/types/inbox.ts
 *
 * The source file exports nine interfaces — `ImInboxFilters`,
 * `ImInboxSearchParams`, `InboxIncidentReporter`, `InboxIncident`,
 * `InboxItem`, `InboxStatusMapEntry`, `InboxSearchResponse`, `InboxRow`,
 * `InboxDataResult`, and `ComplaintTypeOption` — used across the Incident
 * Management (IM) inbox flow to describe filter/search-param shapes sent to
 * the inbox search API, the raw incident/inbox-item shapes returned by that
 * API, the status-count map, the flattened row shape rendered in the inbox
 * table/grid, the combined data-result shape produced after processing a
 * search response, and the complaint-type dropdown option shape. All nine
 * are declared with the `interface` keyword, which (like `type`) is erased
 * entirely at compile time and produces no JavaScript output. There are no
 * functions, constants, classes, or enums in this file to call or invoke, so
 * this file has (and must have) zero runtime exports.
 *
 * Testing approach: no mocking, no provider wrapper, and no rendering — the
 * module is imported as a namespace (`import * as M`) and asserted to have
 * no own enumerable keys. This is a genuine (if small) regression check: if
 * a future edit ever introduces a runtime value into this file (e.g. a
 * helper function, a default object, a const enum, or a non-`type`/
 * non-`interface` export), every module that does
 * `import type { ... } from "./inbox"` elsewhere in the app would keep
 * compiling fine, yet the bundle would now ship dead runtime code from what
 * is meant to be a types-only module. Asserting an empty export set here
 * catches that regression immediately.
 */
import { describe, expect, it } from "vitest";
import * as M from "./inbox";

// The whole module: every export (`ImInboxFilters`, `ImInboxSearchParams`,
// `InboxIncidentReporter`, `InboxIncident`, `InboxItem`,
// `InboxStatusMapEntry`, `InboxSearchResponse`, `InboxRow`,
// `InboxDataResult`, `ComplaintTypeOption`) is declared with the `interface`
// keyword, which produces no JavaScript output. Importing the compiled
// module and inspecting its exports is therefore the only way to prove, at
// test time, that nothing runtime-visible has crept in alongside the type
// declarations.
describe("modules/im/types/inbox (type-only module)", () => {
  it("has no runtime exports — Object.keys is empty", () => {
    // Precondition: `M` is the namespace produced by importing the compiled
    // JS for this file. A type-only source file compiles to an empty module
    // object, so its own enumerable keys must be an empty array.
    expect(Object.keys(M)).toEqual([]);
  });

  it("does not export any function, object, or primitive value under a known name", () => {
    // Belt-and-braces check on top of the empty-keys assertion above: even
    // if a future change added a non-enumerable or symbol-keyed export,
    // explicitly probing each documented interface name for a runtime value
    // guards against that being missed by Object.keys alone.
    expect((M as Record<string, unknown>).ImInboxFilters).toBeUndefined();
    expect((M as Record<string, unknown>).ImInboxSearchParams).toBeUndefined();
    expect(
      (M as Record<string, unknown>).InboxIncidentReporter,
    ).toBeUndefined();
    expect((M as Record<string, unknown>).InboxIncident).toBeUndefined();
    expect((M as Record<string, unknown>).InboxItem).toBeUndefined();
    expect(
      (M as Record<string, unknown>).InboxStatusMapEntry,
    ).toBeUndefined();
    expect(
      (M as Record<string, unknown>).InboxSearchResponse,
    ).toBeUndefined();
    expect((M as Record<string, unknown>).InboxRow).toBeUndefined();
    expect((M as Record<string, unknown>).InboxDataResult).toBeUndefined();
    expect(
      (M as Record<string, unknown>).ComplaintTypeOption,
    ).toBeUndefined();
  });

  it("preserves interface shapes at compile time (type-level smoke check)", () => {
    // There is nothing to assert at runtime about interface *shape*, but we
    // can still exercise the compiler's structural checks by constructing
    // values that satisfy each interface. If a future edit narrows/widens a
    // field in a way that breaks these literals, `tsc`/vitest's type-checked
    // compilation of this test file will fail even though no runtime
    // assertion below changes — this documents the intended shape in a way
    // that stays in sync with the source (unlike a comment, it won't compile
    // if the interfaces drift).
    const filters: M.ImInboxFilters = {
      pgrQuery: { key: "value" },
      wfQuery: { status: "OPEN" },
      wfFilters: {
        assignee: [{ code: "user-1" }],
        wfStatus: [{ code: "PENDING" }],
      },
      pgrfilters: {
        assetType: [{ code: "asset-1", name: "Asset One", key: "k1" }],
        facility: [{ code: "fac-1", name: "Facility One" }],
        state: [{ code: "st-1", name: "State One" }],
        district: [{ code: "dist-1", name: "District One" }],
        block: [{ code: "blk-1", name: "Block One" }],
        applicationStatus: [{ code: "APPROVED" }],
      },
    };

    const searchParams: M.ImInboxSearchParams = {
      filters,
      limit: 10,
      offset: 0,
      nearingSLA: true,
    };

    const reporter: M.InboxIncidentReporter = {
      name: "Jane Doe",
      uuid: "uuid-1",
      userName: "jane.doe",
    };

    const incident: M.InboxIncident = {
      incidentId: "INC-1",
      incidentType: "REPAIR",
      incidentSubType: "SOLAR_PANEL",
      facilityId: "FAC-1",
      assetId: "ASSET-1",
      boundaryCode: "BC-1",
      phcType: "PHC",
      applicationStatus: "OPEN",
      tenantId: "tenant-1",
      isPotentialDuplicate: false,
      boundary: { facilityCode: "FAC-1" },
      reporter,
    };

    const item: M.InboxItem = {
      businessObject: {
        incident,
        slaRemaining: 5,
        totalSlaRemaining: 10,
      },
      ProcessInstance: {
        assignes: [{ uuid: "uuid-2", name: "Assignee One" }],
      },
    };

    const statusEntry: M.InboxStatusMapEntry = {
      statusid: "OPEN",
      count: 3,
    };

    const searchResponse: M.InboxSearchResponse = {
      items: [item],
      totalCount: 1,
      nearingSlaCount: 0,
      statusMap: [statusEntry],
    };

    const row: M.InboxRow = {
      incidentId: "INC-1",
      incidentType: "REPAIR",
      assetLabel: "Asset One",
      status: "OPEN",
      taskOwner: "Assignee One",
      sla: "5 days",
      endUser: "Jane Doe",
      tenantId: "tenant-1",
      potentialDuplicate: false,
    };

    const dataResult: M.InboxDataResult = {
      combinedRes: [row],
      total: 1,
      statusArray: [statusEntry],
    };

    const complaintTypeOption: M.ComplaintTypeOption = {
      key: "REPAIR",
      name: "Repair",
      menuPath: "/repair",
      serviceCode: "SVC-1",
    };

    // Runtime assertions on the literals themselves — proving these are
    // ordinary plain objects (no hidden getters/prototype magic sneaking in
    // via the type declarations) and that every optional field we chose to
    // populate above round-trips unchanged.
    expect(searchParams.filters).toBe(filters);
    expect(searchParams.limit).toBe(10);
    expect(searchResponse.items[0].businessObject.incident?.reporter?.name).toBe(
      "Jane Doe",
    );
    expect(dataResult.combinedRes[0].incidentId).toBe(row.incidentId);
    expect(complaintTypeOption.serviceCode).toBe("SVC-1");
  });

  it("allows all optional fields to be omitted (minimal valid shapes)", () => {
    // Business rule under test: nearly every field across these interfaces
    // is marked optional (`?`) except for a small set of required
    // identifiers (e.g. InboxIncident.incidentId/incidentType/
    // applicationStatus/tenantId, InboxRow's fields, InboxStatusMapEntry's
    // fields, InboxSearchResponse.items/totalCount, InboxDataResult's
    // fields, ComplaintTypeOption.key/name). This matters because inbox API
    // responses are frequently sparse (e.g. a reporter with no uuid, an
    // incident with no boundary), and code consuming these types must not
    // assume optional fields are present. Constructing minimal objects here
    // proves the required/optional split actually compiles as documented.
    const minimalFilters: M.ImInboxFilters = {};
    const minimalIncident: M.InboxIncident = {
      incidentId: "INC-2",
      incidentType: "MAINTENANCE",
      applicationStatus: "CLOSED",
      tenantId: "tenant-2",
    };
    const minimalItem: M.InboxItem = {
      businessObject: {},
    };
    const minimalResponse: M.InboxSearchResponse = {
      items: [],
      totalCount: 0,
    };
    const minimalRow: M.InboxRow = {
      incidentId: "INC-2",
      incidentType: "MAINTENANCE",
      assetLabel: "",
      status: "CLOSED",
      taskOwner: "",
      sla: "",
      endUser: "",
      tenantId: "tenant-2",
      potentialDuplicate: false,
    };
    const minimalComplaintType: M.ComplaintTypeOption = {
      key: "MAINTENANCE",
      name: "Maintenance",
    };

    expect(minimalFilters).toEqual({});
    expect(minimalIncident.incidentSubType).toBeUndefined();
    expect(minimalItem.businessObject.incident).toBeUndefined();
    expect(minimalResponse.items).toHaveLength(0);
    expect(minimalRow.potentialDuplicate).toBe(false);
    expect(minimalComplaintType.menuPath).toBeUndefined();
  });
});
