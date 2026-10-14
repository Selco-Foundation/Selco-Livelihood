// Shared by `ir` (reviewer) and `eu` (end user) — both render the same
// fixed Panel/Battery/Inverter/Machine section breakdown for the same
// underlying FACILITY_INSTALLATION activity.

// SOLAR mirrors qc's per-asset-type structure exactly: Panel/Battery/Inverter,
// each independently reviewable, plus a separate Installation Completion
// Report section. MACHINE has no separate report section — its one "Machine"
// section IS the whole report, with the machine's media fields (Electric
// Board / Demo Test / Photo with End User) as labeled sub-groups inside it,
// per the mockup.
export const SOLAR_SECTION_IDS = [
  "PANEL",
  "BATTERY",
  "INVERTER",
  "INSTALLATION_COMPLETION_REPORT",
] as const;
export const MACHINE_SECTION_IDS = ["MACHINE"] as const;

export type SolarSectionId = (typeof SOLAR_SECTION_IDS)[number];
export type MachineSectionId = (typeof MACHINE_SECTION_IDS)[number];

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
 * Machine's labeled media sub-groups, per the field mockups (plus Civil
 * Work, which has no mockup but is a real, populated document type). `id`
 * is the exact asset-registry `documentType` these documents carry on the
 * asset's own `documents` array — verified against real data; not a
 * generic `<KEY>-<KIND>-<suffix>` pattern like workflow documents use
 * elsewhere (`kind` says whether that type's files are photos or videos,
 * also verified against real file extensions: DEMO_VIDEO is .mp4, the
 * other three are .jpg).
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
