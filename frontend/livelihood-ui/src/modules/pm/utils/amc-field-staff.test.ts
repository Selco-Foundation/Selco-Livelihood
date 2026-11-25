import { describe, expect, it } from "vitest";
import { toAmcFieldStaffOptions } from "./amc-field-staff";

describe("toAmcFieldStaffOptions", () => {
  it("keeps only members holding AMC_FIELD_STAFF, named from the enriched user", () => {
    const options = toAmcFieldStaffOptions({
      OrgUsers: [
        { userId: "u1", user: { name: "Ravi", roles: [{ code: "AMC_FIELD_STAFF" }] } },
        { userId: "u2", user: { name: "Installer", roles: [{ code: "INSTALLATION_REPORT_PART_A_EDITOR" }] } },
        { id: "u3", user: { roles: [{ code: "AMC_FIELD_STAFF" }] } },
        { user: { name: "No id", roles: [{ code: "AMC_FIELD_STAFF" }] } },
      ],
    });
    expect(options).toEqual([
      { code: "u1", name: "Ravi" },
      { code: "u3", name: "u3" },
    ]);
  });

  it("is empty without a response", () => {
    expect(toAmcFieldStaffOptions(undefined)).toEqual([]);
  });
});
