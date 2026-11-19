import { describe, expect, it } from "vitest";
import { findAssetAmc, toAmcFieldStaffOptions, toAssetAmcs } from "./amc";

describe("toAssetAmcs / findAssetAmc", () => {
  const amcs = toAssetAmcs({
    AmcConfigurations: [
      { id: "a1", status: "ACTIVE", activityFacilityId: "af1", fieldStaff: { uuid: "u1", name: "One" }, assetsAmc: [{ assetId: "Ast/1" }] },
      { id: "a2", status: "CANCELLED", activityFacilityId: "af2", assetsAmc: [{ assetId: "Ast/2" }] },
      { id: "a3", status: "PENDING_ACTIVATION", activityFacilityId: "af3", assetsAmc: null },
    ],
  });

  it("keeps only running AMCs", () => {
    expect(amcs.map((amc) => amc.id)).toEqual(["a1", "a3"]);
  });

  it("finds the AMC that covers an asset", () => {
    expect(findAssetAmc(amcs, "Ast/1")).toMatchObject({ activityFacilityId: "af1", fieldStaffId: "u1", fieldStaffName: "One" });
    expect(findAssetAmc(amcs, "Ast/2")).toBeUndefined();
  });
});

describe("toAmcFieldStaffOptions", () => {
  it("lists organisation members who hold AMC_FIELD_STAFF", () => {
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
