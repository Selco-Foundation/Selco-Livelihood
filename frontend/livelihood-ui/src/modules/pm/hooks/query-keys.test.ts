import { describe, expect, it } from "vitest";
import { pmKeys } from "./query-keys";

describe("pmKeys", () => {
  it("nests project keys under projects() so invalidating projects() reaches every project list/detail", () => {
    expect(pmKeys.projects()).toEqual(["pm", "project"]);
    expect(pmKeys.project("p1")).toEqual(["pm", "project", "p1"]);
    expect(pmKeys.projectList("Foo", undefined, 10, 0)).toEqual([
      "pm", "project", "list", "Foo", undefined, 10, 0,
    ]);
  });

  it("nests plan satellite keys under plan(id) so invalidating a plan reaches its scope/reviewer/templates", () => {
    const planId = "plan-1";
    for (const key of [
      pmKeys.planScope(planId),
      pmKeys.planTemplates(planId),
      pmKeys.planReviewer(planId),
      pmKeys.planAssignments(planId),
      pmKeys.planVendorAssignment(planId),
    ]) {
      expect(key.slice(0, 3)).toEqual(["pm", "plan", planId]);
    }
  });

  it("nests plan(id) and planList() under plans() so invalidating plans() reaches both", () => {
    expect(pmKeys.plan("plan-1").slice(0, 2)).toEqual(["pm", "plan"]);
    expect(pmKeys.planList("project-1", 10, 0).slice(0, 2)).toEqual(["pm", "plan"]);
  });

  it("keys facility counts by the given plan id list", () => {
    expect(pmKeys.planFacilityCounts(["p1", "p2"])).toEqual(["pm", "plan", "facility-counts", ["p1", "p2"]]);
  });

  it("keys reference-data reads under the shared 'pm' root but not under projects()/plans()", () => {
    expect(pmKeys.boundaryTree("B1,B2")).toEqual(["pm", "boundary-tree", "B1,B2"]);
    expect(pmKeys.installationSolutions()).toEqual(["pm", "installation-solutions"]);
    expect(pmKeys.reviewerOptions()).toEqual(["pm", "reviewer-options"]);
    expect(pmKeys.vendorOrganisations()).toEqual(["pm", "vendor-organisations"]);
    expect(pmKeys.vendorOrgUsers("org-1")).toEqual(["pm", "vendor-org-users", "org-1"]);
  });
});
