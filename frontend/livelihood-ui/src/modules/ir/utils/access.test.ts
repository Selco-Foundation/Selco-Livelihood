import { describe, expect, it } from "vitest";
import { hasIrAccess, IR_ROLES } from "./access";

describe("IR_ROLES", () => {
  it("contains exactly the QC approver role code", () => {
    expect(IR_ROLES).toEqual(["INSTALLATION_REPORT_APPROVER_QC_TEAM"]);
  });
});

describe("hasIrAccess", () => {
  it("returns true when a role matches an IR role code", () => {
    expect(hasIrAccess([{ code: "INSTALLATION_REPORT_APPROVER_QC_TEAM" }])).toBe(true);
  });

  it("returns true when only one of several roles matches", () => {
    expect(
      hasIrAccess([{ code: "SOME_OTHER_ROLE" }, { code: "INSTALLATION_REPORT_APPROVER_QC_TEAM" }]),
    ).toBe(true);
  });

  it("returns false when no role matches", () => {
    expect(hasIrAccess([{ code: "SOME_OTHER_ROLE" }])).toBe(false);
  });

  it("returns false for an empty roles array", () => {
    expect(hasIrAccess([])).toBe(false);
  });

  it("returns false when roles is undefined", () => {
    expect(hasIrAccess(undefined)).toBe(false);
  });

  it("returns false when a role has no code", () => {
    expect(hasIrAccess([{}])).toBe(false);
  });
});
