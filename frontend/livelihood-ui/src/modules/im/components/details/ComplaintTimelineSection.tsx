import { useTranslate } from "@/shared";
import { cn } from "@/ui";
import { History } from "lucide-react";
import type {
  ComplaintDetailsData,
  WorkflowTimelineCheckpoint,
} from "../../types/incident-details";
import { FormSectionCard } from "../create/FormSectionCard";

interface ComplaintTimelineSectionProps {
  timeline: WorkflowTimelineCheckpoint[];
  complaintDetails: ComplaintDetailsData;
}

function TimelineCaption({
  checkpoint,
  complaintDetails,
}: {
  checkpoint: WorkflowTimelineCheckpoint;
  complaintDetails: ComplaintDetailsData;
}) {
  const { t } = useTranslate();
  const additional = complaintDetails.incident.additionalDetail;

  const outOfScopeReasons = [...(additional?.outOfScopeReason ?? [])].reverse();
  const declineReasons = [...(additional?.declineReason ?? [])].reverse();

  const action = checkpoint.performedAction;
  let reasonText: string | null = null;
  let reasonLabel: string | null = null;

  if (action === "OUT_OF_SCOPE") {
    reasonText = String(outOfScopeReasons.shift() ?? "");
    reasonLabel = t("WF_OUT_OF_SCOPE_REASON");
  } else if (action === "DECLINE_POC") {
    reasonText = String(declineReasons.shift() ?? "");
    reasonLabel = t("WF_DECLINE_REASON");
  }

  return (
    <div className="mt-3 space-y-3 text-sm text-muted-foreground">
      {checkpoint.auditDetails?.lastModified ? (
        <p>{checkpoint.auditDetails.lastModified}</p>
      ) : null}
      {checkpoint.assigner?.name ? <p>{checkpoint.assigner.name}</p> : null}
      {checkpoint.assigner?.mobileNumber ? (
        <p>{checkpoint.assigner.mobileNumber}</p>
      ) : null}

      {reasonText ? (
        <div>
          <p className="font-medium text-foreground">{reasonLabel}</p>
          <p>{reasonText}</p>
        </div>
      ) : null}

      {checkpoint.wfComment?.map((comment, index) => (
        <div key={`${comment}-${index}`}>
          <p className="font-medium text-foreground">{t("WF_COMMON_COMMENTS")}</p>
          <p>{comment}</p>
        </div>
      ))}

      {checkpoint.thumbnailsToShow?.fullImage?.length ? (
        <div className="grid grid-cols-3 gap-2">
          {checkpoint.thumbnailsToShow.fullImage.map((src) => (
            <a key={src} href={src} target="_blank" rel="noreferrer">
              <img src={src} alt="" className="aspect-square rounded-md object-cover" />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function translateOr(t: (key: string) => string, key: string, fallback: string) {
  const value = t(key);
  return value === key ? fallback : value;
}

export function ComplaintTimelineSection({
  timeline,
  complaintDetails,
}: ComplaintTimelineSectionProps) {
  const { t } = useTranslate();

  if (!timeline.length) {
    return null;
  }

  return (
    <FormSectionCard
      icon={History}
      title={translateOr(t, "CS_COMPLAINT_DETAILS_HISTORY", "Ticket history")}
      description={translateOr(
        t,
        "CS_COMPLAINT_DETAILS_HISTORY_DESC",
        "Track updates and actions taken on this ticket",
      )}
    >
      <ol className="space-y-0">
        {timeline.map((checkpoint, index) => {
          const isLast = index === timeline.length - 1;
          const statusKey = checkpoint.status
            ? `CS_COMMON_${checkpoint.status}`
            : checkpoint.performedAction ?? "UNKNOWN";

          return (
            <li key={`${checkpoint.status}-${checkpoint.performedAction}-${index}`} className="relative flex gap-4 pb-8">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "z-10 flex size-3 rounded-full",
                    isLast ? "bg-primary" : "bg-muted-foreground/40",
                  )}
                />
                {!isLast ? (
                  <div className="mt-1 w-px flex-1 bg-border" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pt-[-2px]">
                <p className="text-sm font-semibold text-foreground">
                  {translateOr(t, statusKey, statusKey)}
                </p>
                {checkpoint.performedAction ? (
                  <p className="text-xs text-muted-foreground">
                    {translateOr(
                      t,
                      `CS_ACTION_${checkpoint.performedAction}`,
                      checkpoint.performedAction,
                    )}
                  </p>
                ) : null}
                <TimelineCaption
                  checkpoint={checkpoint}
                  complaintDetails={complaintDetails}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </FormSectionCard>
  );
}
