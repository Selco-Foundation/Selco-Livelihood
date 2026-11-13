import { translateOr, useTranslate } from "@/shared";
import { Badge } from "@/ui";
import type { AmcApprovedBy, AmcReportStatus } from "../types/amc-report";

interface AmcStatusBadgeProps {
  status: AmcReportStatus;
  approvedBy?: AmcApprovedBy;
}

export function AmcStatusBadge({ status, approvedBy }: Readonly<AmcStatusBadgeProps>) {
  const { t } = useTranslate();

  if (status === "APPROVED") {
    return (
      <Badge variant="success">
        {approvedBy === "SYSTEM"
          ? translateOr(t, "ES_AMC_STATUS_AUTO_APPROVED", "Auto-approved")
          : translateOr(t, "ES_AMC_STATUS_APPROVED", "Approved")}
      </Badge>
    );
  }
  if (status === "REJECTED") {
    return (
      <Badge variant="outline" className="border-destructive/40 text-destructive">
        {translateOr(t, "ES_AMC_STATUS_REJECTED", "Sent for rework")}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-accent text-primary">
      {translateOr(t, "ES_AMC_STATUS_PENDING_APPROVAL", "Pending approval")}
    </Badge>
  );
}
