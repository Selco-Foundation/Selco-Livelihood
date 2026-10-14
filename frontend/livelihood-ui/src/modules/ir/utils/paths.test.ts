import { describe, expect, it } from "vitest";
import { irActivitiesPath, irActivityReviewPath, irInstallationPlansPath } from "./paths";

describe("irInstallationPlansPath", () => {
  it("builds the installation plans path under the context path", () => {
    expect(irInstallationPlansPath()).toBe("/livelihood-ui/employee/ir/installation-plans");
  });
});

describe("irActivitiesPath", () => {
  it("builds the activities path for a given plan id", () => {
    expect(irActivitiesPath("plan-1")).toBe(
      "/livelihood-ui/employee/ir/installation-plans/plan-1/activities",
    );
  });
});

describe("irActivityReviewPath", () => {
  it("builds the activity review path for a given plan and activity id", () => {
    expect(irActivityReviewPath("plan-1", "activity-1")).toBe(
      "/livelihood-ui/employee/ir/installation-plans/plan-1/activities/activity-1/review",
    );
  });
});
