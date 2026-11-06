import { translateOr, useTranslate } from "@/shared";
import { cn } from "@/ui";

export function orgStatusLabel(status: string, t: (key: string) => string) {
  return status === "ACTIVE"
    ? translateOr(t, "ORGANIZATION_STATUS_ACTIVE", "Active")
    : status === "INACTIVE"
      ? translateOr(t, "ORGANIZATION_STATUS_INACTIVE", "Inactive")
      : translateOr(t, `ORGANIZATION_STATUS_${status}`, status);
}

export function OrgStatusBadge({ status }: { status: string }) {
  const { t } = useTranslate();
  const isActive = status === "ACTIVE";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isActive ? "bg-chip-success text-chip-success-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {orgStatusLabel(status, t)}
    </span>
  );
}
