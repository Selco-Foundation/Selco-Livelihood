import type { ActivityComponentType } from "../types/activity-review";

interface ComponentTypeLabel {
  key: string;
  fallback: string;
}

export const COMPONENT_TYPE_LABELS: Record<ActivityComponentType, ComponentTypeLabel> = {
  SOLAR: { key: "ES_IR_COMPONENT_TYPE_SOLAR", fallback: "Solar" },
  MACHINE: { key: "ES_IR_COMPONENT_TYPE_MACHINE", fallback: "Machine" },
};
