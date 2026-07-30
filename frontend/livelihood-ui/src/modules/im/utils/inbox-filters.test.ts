import { describe, expect, it } from "vitest";
import { LIVELIHOOD_INCIDENT_BUSINESS_SERVICE } from "../constants/workflow";
import {
  buildFilterQueryFromState,
  buildIncidentInboxFilters,
  flattenInboxFilters,
} from "./inbox-filters";

describe("buildIncidentInboxFilters", () => {
  it("always sets tenantId and the base workflow filters", () => {
    const result = buildIncidentInboxFilters({}, "livelihood");
    expect(result.searchFilters.tenantId).toBe("livelihood");
    expect(result.workflowFilters).toMatchObject({
      moduleName: "Incident",
      tenantId: "livelihood",
    });
  });

  it("sets applicationNumber in searchFilters when IncidentWrappers + incidentId are set", () => {
    const result = buildIncidentInboxFilters(
      { IncidentWrappers: true, incidentId: "INC-1" },
      "livelihood",
    );
    expect(result.searchFilters.applicationNumber).toBe("INC-1");
  });

  it("splits a comma-separated wfStatus into an array", () => {
    const result = buildIncidentInboxFilters({ wfStatus: "OPEN,CLOSED" }, "livelihood");
    expect(result.workflowFilters.status).toEqual(["OPEN", "CLOSED"]);
  });

  it("wraps a single wfStatus value in an array", () => {
    const result = buildIncidentInboxFilters({ wfStatus: "OPEN" }, "livelihood");
    expect(result.workflowFilters.status).toEqual(["OPEN"]);
  });

  it("intersects wfStatus with applicationStatus when both are given", () => {
    const result = buildIncidentInboxFilters(
      { wfStatus: "OPEN,CLOSED,PENDING", applicationStatus: "CLOSED,PENDING" },
      "livelihood",
    );
    expect(result.workflowFilters.status).toEqual(["CLOSED", "PENDING"]);
  });

  it("falls back to [''] when the wfStatus/applicationStatus intersection is empty", () => {
    const result = buildIncidentInboxFilters(
      { wfStatus: "OPEN", applicationStatus: "CLOSED" },
      "livelihood",
    );
    expect(result.workflowFilters.status).toEqual([""]);
  });

  it("uses applicationStatus alone when wfStatus is absent", () => {
    const result = buildIncidentInboxFilters({ applicationStatus: "CLOSED,OPEN" }, "livelihood");
    expect(result.workflowFilters.status).toEqual(["CLOSED", "OPEN"]);
  });

  it("splits assetType/incidentType/incidentSubType as CSV", () => {
    const result = buildIncidentInboxFilters(
      { assetType: "A1,A2", incidentType: "T1", incidentSubType: "ST1,ST2" },
      "livelihood",
    );
    expect(result.searchFilters.assetType).toEqual(["A1", "A2"]);
    expect(result.searchFilters.incidentType).toEqual(["T1"]);
    expect(result.searchFilters.incidentSubType).toEqual(["ST1", "ST2"]);
  });

  it("prefers facility over block/district/state when facility is set", () => {
    const result = buildIncidentInboxFilters(
      { facility: "F1", block: "B1", district: "D1", state: "S1" },
      "livelihood",
    );
    expect(result.searchFilters.facility).toEqual(["F1"]);
    expect(result.searchFilters.block).toBeUndefined();
    expect(result.searchFilters.district).toBeUndefined();
    expect(result.searchFilters.state).toBeUndefined();
  });

  it("prefers block over district/state when facility is absent", () => {
    const result = buildIncidentInboxFilters({ block: "B1", district: "D1", state: "S1" }, "livelihood");
    expect(result.searchFilters.block).toEqual(["B1"]);
    expect(result.searchFilters.district).toBeUndefined();
  });

  it("prefers district over state when facility/block are absent", () => {
    const result = buildIncidentInboxFilters({ district: "D1", state: "S1" }, "livelihood");
    expect(result.searchFilters.district).toEqual(["D1"]);
    expect(result.searchFilters.state).toBeUndefined();
  });

  it("falls back to state when facility/block/district are all absent", () => {
    const result = buildIncidentInboxFilters({ state: "S1" }, "livelihood");
    expect(result.searchFilters.state).toEqual(["S1"]);
  });

  it("sets assignee on workflowFilters when provided", () => {
    const result = buildIncidentInboxFilters({ assignee: "user-1" }, "livelihood");
    expect(result.workflowFilters.assignee).toBe("user-1");
  });

  it("sets mobileNumber on searchFilters when provided", () => {
    const result = buildIncidentInboxFilters({ mobileNumber: "9999999999" }, "livelihood");
    expect(result.searchFilters.mobileNumber).toBe("9999999999");
  });

  it("sets businessService from services when provided", () => {
    const result = buildIncidentInboxFilters({ services: ["LivelihoodIncident"] }, "livelihood");
    expect(result.workflowFilters.businessService).toEqual(["LivelihoodIncident"]);
  });

  it("converts nearingSLA to a 3-day millisecond window", () => {
    const result = buildIncidentInboxFilters({ nearingSLA: true }, "livelihood");
    expect(result.searchFilters.nearingSLA).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it("omits nearingSLA from searchFilters when false", () => {
    const result = buildIncidentInboxFilters({ nearingSLA: false }, "livelihood");
    expect(result.searchFilters.nearingSLA).toBeUndefined();
  });

  it("passes through pagination/sort fields unchanged", () => {
    const result = buildIncidentInboxFilters(
      { limit: 10, offset: 20, sortBy: "createdTime", sortOrder: "ASC", applicationNumber: "APP-1" },
      "livelihood",
    );
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
    expect(result.sortBy).toBe("createdTime");
    expect(result.sortOrder).toBe("ASC");
    expect(result.applicationNumber).toBe("APP-1");
  });
});

describe("buildFilterQueryFromState", () => {
  it("returns empty queries when no filters are given", () => {
    expect(buildFilterQueryFromState({})).toEqual({ pgrQuery: {}, wfQuery: {} });
  });

  it("joins selected codes with a comma per property", () => {
    const result = buildFilterQueryFromState({
      pgrfilters: { state: [{ code: "S1" }, { code: "S2" }] },
    });
    expect(result.pgrQuery.state).toBe("S1,S2");
  });

  it("omits a property entirely when its selection is empty", () => {
    const result = buildFilterQueryFromState({ pgrfilters: { state: [] } });
    expect(result.pgrQuery.state).toBeUndefined();
  });

  it("skips a property whose value isn't an array", () => {
    const result = buildFilterQueryFromState({
      pgrfilters: { state: "not-an-array" as unknown as Array<{ code: string }> },
    });
    expect(result.pgrQuery.state).toBeUndefined();
  });

  it("builds wfQuery independently from pgrQuery", () => {
    const result = buildFilterQueryFromState({
      wfFilters: { assignee: [{ code: "user-1" }] },
    });
    expect(result.wfQuery.assignee).toBe("user-1");
    expect(result.pgrQuery).toEqual({});
  });
});

describe("flattenInboxFilters", () => {
  it("merges defaults, pgrQuery, and wfQuery with pgrQuery/wfQuery taking precedence", () => {
    const result = flattenInboxFilters(
      { filters: { pgrQuery: { state: "S1" }, wfQuery: { assignee: "user-1" } } },
      { state: "DEFAULT_STATE" },
    );
    expect(result.state).toBe("S1");
    expect(result.assignee).toBe("user-1");
  });

  it("defaults services to the livelihood incident business service when absent", () => {
    const result = flattenInboxFilters({ filters: {} }, {});
    expect(result.services).toEqual([LIVELIHOOD_INCIDENT_BUSINESS_SERVICE]);
  });

  it("keeps explicit services from defaults when provided", () => {
    const result = flattenInboxFilters({ filters: {} }, { services: ["CustomService"] });
    expect(result.services).toEqual(["CustomService"]);
  });

  it("defaults sortOrder to DESC when absent", () => {
    const result = flattenInboxFilters({ filters: {} }, {});
    expect(result.sortOrder).toBe("DESC");
  });

  it("passes through limit/offset/nearingSLA from searchParams", () => {
    const result = flattenInboxFilters({ filters: {}, limit: 10, offset: 20, nearingSLA: true }, {});
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
    expect(result.nearingSLA).toBe(true);
  });
});
