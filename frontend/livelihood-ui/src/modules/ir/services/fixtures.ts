import { MACHINE_MEDIA_GROUPS, REVIEW_SECTION_LABELS } from "../constants/review";
import type { InstallationPlan } from "../types/installation-plan";
import type {
  AssetSectionContent,
  FacilityAuditCheckpoint,
  FacilityEntry,
  FacilityReviewDetail,
  ImageChecklistSectionContent,
  RejectionReasonOption,
  ReportSectionContent,
  ReviewSectionContent,
} from "../types/facility-review";

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
    startDate: "07/15/2026",
    endDate: "07/31/2026",
    pendingReviewCount: 5,
    completionRate: 58,
  },
  {
    planId: "IP-2026-0002",
    planName: "Maharashtra Q3 Installation Plan",
    tenantId: "livelihood",
    totalFacilities: 8,
    startDate: "07/15/2026",
    endDate: "07/31/2026",
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
      status: "SUBMITTED_BY_FIELD_STAFF",
      district: { code: "KA_DIST_1", name: "Bagalkot" },
      block: { code: "KA_BLK_1", name: "Jamkhandi" },
    },
    {
      entryId: "FE-0001-S",
      facilityId: "ED/2026/0011",
      facilityName: "Anand Weaving Unit",
      entryType: "SOLAR",
      planId: "IP-2026-0001",
      status: "SUBMITTED_BY_FIELD_STAFF",
      district: { code: "KA_DIST_1", name: "Bagalkot" },
      block: { code: "KA_BLK_1", name: "Jamkhandi" },
    },
    {
      entryId: "FE-0002-S",
      facilityId: "ED/2026/0012",
      facilityName: "Meera Handloom Center",
      entryType: "SOLAR",
      planId: "IP-2026-0001",
      status: "SUBMITTED_BY_FIELD_STAFF",
      district: { code: "KA_DIST_2", name: "Belagavi" },
      block: { code: "KA_BLK_2", name: "Athani" },
    },
    {
      entryId: "FE-0003-M",
      facilityId: "ED/2026/0013",
      facilityName: "Lakshmi Dairy Cooperative",
      entryType: "MACHINE",
      planId: "IP-2026-0001",
      status: "APPROVED_BY_QC_SPOC",
      district: { code: "KA_DIST_1", name: "Bagalkot" },
      block: { code: "KA_BLK_1", name: "Jamkhandi" },
    },
    {
      entryId: "FE-0004-S",
      facilityId: "ED/2026/0014",
      facilityName: "Sharada Spinning Mill",
      entryType: "SOLAR",
      planId: "IP-2026-0001",
      status: "REJECTED_BY_QC_SPOC",
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
      status: "SUBMITTED_BY_FIELD_STAFF",
      district: { code: "MH_DIST_1", name: "Kolhapur" },
      block: { code: "MH_BLK_1", name: "Karvir" },
    },
    {
      entryId: "FE-0101-S",
      facilityId: "ED/2026/0021",
      facilityName: "Ganga Textiles",
      entryType: "SOLAR",
      planId: "IP-2026-0002",
      status: "SUBMITTED_BY_FIELD_STAFF",
      district: { code: "MH_DIST_1", name: "Kolhapur" },
      block: { code: "MH_BLK_1", name: "Karvir" },
    },
  ],
};

// Placeholder image — a small inline SVG data URI so the review screen has
// something to render without depending on external/filestore URLs.
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='120'%3E%3Crect width='160' height='120' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236b7280' font-size='12'%3EPhoto%3C/text%3E%3C/svg%3E";

function image(): { url: string } {
  return { url: PLACEHOLDER_IMAGE };
}

function video(size = 4_200_000): { url: string; size: number } {
  return { url: "https://example.com/fixtures/demo-video.mp4", size };
}

// Mock MDMS `Installation.RejectionReasons` — no real master data exists
// locally (see LLD research); actual codes/labels are backend TBD.
export const REJECTION_REASON_OPTIONS: RejectionReasonOption[] = [
  { code: "IMAGE_UNCLEAR", name: "Image is unclear" },
  { code: "MISSING_DOCUMENT", name: "Required document missing" },
  { code: "SPEC_MISMATCH", name: "Specification does not match BOM" },
  { code: "SERIAL_NUMBER_MISMATCH", name: "Serial number mismatch" },
  { code: "VIDEO_INCOMPLETE", name: "Video does not show complete demonstration" },
];

// Mock MDMS `common-masters.InstallationImages` — the checklist criteria that
// drive one top-level review section each (Solar only), sibling to
// Panel/Battery/Inverter/Installation Completion Report — not nested inside
// the report section.
const INSTALLATION_IMAGE_CRITERIA: Array<{ code: string; description: string }> = [
  { code: "SITE_OVERVIEW", description: "Site overview photo" },
  { code: "NAMEPLATE", description: "Nameplate / rating label photo" },
  { code: "EARTHING", description: "Earthing connection photo" },
];

function buildInstallationImageSections(): ImageChecklistSectionContent[] {
  return INSTALLATION_IMAGE_CRITERIA.map((criterion) => ({
    kind: "IMAGE_CHECKLIST",
    id: `INSTALLATION_IMAGE_${criterion.code}`,
    label: criterion.description,
    images: [image()],
  }));
}

