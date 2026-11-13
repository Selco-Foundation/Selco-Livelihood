import { beforeEach, describe, expect, it } from "vitest";
import {
  approveAmcReport,
  getAmcReport,
  resetStaticAmcReports,
  searchAmcProjects,
  searchAmcReports,
  sendAmcReportForRework,
} from "./amc-reports";

beforeEach(() => {
  resetStaticAmcReports();
});

describe("searchAmcReports (static)", () => {
  it("splits manual-review and auto-approved reports by tab", async () => {
    const pending = await searchAmcReports({ tab: "pending" });
    const auto = await searchAmcReports({ tab: "auto" });

    expect(pending.AmcReports.every((report) => report.approvedBy !== "SYSTEM")).toBe(true);
    expect(auto.AmcReports.every((report) => report.approvedBy === "SYSTEM")).toBe(true);
    expect(pending.totalCount + auto.totalCount).toBeGreaterThan(0);
  });

  it("filters by status, vendor and geography together", async () => {
    const { AmcReports } = await searchAmcReports({
      tab: "pending",
      statuses: ["PENDING_APPROVAL"],
      states: ["Karnataka"],
      vendors: ["Udaya Solar Pvt Ltd"],
    });

    expect(AmcReports.length).toBeGreaterThan(0);
    expect(
      AmcReports.every(
        (report) =>
          report.status === "PENDING_APPROVAL" && report.state === "Karnataka" && report.vendorName === "Udaya Solar Pvt Ltd",
      ),
    ).toBe(true);
  });

  it("keeps only breached pending reports when asked", async () => {
    const { AmcReports } = await searchAmcReports({ tab: "pending", slaBreachedOnly: true });

    expect(AmcReports.map((report) => report.endUserName).sort()).toEqual(["user983", "user984"]);
  });

  it("searches by end user name or phone", async () => {
    expect((await searchAmcReports({ tab: "pending", searchText: "user981" })).totalCount).toBe(1);
    expect((await searchAmcReports({ tab: "pending", searchText: "9701233458" })).totalCount).toBe(1);
  });

  it("pages the results but reports the full count", async () => {
    const all = await searchAmcReports({ tab: "pending" });
    const page = await searchAmcReports({ tab: "pending", offset: 0, limit: 2 });

    expect(page.AmcReports).toHaveLength(2);
    expect(page.totalCount).toBe(all.totalCount);
  });
});

describe("review actions (static)", () => {
  it("approves a pending report and records who approved it", async () => {
    await approveAmcReport("amc-report-1", undefined, { name: "Reviewer One" });
    const [report] = (await getAmcReport("amc-report-1")).AmcReports;

    expect(report.status).toBe("APPROVED");
    expect(report.approvedBy).toBe("REVIEWER");
    expect(report.history.at(-1)).toMatchObject({ action: "APPROVED", actor: "Reviewer One" });
  });

  it("sends a pending report for rework with the reason", async () => {
    await sendAmcReportForRework("amc-report-2", "Retake the photo");
    const [report] = (await getAmcReport("amc-report-2")).AmcReports;

    expect(report.status).toBe("REJECTED");
    expect(report.history.at(-1)).toMatchObject({ action: "SENT_FOR_REWORK", comment: "Retake the photo" });
  });

  it("refuses to review a report that is not pending", async () => {
    const { AmcReports } = await searchAmcReports({ tab: "auto", limit: 1 });

    await expect(approveAmcReport(AmcReports[0].id)).rejects.toThrow("AMC_REPORT_NOT_PENDING");
  });
});

describe("searchAmcProjects (static)", () => {
  it("summarises pending, breached and auto-approved counts per project", async () => {
    const { AmcProjects } = await searchAmcProjects();
    const totalPending = (await searchAmcReports({ tab: "pending", statuses: ["PENDING_APPROVAL"] })).totalCount;

    expect(AmcProjects).toHaveLength(3);
    expect(AmcProjects.reduce((sum, project) => sum + project.pendingCount, 0)).toBe(totalPending);
  });
});
