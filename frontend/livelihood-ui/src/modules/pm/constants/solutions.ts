export interface SolutionOption {
  code: string;
  name: string;
  sectorCode: string;
}

// Mock `Installation.Solution` MDMS master — the 14 real ICC solution
// codes/names (see icc_templates_split/upload.sh), sector-mapped on a
// best-effort basis since MDMS doesn't carry a sector field for these yet.
// Hardcoded per project convention until the real MDMS master exists.
export const SOLUTION_OPTIONS: SolutionOption[] = [
  { code: "202526PASF0000104", name: "Textile Lighting", sectorCode: "TEXTILE_CRAFTS" },
  { code: "202526PASF0000135", name: "Sewing Machine", sectorCode: "TEXTILE_CRAFTS" },
  { code: "202526PASF0000141", name: "Eri Spinning", sectorCode: "TEXTILE_CRAFTS" },
  { code: "202526PASF0000214", name: "LSK (Laptop)", sectorCode: "MICRO_BUSINESS" },
  { code: "202526PASF0000248", name: "Refrigerator", sectorCode: "MICRO_BUSINESS" },
  { code: "202526PASF0000317", name: "Roaster", sectorCode: "AGRICULTURE" },
  { code: "202526PASF0000371", name: "Rice huller", sectorCode: "AGRICULTURE" },
  { code: "202526PASF0000379", name: "Pulverizer", sectorCode: "AGRICULTURE" },
  { code: "202526PASF0000382", name: "Paddy Integrated Processing", sectorCode: "AGRICULTURE" },
  { code: "202526PASF0000387", name: "Multi-Stage Processing", sectorCode: "AGRICULTURE" },
  { code: "202526PASF0000390", name: "Oil Mill", sectorCode: "AGRICULTURE" },
  { code: "202526PASF0000395", name: "Multi-Stage Processing (Millet)", sectorCode: "AGRICULTURE" },
  { code: "202526PASF0000460", name: "Light Manufacturing", sectorCode: "MICRO_BUSINESS" },
  { code: "202526PASF0000540", name: "Printer", sectorCode: "MICRO_BUSINESS" },
];
