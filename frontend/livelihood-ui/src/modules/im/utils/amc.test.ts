import { describe, expect, it } from "vitest";
import { findRunningAssetAmc, toAmcFieldStaffOptions, toPrimaryOrganisationId } from "./amc";

describe("findRunningAssetAmc", () => {
  const response = {
    AmcConfigurations: [
      { id: "a1", status: "CANCELLED", activityFacilityId: "af1", assetsAmc: [{ assetId: "Ast/1" }] },
      { id: "a2", status: "ACTIVE", activityFacilityId: "af2", fieldStaff: { uuid: "fs" }, assetsAmc: [{ assetId: "Ast/1" }] },
      { id: "a3", status: "PENDING_ACTIVATION", activityFacilityId: "af3", assetsAmc: [{ assetId: "Ast/2" }] },
    ],
  };

  it("returns the running AMC covering the asset", () => {
    expect(findRunningAssetAmc(response, "Ast/1")).toMatchObject({ id: "a2", activityFacilityId: "af2", fieldStaffId: "fs" });
    expect(findRunningAssetAmc(response, "Ast/2")?.id).toBe("a3");
  });

  it("returns null without an asset or a running AMC", () => {
    expect(findRunningAssetAmc(response, undefined)).toBeNull();
    expect(findRunningAssetAmc(response, "Ast/9")).toBeNull();
  });
});

describe("org user mapping", () => {
  it("takes the vendor user's first organisation", () => {
    expect(toPrimaryOrganisationId({ OrgUsers: [{ organizationId: "org-1" }, { organizationId: "org-2" }] })).toBe("org-1");
    expect(toPrimaryOrganisationId({ OrgUsers: [] })).toBeUndefined();
  });

  it("lists the organisation's AMC field staff", () => {
    expect(
      toAmcFieldStaffOptions({
        OrgUsers: [
          { userId: "u1", user: { name: "Field", roles: [{ code: "AMC_FIELD_STAFF" }] } },
          { userId: "u2", user: { name: "Vendor", roles: [{ code: "LIVELIHOOD_VENDOR" }] } },
        ],
      }),
    ).toEqual([{ code: "u1", name: "Field" }]);
  });
});
