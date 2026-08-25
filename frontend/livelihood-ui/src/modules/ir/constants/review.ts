import type { ReviewSectionDefinition } from "../types/facility-review";

// Generic, entry-type-agnostic sections (per the LLD's model) so Machine and Solar
// BOM entries share one review structure instead of needing separate section sets
// per entry type the way qc's Panel/Battery/Inverter breakdown did.
export const REVIEW_SECTIONS: ReviewSectionDefinition[] = [
  { id: "SPECS", labelKey: "ES_IR_SECTION_SPECS", label: "Specs" },
  { id: "PHOTOS", labelKey: "ES_IR_SECTION_PHOTOS", label: "Photos" },
  { id: "VIDEO", labelKey: "ES_IR_SECTION_VIDEO", label: "Video" },
  {
    id: "HANDOVER_LETTER",
    labelKey: "ES_IR_SECTION_HANDOVER_LETTER",
    label: "Handover Letter",
  },
];
