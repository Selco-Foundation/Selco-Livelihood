import { describe, expect, it } from "vitest";
import {
  mapInstallationImageCriteria,
  selectInstallationImageCriteria,
  type InstallationImageCriterion,
} from "./installation-image-mapping";

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

  it("maps short_title to a trimmed shortTitle, leaving it undefined when blank", () => {
    const masters = {
      InstallationImages: [
        {
          InstallationImage: [
            { code: "1", description: "Long hint", short_title: " Solar Panel " },
            { code: "2", description: "Long hint", short_title: "  " },
            { code: "3", description: "Long hint" },
          ],
        },
      ],
    };
    const result = mapInstallationImageCriteria(masters);
    expect(result.map((criterion) => criterion.shortTitle)).toEqual(["Solar Panel", undefined, undefined]);
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

describe("mapInstallationImageCriteria — selection fields", () => {
  it("keeps system orders, solution codes, optional and inactive flags", () => {
    const masters = {
      InstallationImages: [
        {
          InstallationImage: [
            {
              code: "15",
              description: "RMS site photo",
              short_title: "RMS Site Photo",
              required: false,
              system_types: [{ code: "ac", order: 13 }, { code: "DC", order: 13 }, { order: 1 }],
              solution_codes: [" 202526pasf0000104 ", "", 7],
            },
            { code: "99", description: "Old", active: false, required: true, solution_codes: [] },
          ],
        },
      ],
    };
    expect(mapInstallationImageCriteria(masters as unknown as Record<string, unknown[]>)).toEqual([
      {
        code: "15",
        description: "RMS site photo",
        shortTitle: "RMS Site Photo",
        required: false,
        systemOrders: { AC: 13, DC: 13 },
        solutionCodes: ["202526PASF0000104"],
      },
      { code: "99", description: "Old", shortTitle: undefined, active: false },
    ]);
  });
});

// The dev MDMS shape for three solutions (client sheet 2026-11): Sewing
// Machine AC has no AJB; Eri Spinning DC has no inverter; Textile Lighting
// AC has neither.
const SEWING = "202526PASF0000135";
const ERI = "202526PASF0000141";
const TEXTILE = "202526PASF0000104";
const criteria: InstallationImageCriterion[] = [
  { code: "1", description: "Panels", systemOrders: { AC: 1, DC: 1 }, solutionCodes: [SEWING, ERI, TEXTILE] },
  { code: "3", description: "Inverter", systemOrders: { AC: 3 }, solutionCodes: [SEWING, TEXTILE] },
  { code: "6", description: "AJB", systemOrders: { AC: 6 }, solutionCodes: ["202526PASF0000379"] },
  { code: "2", description: "Batteries", systemOrders: { AC: 2, DC: 2 }, solutionCodes: [SEWING, ERI, TEXTILE] },
  { code: "15", description: "RMS", required: false, systemOrders: { AC: 13, DC: 13 } },
];
const codes = (list: InstallationImageCriterion[]) => list.map((criterion) => criterion.code);

describe("selectInstallationImageCriteria", () => {
  it("keeps the solution's questions for its system type, in that type's order", () => {
    expect(codes(selectInstallationImageCriteria(criteria, { systemType: "AC", solutionId: SEWING }))).toEqual([
      "1",
      "2",
      "3",
      "15",
    ]);
    expect(codes(selectInstallationImageCriteria(criteria, { systemType: "dc", solutionId: ERI.toLowerCase() }))).toEqual([
      "1",
      "2",
      "15",
    ]);
  });

  it("keeps every type's questions when the type is blank or unknown, still by solution", () => {
    expect(codes(selectInstallationImageCriteria(criteria, { solutionId: ERI }))).toEqual(["1", "2", "15"]);
    expect(codes(selectInstallationImageCriteria(criteria, { systemType: "WIND", solutionId: SEWING }))).toEqual([
      "1",
      "3",
      "2",
      "15",
    ]);
  });

  it("keeps every solution's questions when the solution is unknown", () => {
    expect(codes(selectInstallationImageCriteria(criteria, { systemType: "AC" }))).toEqual(["1", "2", "3", "6", "15"]);
  });

  it("keeps a question that already has photos, after the selected ones", () => {
    const uploadedCodes = new Set(["6", "1"]);
    expect(
      codes(selectInstallationImageCriteria(criteria, { systemType: "AC", solutionId: SEWING, uploadedCodes })),
    ).toEqual(["1", "2", "3", "15", "6"]);
  });

  it("drops inactive questions unless they have photos", () => {
    const withInactive = [...criteria, { code: "99", description: "Old", active: false }];
    expect(codes(selectInstallationImageCriteria(withInactive))).toEqual(["1", "3", "6", "2", "15"]);
    expect(codes(selectInstallationImageCriteria(withInactive, { uploadedCodes: new Set(["99"]) }))).toContain("99");
  });

  it("keeps ties in MDMS order", () => {
    const tied: InstallationImageCriterion[] = [
      { code: "B", description: "B", systemOrders: { AC: 1 } },
      { code: "A", description: "A", systemOrders: { AC: 1 } },
    ];
    expect(codes(selectInstallationImageCriteria(tied, { systemType: "AC" }))).toEqual(["B", "A"]);
  });
});
