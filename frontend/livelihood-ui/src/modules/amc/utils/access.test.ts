import { describe, expect, it } from "vitest";
import { hasAmcReviewerAccess } from "./access";

describe("hasAmcReviewerAccess", () => {
  it("is true for a user holding AMC_REVIEWER", () => {
    expect(hasAmcReviewerAccess([{ code: "EMPLOYEE" }, { code: "AMC_REVIEWER" }])).toBe(true);
  });

  it.each([
    ["no roles", undefined],
    ["an empty role list", []],
    ["only other roles", [{ code: "PROJECT_MANAGER" }]],
  ])("is false for %s", (_label, roles) => {
    expect(hasAmcReviewerAccess(roles)).toBe(false);
  });
});
