import type { AmcReportSearchCriteria, AmcReportTab } from "../types/amc-report";

export const amcKeys = {
  all: ["amc"] as const,
  reports: () => [...amcKeys.all, "report"] as const,
  reportList: (criteria: AmcReportSearchCriteria) => [...amcKeys.reports(), "list", criteria] as const,
  reportFilterSource: (tab: AmcReportTab, projectId: string | undefined) =>
    [...amcKeys.reports(), "filter-source", tab, projectId] as const,
  reportCount: () => [...amcKeys.reports(), "count"] as const,
  report: (reportId: string | undefined) => [...amcKeys.reports(), reportId] as const,
  projects: () => [...amcKeys.all, "project"] as const,
};
