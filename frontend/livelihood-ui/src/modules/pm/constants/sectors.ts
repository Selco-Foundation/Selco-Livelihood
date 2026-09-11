export interface SectorOption {
  code: string;
  name: string;
}

// Mock MDMS `Installation.Sector`-style master — no real MDMS master exists
// yet; hardcoded until one is available.
export const SECTOR_OPTIONS: SectorOption[] = [
  { code: "AGRICULTURE", name: "Agriculture" },
  { code: "ANIMAL_HUSBANDRY", name: "Animal Husbandry" },
  { code: "TEXTILE_CRAFTS", name: "Textile & Crafts" },
  { code: "MICRO_BUSINESS", name: "Micro Business" },
];
