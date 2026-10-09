import { describe, expect, it } from "vitest";
import { computeGeographyCodes } from "./boundary-codes";

describe("computeGeographyCodes", () => {
  it("upper-cases free-text input and replaces spaces with / before joining tiers with _", () => {
    const codes = computeGeographyCodes({
      state: "State A",
      district: "District A",
      block: "Block A",
      isStateTextMode: true,
      isDistrictTextMode: true,
    });

    expect(codes).toEqual({
      country: "INDIA",
      state: "INDIA_STATE/A",
      district: "INDIA_STATE/A_DISTRICT/A",
      block: "INDIA_STATE/A_DISTRICT/A_BLOCK/A",
    });
  });

  it("appends the new district onto an existing (picked, not typed) state code", () => {
    const codes = computeGeographyCodes({
      state: "INDIA_KARNATAKA",
      district: "New District",
      block: "New Block",
      isStateTextMode: false,
      isDistrictTextMode: true,
    });

    expect(codes.state).toBe("INDIA_KARNATAKA");
    expect(codes.district).toBe("INDIA_KARNATAKA_NEW/DISTRICT");
    expect(codes.block).toBe("INDIA_KARNATAKA_NEW/DISTRICT_NEW/BLOCK");
  });

  it("appends only the new block onto an existing (picked, not typed) state and district code", () => {
    const codes = computeGeographyCodes({
      state: "INDIA_KARNATAKA",
      district: "INDIA_KARNATAKA_BENGALURU",
      block: "New Block",
      isStateTextMode: false,
      isDistrictTextMode: false,
    });

    expect(codes.state).toBe("INDIA_KARNATAKA");
    expect(codes.district).toBe("INDIA_KARNATAKA_BENGALURU");
    expect(codes.block).toBe("INDIA_KARNATAKA_BENGALURU_NEW/BLOCK");
  });
});
