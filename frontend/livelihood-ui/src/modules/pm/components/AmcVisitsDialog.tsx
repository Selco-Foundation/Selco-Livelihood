import { translateOr, useTranslate } from "@/shared";
import { Badge, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Skeleton } from "@/ui";
import { useAmcVisits } from "../hooks/use-amc-visits";
import type { AmcScheduleRow, AmcVisitRow } from "../types/amc";
import { isPendingActivation, totalAmcActivities } from "../utils/amc-schedule";
import { formatDate } from "../utils/format-date";

interface AmcVisitsDialogProps {
  /** The AMC whose visits are listed; null when the dialog is closed. */
  row: AmcScheduleRow | null;
  onClose: () => void;
}

/** Read-only progress of one AMC. The PM sees each visit's status, not its report (PRD 4.1). */
export function AmcVisitsDialog({ row, onClose }: Readonly<AmcVisitsDialogProps>) {
  const { t } = useTranslate();
  const { data: visits = [], isLoading, isError } = useAmcVisits(row?.id);
  const total = row ? totalAmcActivities(row) : undefined;

  function statusLabel(visit: AmcVisitRow): string {
    switch (visit.status) {
      case "SCHEDULED":
        return translateOr(t, "ES_PM_AMC_VISIT_SCHEDULED", "Scheduled");
      case "PENDING_OTP_APPROVAL":
        return translateOr(t, "ES_PM_AMC_VISIT_WAITING_CODE", "Waiting for service code");
      case "PENDING_APPROVAL":
        return translateOr(t, "ES_PM_AMC_VISIT_PENDING_APPROVAL", "Pending approval");
      case "REJECTED":
        return translateOr(t, "ES_PM_AMC_VISIT_REWORK", "Sent for rework");
      case "APPROVED":
        return visit.autoApproved
          ? translateOr(t, "ES_PM_AMC_VISIT_AUTO_APPROVED", "Auto-approved")
          : translateOr(t, "ES_PM_AMC_VISIT_APPROVED", "Approved");
      default:
        return visit.status ?? "-";
    }
  }

  const columns = [
    translateOr(t, "ES_PM_AMC_VISIT", "Visit"),
    translateOr(t, "ES_PM_AMC_VISIT_DUE", "Due date"),
    translateOr(t, "ES_PM_AMC_VISIT_STATUS", "Status"),
    translateOr(t, "ES_PM_AMC_FIELD_STAFF", "AMC field staff"),
    translateOr(t, "ES_PM_AMC_VISIT_SUBMITTED_ON", "Submitted on"),
  ];

  function renderBody() {
    if (isLoading) return <Skeleton className="h-40 w-full" />;
    if (isError) {
      return (
        <p role="alert" className="py-6 text-center text-sm text-destructive">
          {translateOr(t, "ES_PM_AMC_VISITS_LOAD_FAILED", "Could not load the AMC visits. Please try again.")}
        </p>
      );
    }
    if (visits.length === 0) {
      return (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {row && isPendingActivation(row)
            ? translateOr(t, "ES_PM_AMC_VISITS_AFTER_INSTALLATION", "Visits start once the installation is approved.")
            : translateOr(t, "ES_PM_AMC_NO_VISITS", "No visits yet")}
        </p>
      );
    }
    return (
      <>
        <div className="max-h-[55vh] overflow-auto rounded-lg border border-border">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                {columns.map((label) => (
                  <th key={label} className="px-4 py-3 text-left font-semibold text-ink-950">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit.id} className="border-b border-border/70 last:border-b-0">
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                    {translateOr(t, "ES_PM_AMC_VISIT_N_OF_M", "{number} of {total}")
                      .replace("{number}", String(visit.number))
                      .replace("{total}", String(total ?? "-"))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-foreground">
                    {formatDate(visit.dueDate)}
                    {visit.isOverdue ? (
                      <Badge variant="outline" className="ml-2 border-destructive/40 text-destructive">
                        {translateOr(t, "ES_PM_AMC_VISIT_OVERDUE", "Overdue")}
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-foreground">{statusLabel(visit)}</td>
                  <td className="px-4 py-3 text-foreground">{visit.fieldStaffName ?? "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-foreground">{formatDate(visit.submittedDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total !== undefined && visits.length < total ? (
          <p className="text-xs text-muted-foreground">
            {translateOr(
              t,
              "ES_PM_AMC_VISITS_LATER",
              "Each later visit is created once the visit before it is submitted.",
            )}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {translateOr(t, "ES_PM_AMC_VISITS_TITLE", "AMC visits of {endUser}").replace("{endUser}", row?.endUserName ?? "")}
          </DialogTitle>
          <DialogDescription>
            {translateOr(t, "ES_PM_AMC_VISITS_DESC", "Progress only. Reports are reviewed by the AMC reviewer.")}
          </DialogDescription>
        </DialogHeader>
        {renderBody()}
      </DialogContent>
    </Dialog>
  );
}
