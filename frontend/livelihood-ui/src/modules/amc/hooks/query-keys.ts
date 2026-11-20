import type { AmcReportSearchCriteria } from "../types/amc-report";

export const amcKeys = {
  all: ["amc"] as const,
  reports: () => [...amcKeys.all, "report"] as const,
  reportList: (criteria: AmcReportSearchCriteria) => [...amcKeys.reports(), "list", criteria] as const,
  reportCount: () => [...amcKeys.reports(), "count"] as const,
  report: (reportId: string | undefined) => [...amcKeys.reports(), reportId] as const,
  files: (fileStoreIds: string[]) => [...amcKeys.all, "files", fileStoreIds] as const,
  projects: (page: { offset: number; limit: number }) => [...amcKeys.all, "project", page] as const,
  project: (projectId: string | undefined) => [...amcKeys.all, "project", projectId] as const,
  vendorOptions: () => [...amcKeys.all, "vendor-options"] as const,
  rejectionReasons: () => [...amcKeys.all, "rejection-reasons"] as const,
};
