import { translateOr, useTranslate } from "@/shared";
import { ACTIVITY_STATUS_LABELS } from "../../constants/activity-status";
import type { ReviewActivity } from "../../types/activity-review";
import { boundaryDisplayName } from "../../utils/boundary";

interface ActivityInfoCardProps {
  activity: ReviewActivity;
}

export function ActivityInfoCard({ activity }: ActivityInfoCardProps) {
  const { t } = useTranslate();
  const status = ACTIVITY_STATUS_LABELS[activity.status];

  const items = [
    {
      label: translateOr(t, "ES_IR_DISTRICT", "District"),
      value: activity.district
        ? activity.district.name ?? boundaryDisplayName(activity.district.code, t)
        : "-",
    },
    {
      label: translateOr(t, "ES_IR_BLOCK", "Block"),
      value: activity.block ? activity.block.name ?? boundaryDisplayName(activity.block.code, t) : "-",
    },
    {
      label: translateOr(t, "ES_IR_COMPONENT_TYPE", "Type"),
      value:
        activity.componentType === "MACHINE"
          ? translateOr(t, "ES_IR_COMPONENT_TYPE_MACHINE", "Machine")
          : translateOr(t, "ES_IR_COMPONENT_TYPE_SOLAR", "Solar"),
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
