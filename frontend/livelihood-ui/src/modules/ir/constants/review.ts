import type { MachineSectionId, SolarSectionId } from "../types/facility-review";

export const REVIEW_SECTION_LABELS: Record<
  SolarSectionId | MachineSectionId,
  { labelKey: string; label: string }
> = {
  PANEL: { labelKey: "ES_IR_SECTION_PANEL", label: "Panel" },
  BATTERY: { labelKey: "ES_IR_SECTION_BATTERY", label: "Battery" },
  INVERTER: { labelKey: "ES_IR_SECTION_INVERTER", label: "Inverter" },
  INSTALLATION_COMPLETION_REPORT: {
    labelKey: "ES_IR_SECTION_INSTALLATION_COMPLETION_REPORT",
    label: "Installation Completion Report",
  },
  MACHINE: { labelKey: "ES_IR_SECTION_MACHINE", label: "Machine" },
};

/** Machine's labeled media sub-groups, per the field mockups. */
export const MACHINE_MEDIA_GROUPS = [
  {
    id: "ELECTRIC_BOARD",
    labelKey: "ES_IR_MACHINE_ELECTRIC_BOARD",
    label: "Electric Board",
  },
  {
    id: "DEMO_TEST_RAW_MATERIAL",
    labelKey: "ES_IR_MACHINE_DEMO_TEST_RAW_MATERIAL",
    label: "Demo Test with Raw Material",
  },
  {
    id: "PHOTO_WITH_END_USER",
    labelKey: "ES_IR_MACHINE_PHOTO_WITH_END_USER",
    label: "Photo with End User",
  },
] as const;
