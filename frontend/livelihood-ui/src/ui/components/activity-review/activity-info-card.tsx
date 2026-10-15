import { ACTIVITY_STATUS_LABELS, componentTypeLabel, translateOr, useTranslate } from "@/shared";
import type { ActivityInfoCardFields } from "./types";

interface ActivityInfoCardProps {
  activity: ActivityInfoCardFields;
  /** Resolves a boundary code to its display name — each module owns its own
   * boundary-display logic (e.g. ir/eu's own `boundaryDisplayName`), so it's
   * passed in rather than imported here. */
  resolveBoundaryName: (code: string) => string;
}

export function ActivityInfoCard({ activity, resolveBoundaryName }: ActivityInfoCardProps) {
  const { t } = useTranslate();
  const status = ACTIVITY_STATUS_LABELS[activity.status];

  const items = [
    {
      label: translateOr(t, "ES_IR_DISTRICT", "District"),
      value: activity.district ? activity.district.name ?? resolveBoundaryName(activity.district.code) : "-",
    },
    {
      label: translateOr(t, "ES_IR_BLOCK", "Block"),
      value: activity.block ? activity.block.name ?? resolveBoundaryName(activity.block.code) : "-",
    },
    {
      label: translateOr(t, "ES_IR_COMPONENT_TYPE", "Type"),
      value: componentTypeLabel(activity.componentType, t),
    },
    { label: translateOr(t, "ES_IR_STATUS", "Status"), value: translateOr(t, status.key, status.fallback) },
  ];

  return (
    <div className="livelihood-card grid gap-6 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-7">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-sm leading-[21px] text-ink-600">{item.label}</p>
          <p className="text-base leading-6 font-semibold text-ink-950">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
