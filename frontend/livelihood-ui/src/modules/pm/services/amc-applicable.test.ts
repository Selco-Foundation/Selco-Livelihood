import { afterEach, describe, expect, it } from "vitest";
import { AMC_APPLICABLE_STORAGE_KEY, getAmcApplicable, saveAmcApplicable } from "./amc-applicable";

afterEach(() => window.localStorage.removeItem(AMC_APPLICABLE_STORAGE_KEY));

describe("amc-applicable prototype store", () => {
  it("returns nothing for a plan with no saved flags", () => {
    expect(getAmcApplicable("plan-1")).toEqual({});
  });

  it("saves flags per plan without touching other plans", () => {
    saveAmcApplicable("plan-1", { "f1:SOLAR:1": true });
    saveAmcApplicable("plan-2", { "f2:SOLAR:1": true });

    expect(getAmcApplicable("plan-1")).toEqual({ "f1:SOLAR:1": true });
    expect(getAmcApplicable("plan-2")).toEqual({ "f2:SOLAR:1": true });
  });

  it("ignores unreadable stored data", () => {
    window.localStorage.setItem(AMC_APPLICABLE_STORAGE_KEY, "not json");
    expect(getAmcApplicable("plan-1")).toEqual({});
  });
});
