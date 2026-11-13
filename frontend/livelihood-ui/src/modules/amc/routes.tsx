import { contextPath, employeeHomePath, translateOr, useAuthStore, useModuleI18n, useTranslate } from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRoute, notFound, Outlet, redirect } from "@tanstack/react-router";
import { FolderSearch, Wrench } from "lucide-react";
import { AmcKpis } from "./components/AmcOverview";
import { AMC_ROUTES } from "./constants/routes";
import { AmcProjectReportsPage } from "./pages/employee/AmcProjectReportsPage";
import { AmcProjectsPage } from "./pages/employee/AmcProjectsPage";
import { AmcReportDetailPage } from "./pages/employee/AmcReportDetailPage";
import { AmcReportsPage } from "./pages/employee/AmcReportsPage";
import type { AmcReportTab } from "./types/amc-report";
import { AMC_REVIEWER_ROLES, hasAmcReviewerAccess } from "./utils/access";

export interface AmcReportsRouteSearch {
  tab?: AmcReportTab;
}

function validateReportsSearch(search: Record<string, unknown>): AmcReportsRouteSearch {
  return { tab: search.tab === "auto" ? "auto" : "pending" };
}

/** Blocks rendering until the rainmaker-amc translation module is loaded. */
export function AmcModuleWrapper() {
  const { isLoading } = useModuleI18n("amc");
  const { t } = useTranslate();

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        {translateOr(t, "CORE_COMMON_LOADING", "Loading...")}
      </div>
    );
  }

  return <Outlet />;
}

export function createAmcRoutes(employeeLayoutRoute: AnyRoute) {
  const basePath = contextPath();
  const amcRootPath = `/${basePath}${AMC_ROUTES.amcRoot}`;
  const reportsPath = `/${basePath}${AMC_ROUTES.reports}`;
  const reportDetailPath = `${reportsPath}/$reportId`;
  const projectsPath = `/${basePath}${AMC_ROUTES.projects}`;
  const projectReportsPath = `${projectsPath}/$projectId`;

  // Gates the whole AMC reviewer subtree behind AMC_REVIEWER_ROLES, like IR's parent route.
  const amcParentRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
    id: "amc-module",
    component: AmcModuleWrapper,
    beforeLoad: () => {
      const user = useAuthStore.getState().user;
      if (!hasAmcReviewerAccess(user?.roles)) {
        throw redirect({ to: employeeHomePath() });
      }
    },
  });

  const amcIndexRoute = createRoute({
    getParentRoute: () => amcParentRoute,
    path: amcRootPath,
    // Same fuzzy-match guard as IR/PM: only the exact root redirects, anything else is not-found.
    beforeLoad: ({ location }) => {
      if (location.pathname !== amcRootPath) {
        throw notFound();
      }
      throw redirect({ to: reportsPath });
    },
  });

  const reportsRoute = createRoute({
    getParentRoute: () => amcParentRoute,
    path: reportsPath,
    validateSearch: validateReportsSearch,
    component: AmcReportsPage,
  });

  const reportDetailRoute = createRoute({
    getParentRoute: () => amcParentRoute,
    path: reportDetailPath,
    component: AmcReportDetailPage,
  });

  const projectsRoute = createRoute({
    getParentRoute: () => amcParentRoute,
    path: projectsPath,
    component: AmcProjectsPage,
  });

  const projectReportsRoute = createRoute({
    getParentRoute: () => amcParentRoute,
    path: projectReportsPath,
    validateSearch: validateReportsSearch,
    component: AmcProjectReportsPage,
  });

  return {
    routes: [amcParentRoute, amcIndexRoute, reportsRoute, reportDetailRoute, projectsRoute, projectReportsRoute],
    navItems: [
      {
        id: "amc-reports",
        label: "AMC Reports",
        labelKey: "ES_AMC_REPORTS",
        to: reportsPath,
        icon: Wrench,
        roles: [...AMC_REVIEWER_ROLES],
      },
      {
        id: "amc-projects",
        label: "AMC Projects",
        labelKey: "ES_AMC_PROJECTS",
        to: projectsPath,
        icon: FolderSearch,
        roles: [...AMC_REVIEWER_ROLES],
      },
    ],
  };
}

export function createAmcModule(_rootRoute: AnyRoute, employeeLayoutRoute: AnyRoute) {
  const { routes, navItems } = createAmcRoutes(employeeLayoutRoute);

  return {
    id: "amc",
    order: 5,
    routes,
    navItems,
    overview: { kpis: AmcKpis },
  };
}
