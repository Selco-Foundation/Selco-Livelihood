import { translateOr, useTranslate } from "@/shared";
import type { FacilityEntry } from "../../types/facility-review";

function statusLabelKey(status: FacilityEntry["status"]): { key: string; fallback: string } {
  switch (status) {
    case "SUBMITTED_BY_SUPERVISOR":
      return { key: "ES_IR_STATUS_PENDING", fallback: "Pending Review" };
    case "REJECTED":
      return { key: "ES_IR_STATUS_REJECTED", fallback: "Rejected" };
    case "APPROVED":
    default:
      return { key: "ES_IR_STATUS_APPROVED", fallback: "Approved" };
  }
}

interface FacilityInfoCardProps {
  entry: FacilityEntry;
}

export function FacilityInfoCard({ entry }: FacilityInfoCardProps) {
  const { t } = useTranslate();
  const status = statusLabelKey(entry.status);

  const items = [
    { label: translateOr(t, "ES_IR_DISTRICT", "District"), value: entry.district?.name ?? "-" },
    { label: translateOr(t, "ES_IR_BLOCK", "Block"), value: entry.block?.name ?? "-" },
    {
      label: translateOr(t, "ES_IR_FACILITY_TYPE", "Facility Type"),
      value:
        entry.entryType === "MACHINE"
          ? translateOr(t, "ES_IR_ENTRY_TYPE_MACHINE", "Machine")
          : translateOr(t, "ES_IR_ENTRY_TYPE_SOLAR", "Solar"),
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
