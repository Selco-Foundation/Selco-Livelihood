import { describe, expect, it } from "vitest";
import { toAmcVisitRows } from "./amc-visits";

const now = new Date(2026, 10, 23, 12);
const day = (date: number) => new Date(2026, 10, date).getTime();

describe("toAmcVisitRows", () => {
  it("orders the visits and shows the latest submission", () => {
    const rows = toAmcVisitRows(
      [
        { id: "v2", visitNumber: 2, status: "SCHEDULED", scheduledDate: day(30), fieldStaff: { name: "Ravi" } },
        { id: "v1", visitNumber: 1, status: "APPROVED", approvedBy: "SYSTEM", scheduledDate: day(1), firstSubmissionDate: day(2), latestSubmissionDate: day(5) },
      ],
      now,
    );
    expect(rows.map((row) => row.id)).toEqual(["v1", "v2"]);
    expect(rows[0]).toMatchObject({ submittedDate: day(5), autoApproved: true, isOverdue: false });
    expect(rows[1]).toMatchObject({ submittedDate: undefined, fieldStaffName: "Ravi", isOverdue: false });
  });

  it("is overdue from the day after the due day, until it is submitted", () => {
    const overdue = (scheduledDate: number, firstSubmissionDate?: number) =>
      toAmcVisitRows([{ id: "v", scheduledDate, firstSubmissionDate }], now)[0].isOverdue;
    expect(overdue(day(22))).toBe(true);
    expect(overdue(day(23))).toBe(false);
    expect(overdue(day(22), day(23))).toBe(false);
  });
});
