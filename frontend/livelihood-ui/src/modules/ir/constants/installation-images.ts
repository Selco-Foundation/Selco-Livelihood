// Mock MDMS `common-masters.InstallationImages` — no real master exists yet;
// hardcoded per product's explicit instruction until one is available.
export interface InstallationImageCriterion {
  code: string;
  description: string;
}

export const INSTALLATION_IMAGE_CRITERIA: InstallationImageCriterion[] = [
  { code: "SITE_OVERVIEW", description: "Site overview photo" },
  { code: "NAMEPLATE", description: "Nameplate / rating label photo" },
  { code: "EARTHING", description: "Earthing connection photo" },
];
