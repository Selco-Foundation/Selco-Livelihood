import { describe, expect, it } from "vitest";
import {
  buildFilterQueryFromState,
  buildIncidentInboxFilters,
  flattenInboxFilters,
  type IncidentFilterInput,
} from "./inbox-filters";

describe("buildIncidentInboxFilters", () => {
  it("builds base search/workflow filters with tenantId and moduleName when nothing else is set", () => {
    const result = buildIncidentInboxFilters({}, "tenant-1");

    expect(result).toEqual({
      searchFilters: { tenantId: "tenant-1" },
      workflowFilters: { moduleName: "Incident", tenantId: "tenant-1" },
      limit: undefined,
      offset: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      applicationNumber: undefined,
    });
  });

  it("sets applicationNumber from incidentId when IncidentWrappers is set", () => {
    const result = buildIncidentInboxFilters(
      { IncidentWrappers: true, incidentId: "INC-1" },
      "tenant-1",
    );
    expect(result.searchFilters.applicationNumber).toBe("INC-1");
  });

  it("splits a comma-separated wfStatus into workflowFilters.status", () => {
    const result = buildIncidentInboxFilters({ wfStatus: "OPEN,CLOSED" }, "tenant-1");
    expect(result.workflowFilters.status).toEqual(["OPEN", "CLOSED"]);
  });

  it("intersects wfStatus with applicationStatus when both are present", () => {
    const result = buildIncidentInboxFilters(
      { wfStatus: "OPEN,CLOSED", applicationStatus: "CLOSED,RESOLVED" },
      "tenant-1",
    );
    expect(result.workflowFilters.status).toEqual(["CLOSED"]);
  });

  it("falls back to a single blank-string status when wfStatus and applicationStatus have no overlap", () => {
    const result = buildIncidentInboxFilters(
      { wfStatus: "OPEN", applicationStatus: "CLOSED" },
      "tenant-1",
    );
    expect(result.workflowFilters.status).toEqual([""]);
  });

  it("uses applicationStatus for workflowFilters.status when wfStatus is absent", () => {
    const result = buildIncidentInboxFilters({ applicationStatus: "OPEN" }, "tenant-1");
    expect(result.workflowFilters.status).toEqual(["OPEN"]);
  });

  it("splits assetType, incidentType, and incidentSubType on commas", () => {
    const result = buildIncidentInboxFilters(
      { assetType: "SOLAR,WIND", incidentType: "TYPE_A", incidentSubType: "SUB_A,SUB_B" },
      "tenant-1",
    );
    expect(result.searchFilters.assetType).toEqual(["SOLAR", "WIND"]);
    expect(result.searchFilters.incidentType).toEqual(["TYPE_A"]);
    expect(result.searchFilters.incidentSubType).toEqual(["SUB_A", "SUB_B"]);
  });

  it("prefers facility over block, district, and state when several are set", () => {
    const result = buildIncidentInboxFilters(
      { facility: "FAC_1", block: "BLOCK_1", district: "DIST_1", state: "STATE_1" },
      "tenant-1",
    );
    expect(result.searchFilters).toMatchObject({ facility: ["FAC_1"] });
    expect(result.searchFilters.block).toBeUndefined();
    expect(result.searchFilters.district).toBeUndefined();
    expect(result.searchFilters.state).toBeUndefined();
  });

  it("prefers block over district and state when facility is absent", () => {
    const result = buildIncidentInboxFilters(
      { block: "BLOCK_1", district: "DIST_1", state: "STATE_1" },
      "tenant-1",
    );
    expect(result.searchFilters.block).toEqual(["BLOCK_1"]);
    expect(result.searchFilters.district).toBeUndefined();
  });

  it("prefers district over state when facility and block are absent", () => {
    const result = buildIncidentInboxFilters({ district: "DIST_1", state: "STATE_1" }, "tenant-1");
    expect(result.searchFilters.district).toEqual(["DIST_1"]);
    expect(result.searchFilters.state).toBeUndefined();
  });

  it("falls back to state when facility, block, and district are absent", () => {
    const result = buildIncidentInboxFilters({ state: "STATE_1" }, "tenant-1");
    expect(result.searchFilters.state).toEqual(["STATE_1"]);
  });

  it("sets workflowFilters.assignee when assignee is present", () => {
    const result = buildIncidentInboxFilters({ assignee: "user-1" }, "tenant-1");
    expect(result.workflowFilters.assignee).toBe("user-1");
  });

  it("sets searchFilters.mobileNumber when present", () => {
    const result = buildIncidentInboxFilters({ mobileNumber: "9999999999" }, "tenant-1");
    expect(result.searchFilters.mobileNumber).toBe("9999999999");
  });

  it("sets workflowFilters.businessService from services", () => {
    const result = buildIncidentInboxFilters({ services: ["LivelihoodIncident"] }, "tenant-1");
    expect(result.workflowFilters.businessService).toEqual(["LivelihoodIncident"]);
  });

  it("sets searchFilters.nearingSLA to 3 days in ms when nearingSLA is true", () => {
    const result = buildIncidentInboxFilters({ nearingSLA: true }, "tenant-1");
    expect(result.searchFilters.nearingSLA).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it("omits nearingSLA when false", () => {
    const result = buildIncidentInboxFilters({ nearingSLA: false }, "tenant-1");
    expect(result.searchFilters.nearingSLA).toBeUndefined();
  });

  it("passes through limit, offset, sortBy, sortOrder, and applicationNumber", () => {
    const filters: IncidentFilterInput = {
      limit: 10,
      offset: 20,
      sortBy: "createdTime",
      sortOrder: "DESC",
      applicationNumber: "APP-1",
    };
    const result = buildIncidentInboxFilters(filters, "tenant-1");
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
    expect(result.sortBy).toBe("createdTime");
    expect(result.sortOrder).toBe("DESC");
    expect(result.applicationNumber).toBe("APP-1");
  });
});

describe("buildFilterQueryFromState", () => {
  it("joins each pgrfilters property's codes into a comma-separated query string", () => {
    const result = buildFilterQueryFromState({
      pgrfilters: {
        assetType: [{ code: "SOLAR" }, { code: "WIND" }],
      },
    });
    expect(result.pgrQuery).toEqual({ assetType: "SOLAR,WIND" });
  });

  it("joins each wfFilters property's codes into a comma-separated query string", () => {
    const result = buildFilterQueryFromState({
      wfFilters: { assignee: [{ code: "user-1" }, { code: "user-2" }] },
    });
    expect(result.wfQuery).toEqual({ assignee: "user-1,user-2" });
  });

  it("omits a property whose values array is empty", () => {
    const result = buildFilterQueryFromState({ pgrfilters: { assetType: [] } });
    expect(result.pgrQuery).toEqual({});
  });

  it("skips a property whose value is not an array", () => {
    const result = buildFilterQueryFromState({
      pgrfilters: { assetType: "not-an-array" as unknown as Array<{ code: string }> },
    });
    expect(result.pgrQuery).toEqual({});
  });

  it("returns empty queries when no filters are given", () => {
    expect(buildFilterQueryFromState({})).toEqual({ pgrQuery: {}, wfQuery: {} });
  });
});

describe("flattenInboxFilters", () => {
  it("merges defaults with pgrQuery and wfQuery, pgr/wf taking precedence", () => {
    const result = flattenInboxFilters(
      {
        filters: { pgrQuery: { facility: "FAC_1" }, wfQuery: { assignee: "user-1" } },
        limit: 10,
        offset: 0,
        nearingSLA: true,
      },
      { block: "BLOCK_1" },
    );

    expect(result).toMatchObject({
      block: "BLOCK_1",
      facility: "FAC_1",
      assignee: "user-1",
      limit: 10,
      offset: 0,
      nearingSLA: true,
    });
  });

  it("defaults services to the livelihood incident business service when defaults.services is absent", () => {
    const result = flattenInboxFilters({}, {});
    expect(result.services).toEqual(["LivelihoodIncident"]);
  });

  it("keeps the provided defaults.services when set", () => {
    const result = flattenInboxFilters({}, { services: ["CustomService"] });
    expect(result.services).toEqual(["CustomService"]);
  });

  it("defaults sortOrder to DESC when defaults.sortOrder is absent", () => {
    const result = flattenInboxFilters({}, {});
    expect(result.sortOrder).toBe("DESC");
  });

  it("keeps the provided defaults.sortOrder when set", () => {
    const result = flattenInboxFilters({}, { sortOrder: "ASC" });
    expect(result.sortOrder).toBe("ASC");
  });

  it("handles missing filters entirely", () => {
    const result = flattenInboxFilters({ limit: 5, offset: 0 }, { district: "DIST_1" });
    expect(result).toMatchObject({ district: "DIST_1", limit: 5, offset: 0 });
  });
});