function buildAssetSection(
  id: "PANEL" | "BATTERY" | "INVERTER",
  count: number,
): AssetSectionContent {
  const { labelKey, label } = REVIEW_SECTION_LABELS[id];

  return {
    kind: "ASSET",
    id,
    labelKey,
    label,
    count,
    specifications: [
      { labelKey: "ES_IR_SPEC_SYSTEM", label: "System", value: "On-grid" },
      { labelKey: "ES_IR_SPEC_CAPACITY", label: "Capacity", value: "5 kW" },
    ],
    extraSpecifications:
      id === "BATTERY"
        ? {
            labelKey: "ES_IR_BATTERY_CAPACITY",
            label: "Capacity",
            fields: [{ labelKey: "ES_IR_SPEC_VOLTAGE", label: "Voltage", value: "48V" }],
          }
        : undefined,
    details: [
      { labelKey: "ES_IR_DETAIL_COUNT", label: "Count", value: String(count) },
      {
        labelKey: "ES_IR_DETAIL_WARRANTY_START",
        label: "Warranty Start Date",
        value: "01/08/2026",
      },
      { labelKey: "ES_IR_DETAIL_WARRANTY_DURATION", label: "Warranty Duration", value: "10 Years" },
      { labelKey: "ES_IR_DETAIL_BRAND", label: "Brand", value: "Waaree" },
    ],
    items: Array.from({ length: Math.min(count, 2) }, (_, index) => ({
      itemNumber: index + 1,
      serialNumber: `${id}-SN-${1000 + index}`,
      capacity: "5 kW",
      images: [image()],
    })),
    images: [image(), image()],
    videos: [video()],
  };
}

function buildReportSection(entry: FacilityEntry): ReportSectionContent {
  const { labelKey, label } = REVIEW_SECTION_LABELS.INSTALLATION_COMPLETION_REPORT;

  return {
    kind: "REPORT",
    id: "INSTALLATION_COMPLETION_REPORT",
    labelKey,
    label,
    installationCompletionCertificate: {
      name: `${entry.facilityName}.pdf`,
      url: "https://example.com/fixtures/installation-completion-certificate.pdf",
      size: 512_000,
    },
    assetHandoverDocument: {
      name: "Handover Letter.pdf",
      url: "https://example.com/fixtures/handover-letter.pdf",
      size: 128_000,
    },
    supportingDocuments: [
      { name: "Site Survey Notes.pdf", url: "https://example.com/fixtures/site-survey-notes.pdf", size: 96_000 },
    ],
  };
}

function buildMachineSection(): AssetSectionContent {
  const { labelKey, label } = REVIEW_SECTION_LABELS.MACHINE;

  return {
    kind: "ASSET",
    id: "MACHINE",
    labelKey,
    label,
    specifications: [
      { labelKey: "ES_IR_MACHINE_PO_NUMBER", label: "PO Number", value: "PO-2026-4471" },
      {
        labelKey: "ES_IR_MACHINE_SERIAL_NUMBER",
        label: "Machine Serial Number",
        value: "MSN-88213",
      },
      {
        labelKey: "ES_IR_MACHINE_INVOICE_NUMBER",
        label: "Manufacturer Invoice Number",
        value: "INV-77452",
      },
      {
        labelKey: "ES_IR_MACHINE_SPECIFICATIONS",
        label: "Machine Specifications/Motor Capacity",
        value: "2 HP",
      },
      { labelKey: "ES_IR_MACHINE_WARRANTY_YEARS", label: "Warranty (Years)", value: "2" },
    ],
    images: [],
    videos: [],
    mediaGroups: [
      { ...MACHINE_MEDIA_GROUPS[0], images: [image()], videos: [] },
      { ...MACHINE_MEDIA_GROUPS[1], images: [], videos: [video()] },
      { ...MACHINE_MEDIA_GROUPS[2], images: [image()], videos: [] },
    ],
  };
}

function buildSections(entry: FacilityEntry): ReviewSectionContent[] {
  if (entry.entryType === "MACHINE") {
    return [buildMachineSection()];
  }

  return [
    buildAssetSection("PANEL", 4),
    buildAssetSection("BATTERY", 2),
    buildAssetSection("INVERTER", 1),
    buildReportSection(entry),
    ...buildInstallationImageSections(),
  ];
}

function buildAuditTrail(entry: FacilityEntry): FacilityAuditCheckpoint[] {
  const submitted: FacilityAuditCheckpoint = {
    id: `${entry.entryId}-submitted`,
    status: "SUBMITTED_BY_FIELD_STAFF",
    date: "15/07/2026",
  };

  if (entry.status === "APPROVED_BY_QC_SPOC") {
    return [submitted, { id: `${entry.entryId}-approved`, status: "APPROVED_BY_QC_SPOC", date: "20/07/2026" }];
  }

  if (entry.status === "REJECTED_BY_QC_SPOC") {
    const firstSection = REVIEW_SECTION_LABELS[entry.entryType === "SOLAR" ? "PANEL" : "MACHINE"];
    return [
      submitted,
      {
        id: `${entry.entryId}-rejected`,
        status: "REJECTED_BY_QC_SPOC",
        date: "18/07/2026",
        sectionReasons: [
          {
            sectionId: entry.entryType === "SOLAR" ? "PANEL" : "MACHINE",
            sectionLabel: firstSection.label,
            reasons: [{ reasonLabel: "Image is unclear", comment: "Please re-upload a clearer photo." }],
          },
        ],
      },
    ];
  }

  return [submitted];
}

export function buildReviewDetailFixture(entry: FacilityEntry): FacilityReviewDetail {
  return {
    entry,
    sections: buildSections(entry),
    auditTrail: buildAuditTrail(entry),
  };
}
