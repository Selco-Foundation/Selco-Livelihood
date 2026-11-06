import { describe, expect, it } from "vitest";
import { mapInstallationImageCriteria } from "./installation-image-mapping";

describe("mapInstallationImageCriteria", () => {
  it("extracts criteria from the MDMS master's nested wrapper", () => {
    const masters = {
      InstallationImages: [
        {
          InstallationImage: [
            { code: "SITE_OVERVIEW", description: "Site overview photo" },
            { code: "NAMEPLATE", description: "Nameplate photo" },
          ],
        },
      ],
    };
    expect(mapInstallationImageCriteria(masters)).toEqual([
      { code: "SITE_OVERVIEW", description: "Site overview photo" },
      { code: "NAMEPLATE", description: "Nameplate photo" },
    ]);
  });

  it("falls back to the code as description when description is missing", () => {
    const masters = {
      InstallationImages: [{ InstallationImage: [{ code: "EARTHING" }] }],
    };
    expect(mapInstallationImageCriteria(masters)).toEqual([
      { code: "EARTHING", description: "EARTHING" },
    ]);
  });

  it("drops entries without a code", () => {
    const masters = {
      InstallationImages: [
        { InstallationImage: [{ description: "No code here" }, { code: "VALID" }] },
      ],
    };
    expect(mapInstallationImageCriteria(masters)).toEqual([{ code: "VALID", description: "VALID" }]);
  });

  it("returns an empty array when InstallationImages is missing", () => {
    expect(mapInstallationImageCriteria({})).toEqual([]);
  });

  it("returns an empty array when InstallationImage is missing on the wrapper", () => {
    expect(mapInstallationImageCriteria({ InstallationImages: [{}] })).toEqual([]);
  });
});
