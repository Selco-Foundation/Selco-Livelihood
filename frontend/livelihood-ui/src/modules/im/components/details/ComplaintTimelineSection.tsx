import { useTranslate } from "@/shared";
import { cn } from "@/ui";
import { History } from "lucide-react";
import type {
  ComplaintDetailsData,
  WorkflowDetailsData,
  WorkflowTimelineCheckpoint,
} from "../../types/incident-details";
import { FormSectionCard } from "../create/FormSectionCard";
import { ComplaintActionBar } from "./ComplaintActionBar";
import { ComplaintMediaList } from "./ComplaintMediaList";

interface ComplaintTimelineSectionProps {
  timeline: WorkflowTimelineCheckpoint[];
  complaintDetails: ComplaintDetailsData;
  workflowDetails: WorkflowDetailsData;
  onActionComplete: () => Promise<void>;
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
  const isCreateCheckpoint = action === "APPLY" || action === "CREATE";
  let reasonText: string | null = null;
  let reasonLabel: string | null = null;

  if (action === "OUT_OF_SCOPE") {
    reasonText = t(String(outOfScopeReasons.shift() ?? ""));
    reasonLabel = t("WF_OUT_OF_SCOPE_REASON");
  } else if (action === "DECLINE_POC") {
    reasonText = t(String(declineReasons.shift() ?? ""));
    reasonLabel = t("WF_DECLINE_REASON");
  }

  return (
    <div className="mt-3 space-y-3 text-xs text-muted-foreground">
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
          <p className="break-words">{comment}</p>
        </div>
      ))}

      {!isCreateCheckpoint &&
      (checkpoint.thumbnailsToShow?.fullImage?.length ||
        checkpoint.thumbnailsToShow?.videos?.length) ? (
        <div className="space-y-2">
          <p className="font-medium text-foreground">{t("CS_COMMON_ATTACHMENTS")}</p>
          <ComplaintMediaList
            images={checkpoint.thumbnailsToShow?.fullImage ?? []}
            videos={checkpoint.thumbnailsToShow?.videos ?? []}
            imageGridClassName="grid grid-cols-3 gap-2"
          />
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
  workflowDetails,
  onActionComplete,
}: ComplaintTimelineSectionProps) {
  const { t } = useTranslate();

  if (!timeline.length) {
    return null;
  }

  return (
    <FormSectionCard
      icon={History}
      title={translateOr(t, "CS_COMPLAINT_DETAILS_HISTORY", "Timeline")}
      titleClassName="text-base font-semibold text-ink-950"
      divider
    >
      <ol className="space-y-0">
        {timeline.map((checkpoint, index) => {
          // `timeline[0]` is the most recent process instance (see
          // fetchWorkflowDetails's `currentInstance = processInstances[0]`), so the
          // latest action is the FIRST entry here, not the last one rendered.
          const isLatest = index === 0;
          const isLastRendered = index === timeline.length - 1;
          const action = checkpoint.performedAction ?? "UNKNOWN";
          const actionKey = `TIMELINE_ACTION_${action}`;

          return (
            <li key={`${checkpoint.status}-${checkpoint.performedAction}-${index}`} className="relative flex gap-4 pb-8">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "z-10 flex size-3 rounded-full",
                    isLatest ? "bg-success-foreground" : "bg-muted-foreground/40",
                  )}
                />
                {!isLastRendered ? (
                  <div className="mt-1 w-px flex-1 bg-border" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pt-[-2px]">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isLatest ? "text-success-foreground" : "text-ink-950",
                  )}
                >
                  {translateOr(t, actionKey, action)}
                </p>
                <TimelineCaption
                  checkpoint={checkpoint}
                  complaintDetails={complaintDetails}
                />
              </div>
            </li>
          );
        })}
      </ol>

      <ComplaintActionBar
        complaintDetails={complaintDetails}
        workflowDetails={workflowDetails}
        onActionComplete={onActionComplete}
      />
    </FormSectionCard>
  );
}
