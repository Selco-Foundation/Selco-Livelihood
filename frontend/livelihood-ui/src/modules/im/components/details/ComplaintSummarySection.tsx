import { useTranslate } from "@/shared";
import { ClipboardList } from "lucide-react";
import type { ComplaintDetailsData } from "../../types/incident-details";
import { translateDetailValue } from "../../utils/complaint-details";
import { FormSectionCard } from "../create/FormSectionCard";

interface ComplaintSummarySectionProps {
  complaintDetails: ComplaintDetailsData;
}

export function ComplaintSummarySection({
  complaintDetails,
}: ComplaintSummarySectionProps) {
  const { t } = useTranslate();

  return (
    <FormSectionCard
      icon={ClipboardList}
      title={t("CS_HEADER_TICKET_DETAILS")}
      description={t("CS_HEADER_INCIDENT_SUMMARY")}
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        {complaintDetails.rows.map((row) => (
          <div key={row.labelKey} className="min-w-0 space-y-1">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t(row.labelKey)}
            </dt>
            <dd className="text-sm text-foreground">
              {translateDetailValue(row.value, t)}
            </dd>
          </div>
        ))}
      </dl>
    </FormSectionCard>
  );
}
