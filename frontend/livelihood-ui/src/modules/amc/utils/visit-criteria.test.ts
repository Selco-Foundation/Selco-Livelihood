import { describe, expect, it } from "vitest";
import { toVisitSearchCriteria } from "./visit-criteria";

describe("toVisitSearchCriteria", () => {
  it("opens the Pending tab on the reports waiting for review, with the SLA filter", () => {
    expect(
      toVisitSearchCriteria(
        { tab: "pending", slaBreachedOnly: true, states: ["INDIA_KARNATAKA"], vendorIds: [], submittedFrom: 10, searchText: " name1 " },
        "livelihood",
      ),
    ).toEqual({
      tenantId: "livelihood",
      statuses: ["PENDING_APPROVAL"],
      states: ["INDIA_KARNATAKA"],
      vendorIds: undefined,
      districts: undefined,
      blocks: undefined,
      slaBreached: true,
      latestSubmissionFrom: 10,
      searchText: "name1",
    });
  });

  it("asks for reviewer-approved reports when the Pending tab filters on Approved", () => {
    const criteria = toVisitSearchCriteria({ tab: "pending", status: "APPROVED", slaBreachedOnly: true }, "livelihood");
    expect(criteria).toMatchObject({ statuses: ["APPROVED"], approvedBy: "REVIEWER" });
    expect(criteria.slaBreached).toBeUndefined();
  });

  it("lists system-approved reports on the Auto-Approved tab, scoped to a project", () => {
    const criteria = toVisitSearchCriteria(
      { tab: "auto", projectId: "p1", status: "REJECTED", submittedTo: 99 },
      "livelihood",
    );
    expect(criteria).toMatchObject({ statuses: ["APPROVED"], approvedBy: "SYSTEM", projectsIds: ["p1"] });
    expect(criteria.latestSubmissionTo).toBeUndefined();
  });
});
