// Mirrors ir's constants/review.ts exactly — both modules render the same
// fixed Panel/Battery/Inverter/Machine section breakdown for the same
// underlying FACILITY_INSTALLATION activity, just read-only here.

export type SolarSectionId = "PANEL" | "BATTERY" | "INVERTER" | "INSTALLATION_COMPLETION_REPORT";
export type MachineSectionId = "MACHINE";

export const SOLAR_SECTION_IDS: SolarSectionId[] = [
  "PANEL",
  "BATTERY",
  "INVERTER",
  "INSTALLATION_COMPLETION_REPORT",
];

export const REVIEW_SECTION_LABELS: Record<
  SolarSectionId | MachineSectionId,
  { labelKey: string; label: string }
> = {
  PANEL: { labelKey: "ES_IR_SECTION_PANEL", label: "Panel" },
  BATTERY: { labelKey: "ES_IR_SECTION_BATTERY", label: "Battery" },
  INVERTER: { labelKey: "ES_IR_SECTION_INVERTER", label: "Inverter / PCU" },
  INSTALLATION_COMPLETION_REPORT: {
    labelKey: "ES_IR_SECTION_INSTALLATION_COMPLETION_REPORT",
    label: "Installation Completion Report",
  },
  MACHINE: { labelKey: "ES_IR_SECTION_MACHINE", label: "Machine" },
};

/**
 * Machine's labeled media sub-groups — `id` is the exact asset-registry
 * `documentType` these documents carry on the asset's own `documents` array.
 */
export const MACHINE_MEDIA_GROUPS = [
  {
    id: "MACHINE_ELECTRIC_BOARD",
    labelKey: "ES_IR_MACHINE_ELECTRIC_BOARD",
    label: "Electric Board",
    kind: "IMAGE",
  },
  {
    id: "MACHINE_DEMO_VIDEO",
    labelKey: "ES_IR_MACHINE_DEMO_TEST_RAW_MATERIAL",
    label: "Raw material Demo",
    kind: "VIDEO",
  },
  {
    id: "MACHINE_END_USER_PHOTO",
    labelKey: "ES_IR_MACHINE_PHOTO_WITH_END_USER",
    label: "Photo with End User",
    kind: "IMAGE",
  },
  {
    id: "MACHINE_CIVIL_WORK",
    labelKey: "ES_IR_MACHINE_CIVIL_WORK",
    label: "Civil Work",
    kind: "IMAGE",
  },
] as const;
