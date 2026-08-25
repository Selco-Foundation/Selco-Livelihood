import { REVIEW_SECTIONS } from "../constants/review";
import type { InstallationPlan } from "../types/installation-plan";
import type { FacilityEntry, FacilityReviewDetail } from "../types/facility-review";

// Dummy data standing in for the (not-yet-restructured) backend APIs. Service
// functions in this module return this fixture data instead of calling
// `apiClient` — see services/*.ts for the swap-over point once the real
// endpoints land.

export const INSTALLATION_PLAN_FIXTURES: InstallationPlan[] = [
  {
    planId: "IP-2026-0001",
    planName: "Karnataka Q3 Installation Plan",
    tenantId: "livelihood",
    totalFacilities: 12,
    pendingReviewCount: 5,
    completionRate: 58,
  },
  {
    planId: "IP-2026-0002",
    planName: "Maharashtra Q3 Installation Plan",
    tenantId: "livelihood",
    totalFacilities: 8,
    pendingReviewCount: 2,
    completionRate: 75,
  },
];

export const FACILITY_ENTRY_FIXTURES: Record<string, FacilityEntry[]> = {
  "IP-2026-0001": [
    {
      entryId: "FE-0001-M",
      facilityId: "ED/2026/0011",
      facilityName: "Anand Weaving Unit",
      entryType: "MACHINE",
      planId: "IP-2026-0001",
      status: "SUBMITTED_BY_SUPERVISOR",
      district: { code: "KA_DIST_1", name: "Bagalkot" },
      block: { code: "KA_BLK_1", name: "Jamkhandi" },
    },
    {
      entryId: "FE-0001-S",
      facilityId: "ED/2026/0011",
      facilityName: "Anand Weaving Unit",
      entryType: "SOLAR",
      planId: "IP-2026-0001",
      status: "SUBMITTED_BY_SUPERVISOR",
      district: { code: "KA_DIST_1", name: "Bagalkot" },
      block: { code: "KA_BLK_1", name: "Jamkhandi" },
    },
    {
      entryId: "FE-0002-S",
      facilityId: "ED/2026/0012",
      facilityName: "Meera Handloom Center",
      entryType: "SOLAR",
      planId: "IP-2026-0001",
      status: "SUBMITTED_BY_SUPERVISOR",
      district: { code: "KA_DIST_2", name: "Belagavi" },
      block: { code: "KA_BLK_2", name: "Athani" },
    },
    {
      entryId: "FE-0003-M",
      facilityId: "ED/2026/0013",
      facilityName: "Lakshmi Dairy Cooperative",
      entryType: "MACHINE",
      planId: "IP-2026-0001",
      status: "APPROVED",
      district: { code: "KA_DIST_1", name: "Bagalkot" },
      block: { code: "KA_BLK_1", name: "Jamkhandi" },
    },
  ],
  "IP-2026-0002": [
    {
      entryId: "FE-0101-M",
      facilityId: "ED/2026/0021",
      facilityName: "Ganga Textiles",
      entryType: "MACHINE",
      planId: "IP-2026-0002",
      status: "SUBMITTED_BY_SUPERVISOR",
      district: { code: "MH_DIST_1", name: "Kolhapur" },
      block: { code: "MH_BLK_1", name: "Karvir" },
    },
    {
      entryId: "FE-0101-S",
      facilityId: "ED/2026/0021",
      facilityName: "Ganga Textiles",
      entryType: "SOLAR",
      planId: "IP-2026-0002",
      status: "SUBMITTED_BY_SUPERVISOR",
      district: { code: "MH_DIST_1", name: "Kolhapur" },
      block: { code: "MH_BLK_1", name: "Karvir" },
    },
  ],
};

export function buildReviewDetailFixture(entry: FacilityEntry): FacilityReviewDetail {
  return {
    entry,
    sections: REVIEW_SECTIONS.map((section) => ({
      ...section,
      summary:
        section.id === "HANDOVER_LETTER"
          ? "Placeholder — Handover Letter content and document structure are not finalized yet."
          : `Placeholder ${section.label.toLowerCase()} content for the ${
              entry.entryType === "MACHINE" ? "Machine" : "Solar"
            } BOM entry ${entry.entryId}.`,
    })),
  };
}
