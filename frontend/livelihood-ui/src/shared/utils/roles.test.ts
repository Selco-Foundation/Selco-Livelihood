import { describe, expect, it } from "vitest";
import { hasAnyRole, hasRole, isProjectManager, PROJECT_MANAGER_ROLE } from "./roles";

describe("hasRole", () => {
  it("returns true when a role with the given code is present", () => {
    expect(hasRole([{ code: "PROJECT_MANAGER" }], "PROJECT_MANAGER")).toBe(true);
  });

  it("returns false when no role matches", () => {
    expect(hasRole([{ code: "OTHER" }], "PROJECT_MANAGER")).toBe(false);
  });

  it("returns false when roles is undefined", () => {
    expect(hasRole(undefined, "PROJECT_MANAGER")).toBe(false);
  });

  it("returns false for an empty roles array", () => {
    expect(hasRole([], "PROJECT_MANAGER")).toBe(false);
  });
});

describe("hasAnyRole", () => {
  it("returns true when any of the given codes matches", () => {
    expect(hasAnyRole([{ code: "OTHER" }, { code: "PROJECT_MANAGER" }], ["A", "PROJECT_MANAGER"])).toBe(true);
  });

  it("returns false when none of the given codes match", () => {
    expect(hasAnyRole([{ code: "OTHER" }], ["A", "B"])).toBe(false);
  });

  it("returns false for an empty codes list", () => {
    expect(hasAnyRole([{ code: "OTHER" }], [])).toBe(false);
  });
});

describe("isProjectManager", () => {
  it("returns true only when the PROJECT_MANAGER role code is present", () => {
    expect(isProjectManager([{ code: PROJECT_MANAGER_ROLE }])).toBe(true);
    expect(isProjectManager([{ code: "OTHER" }])).toBe(false);
    expect(isProjectManager(undefined)).toBe(false);
  });
});
