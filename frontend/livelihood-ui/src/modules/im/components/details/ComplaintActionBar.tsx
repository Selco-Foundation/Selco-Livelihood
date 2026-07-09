import { useAuthStore, useTranslate } from "@/shared";
import { Button } from "@/ui";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { SUPPORTED_WORKFLOW_ACTION_SET } from "../../constants/workflow-actions";
import type { ComplaintDetailsData, WorkflowDetailsData } from "../../types/incident-details";
import { isClosedTicket } from "../../utils/complaint-details";
import { isEndUser } from "../../utils/access";
import { ComplaintActionDialog } from "./ComplaintActionDialog";

const MAX_END_USER_REOPEN_COUNT = 2;

interface ComplaintActionBarProps {
  complaintDetails: ComplaintDetailsData;
  workflowDetails: WorkflowDetailsData;
  onActionComplete: () => Promise<void>;
}

function translateOr(t: (key: string) => string, key: string, fallback: string) {
  const value = t(key);
  return value === key ? fallback : value;
}

export function ComplaintActionBar({
  complaintDetails,
  workflowDetails,
  onActionComplete,
}: ComplaintActionBarProps) {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const reopenCount = useMemo(
    () =>
      workflowDetails.timeline.filter(
        (checkpoint) => checkpoint.performedAction === "REOPEN",
      ).length,
    [workflowDetails.timeline],
  );

  const availableActions = useMemo(() => {
    const supported = (workflowDetails.nextActions ?? []).filter((entry) =>
      SUPPORTED_WORKFLOW_ACTION_SET.has(entry.action),
    );

    const reopenLimitReached =
      isEndUser(user?.roles) && reopenCount >= MAX_END_USER_REOPEN_COUNT;

    return reopenLimitReached
      ? supported.filter((entry) => entry.action !== "REOPEN")
      : supported;
  }, [workflowDetails.nextActions, user?.roles, reopenCount]);

  const showActions =
    !isClosedTicket(complaintDetails.incident.applicationStatus) &&
    availableActions.length > 0;

  if (!showActions) {
    return null;
  }

  return (
    <>
      <div className="livelihood-card flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{t("WF_TAKE_ACTION")}</p>
          <p className="text-xs text-muted-foreground">
            {translateOr(t, "WF_TAKE_ACTION_DESC", "Choose an action to update this ticket")}
          </p>
        </div>
        <div className="relative">
          <Button
            type="button"
            className="gap-2"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {t("WF_TAKE_ACTION")}
            <ChevronDown className="size-4" />
          </Button>
          {menuOpen ? (
            <div className="absolute right-0 bottom-full z-20 mb-2 min-w-[220px] rounded-lg border border-border bg-card p-1 shadow-lg">
              {availableActions.map((action) => (
                <button
                  key={action.action}
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    setSelectedAction(action.action);
                    setMenuOpen(false);
                  }}
                >
                  {t(`CS_ACTION_${action.action}`)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {selectedAction ? (
        <ComplaintActionDialog
          action={selectedAction}
          complaintDetails={complaintDetails}
          onClose={() => setSelectedAction(null)}
          onComplete={async () => {
            await onActionComplete();
            setSelectedAction(null);
          }}
        />
      ) : null}
    </>
  );
}
