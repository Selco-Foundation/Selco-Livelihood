import { contextPath } from "@/shared";
import { AMC_ROUTES } from "../constants/routes";

export function amcReportsPath() {
  return `/${contextPath()}${AMC_ROUTES.reports}`;
}

export function amcReportDetailPath(reportId: string) {
  return `/${contextPath()}${AMC_ROUTES.reports}/${reportId}`;
}

export function amcProjectsPath() {
  return `/${contextPath()}${AMC_ROUTES.projects}`;
}

export function amcProjectReportsPath(projectId: string) {
  return `/${contextPath()}${AMC_ROUTES.projects}/${projectId}`;
}
