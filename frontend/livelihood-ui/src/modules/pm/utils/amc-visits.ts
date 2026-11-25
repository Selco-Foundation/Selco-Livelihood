import { startOfDay } from "date-fns";
import type { AmcVisitRow, RawAmcVisitSummary } from "../types/amc";

/** One AMC's visits in order. A visit not submitted by its due day is overdue. */
export function toAmcVisitRows(visits: RawAmcVisitSummary[], now: Date): AmcVisitRow[] {
  return visits
    .map((visit) => ({
      id: visit.id,
      number: visit.visitNumber ?? 0,
      status: visit.status,
      autoApproved: visit.approvedBy === "SYSTEM",
      dueDate: visit.scheduledDate ?? undefined,
      submittedDate: visit.latestSubmissionDate ?? visit.firstSubmissionDate ?? undefined,
      fieldStaffName: visit.fieldStaff?.name ?? undefined,
      isOverdue:
        !visit.firstSubmissionDate && Boolean(visit.scheduledDate) && visit.scheduledDate! < startOfDay(now).getTime(),
    }))
    .sort((a, b) => a.number - b.number);
}
