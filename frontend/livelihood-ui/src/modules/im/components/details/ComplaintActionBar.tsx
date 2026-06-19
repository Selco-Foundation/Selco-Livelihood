import { useTranslate } from "@/shared";
import { Button } from "@/ui";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { ComplaintDetailsData, WorkflowDetailsData } from "../../types/incident-details";
import { isClosedTicket, isRmsTicketToReopen } from "../../utils/complaint-details";
import { ComplaintActionDialog } from "./ComplaintActionDialog";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const availableActions = useMemo(() => {
    const actions = workflowDetails.nextActions ?? [];
    if (
      isRmsTicketToReopen(
        complaintDetails.incident.applicationStatus,
        complaintDetails.incident.incidentType,
        actions,
      )
    ) {
      return actions.filter((action) => action.action === "REOPEN_RMS");
    }
    return actions;
  }, [complaintDetails.incident, workflowDetails.nextActions]);

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
            <div className="absolute right-0 z-20 mt-2 min-w-[220px] rounded-lg border border-border bg-card p-1 shadow-lg">
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
          workflowDetails={workflowDetails}
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
