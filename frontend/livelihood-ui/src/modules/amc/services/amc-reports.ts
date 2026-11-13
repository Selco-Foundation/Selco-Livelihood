import type { AuthUser } from "@/shared";
import { buildDummyAmcReports } from "../constants/dummy-amc-reports";
import type {
  AmcProjectSearchResponse,
  AmcProjectSummary,
  AmcReport,
  AmcReportSearchCriteria,
  AmcReportSearchResponse,
} from "../types/amc-report";
import { amcSlaState } from "../utils/sla";

// Everything in this file is static until the AMC report APIs exist. Filtering happens here, not in
// the UI, to mirror the server-side search the real endpoint will do (open-questions technical 11).
// Each function's doc comment names its one-line swap-over.

let staticReports: AmcReport[] | null = null;

function reports(): AmcReport[] {
  staticReports ??= buildDummyAmcReports(Date.now());
  return staticReports;
}

/** Prototype helper: rebuilds the seed (used by tests to start from a clean store). */
export function resetStaticAmcReports(now: number = Date.now()) {
  staticReports = buildDummyAmcReports(now);
}

function matchesTab(report: AmcReport, tab: AmcReportSearchCriteria["tab"]): boolean {
  return tab === "auto" ? report.approvedBy === "SYSTEM" : report.approvedBy !== "SYSTEM";
}

function inList(values: string[] | undefined, value: string): boolean {
  return !values?.length || values.includes(value);
}

/** Swap-over: `apiClient.post("/asset-amc/v1/visit/_search", { RequestInfo, criteria })`. */
export async function searchAmcReports(
  criteria: AmcReportSearchCriteria,
  _accessToken?: string,
  _user?: AuthUser | null,
): Promise<AmcReportSearchResponse> {
  const search = criteria.searchText?.trim().toLowerCase();
  const matching = reports()
    .filter((report) => matchesTab(report, criteria.tab))
    .filter((report) => !criteria.projectId || report.projectId === criteria.projectId)
    .filter((report) => inList(criteria.vendors, report.vendorName))
    .filter((report) => inList(criteria.states, report.state))
    .filter((report) => inList(criteria.districts, report.district))
    .filter((report) => inList(criteria.blocks, report.block))
    .filter((report) => inList(criteria.statuses, report.status))
    .filter(
      (report) =>
        !criteria.slaBreachedOnly ||
        (report.status === "PENDING_APPROVAL" && amcSlaState(report.latestSubmissionDate).breached),
    )
    .filter((report) => !criteria.submittedFrom || report.latestSubmissionDate >= criteria.submittedFrom)
    .filter((report) => !criteria.submittedTo || report.latestSubmissionDate <= criteria.submittedTo)
    .filter(
      (report) =>
        !search || report.endUserName.toLowerCase().includes(search) || report.endUserPhone.includes(search),
    )
    .sort((a, b) => a.latestSubmissionDate - b.latestSubmissionDate);

  const offset = criteria.offset ?? 0;
  const limit = criteria.limit ?? matching.length;
  return {
    AmcReports: structuredClone(matching.slice(offset, offset + limit)),
    totalCount: matching.length,
  };
}

/** Swap-over: `apiClient.post("/asset-amc/v1/visit/_search", { RequestInfo, criteria: { ids: [reportId] } })`. */
export async function getAmcReport(
  reportId: string,
  _accessToken?: string,
  _user?: AuthUser | null,
): Promise<AmcReportSearchResponse> {
  const found = reports().filter((report) => report.id === reportId);
  return { AmcReports: structuredClone(found), totalCount: found.length };
}

function applyReview(reportId: string, update: (report: AmcReport) => void): AmcReportSearchResponse {
  const report = reports().find((item) => item.id === reportId);
  if (!report) throw new Error("AMC_REPORT_NOT_FOUND");
  if (report.status !== "PENDING_APPROVAL") throw new Error("AMC_REPORT_NOT_PENDING");
  update(report);
  return { AmcReports: [structuredClone(report)], totalCount: 1 };
}

/** Swap-over: `apiClient.post("/asset-amc/v1/visit/workflow/_update", { ..., workflow: { action: "APPROVE" } })`. */
export async function approveAmcReport(
  reportId: string,
  _accessToken?: string,
  user?: AuthUser | null,
): Promise<AmcReportSearchResponse> {
  return applyReview(reportId, (report) => {
    report.status = "APPROVED";
    report.approvedBy = "REVIEWER";
    report.history.push({ action: "APPROVED", actor: user?.name ?? "AMC Reviewer", date: Date.now() });
  });
}

/** Swap-over: `apiClient.post("/asset-amc/v1/visit/workflow/_update", { ..., workflow: { action: "REJECT", comment } })`. */
export async function sendAmcReportForRework(
  reportId: string,
  reason: string,
  _accessToken?: string,
  user?: AuthUser | null,
): Promise<AmcReportSearchResponse> {
  return applyReview(reportId, (report) => {
    report.status = "REJECTED";
    report.history.push({ action: "SENT_FOR_REWORK", actor: user?.name ?? "AMC Reviewer", date: Date.now(), comment: reason });
  });
}

/** Swap-over: a project-level AMC summary search (endpoint not designed yet). */
export async function searchAmcProjects(
  _accessToken?: string,
  _user?: AuthUser | null,
): Promise<AmcProjectSearchResponse> {
  const byProject = new Map<string, AmcProjectSummary>();
  for (const report of reports()) {
    const summary = byProject.get(report.projectId) ?? {
      projectId: report.projectId,
      projectName: report.projectName,
      states: [],
      districts: [],
      blocks: [],
      pendingCount: 0,
      breachedCount: 0,
      autoApprovedCount: 0,
    };
    for (const [key, value] of [
      ["states", report.state],
      ["districts", report.district],
      ["blocks", report.block],
    ] as const) {
      if (!summary[key].includes(value)) summary[key].push(value);
    }
    if (report.status === "PENDING_APPROVAL") {
      summary.pendingCount += 1;
      if (amcSlaState(report.latestSubmissionDate).breached) summary.breachedCount += 1;
    }
    if (report.approvedBy === "SYSTEM") summary.autoApprovedCount += 1;
    byProject.set(report.projectId, summary);
  }
  return { AmcProjects: [...byProject.values()] };
}
