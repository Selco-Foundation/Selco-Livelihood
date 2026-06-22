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

  const rejectReasons = [...(additional?.rejectReason ?? [])].reverse();
  const reopenReasons = [...(additional?.reopenreason ?? [])].reverse();
  const sendBackReasons = [...(additional?.sendBackReason ?? [])].reverse();
  const outOfScopeReasons = [...(additional?.outOfScopeReason ?? [])].reverse();
  const oowResponses = [...(additional?.oowResponses ?? [])].reverse();
  const spcResponses = [...(additional?.spcResponses ?? [])].reverse();

  const action = checkpoint.performedAction;
  let reasonText: string | null = null;

  if (action === "REJECT") {
    reasonText = String(rejectReasons.shift() ?? "");
  } else if (action === "REOPEN" || action === "REOPEN_RMS") {
    reasonText = String(reopenReasons.shift() ?? "");
  } else if (action === "SENDBACK") {
    const reason = sendBackReasons.shift();
    reasonText =
      typeof reason === "object" && reason && "reason" in reason
        ? String((reason as { reason?: string }).reason)
        : String(reason ?? "");
  } else if (action === "MARK_OUT_OF_SCOPE") {
    reasonText = String(outOfScopeReasons.shift() ?? "");
  }

  const oow = ["OUT_OF_WARRANTY", "SUBMIT"].includes(action ?? "")
    ? oowResponses.shift()
    : null;
  const spc = action === "SPARE_PART_NEEDED" ? spcResponses.shift() : null;

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
          <p className="font-medium text-foreground">{t("WF_DECLINE_REASON")}</p>
          <p>{reasonText}</p>
        </div>
      ) : null}

      {oow ? (
        <div className="space-y-1">
          {oow.oowIssue ? (
            <p>
              <span className="font-medium text-foreground">{t("OOW_ACTION_ISSUE_OBSERVATION")}: </span>
              {oow.oowIssue}
            </p>
          ) : null}
          {oow.oowRootCause ? (
            <p>
              <span className="font-medium text-foreground">{t("OOW_ACTION_ISSUE_ROOT_CAUSE")}: </span>
              {oow.oowRootCause}
            </p>
          ) : null}
          {oow.oowRecommendedSolution ? (
            <p>
              <span className="font-medium text-foreground">{t("OOW_ACTION_ISSUE_SOLUTION")}: </span>
              {oow.oowRecommendedSolution}
            </p>
          ) : null}
        </div>
      ) : null}

      {spc ? (
        <div className="space-y-1">
          {spc.spcRootAnalysis ? (
            <p>
              <span className="font-medium text-foreground">{t("SPC_ACTION_ROOT_CAUSE_ANALYSIS")}: </span>
              {spc.spcRootAnalysis}
            </p>
          ) : null}
          {spc.spcSparePartToBeReplaced ? (
            <p>
              <span className="font-medium text-foreground">{t("SPC_ACTION_SPARE_PART_TO_BE_REPLACED")}: </span>
              {spc.spcSparePartToBeReplaced}
            </p>
          ) : null}
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
