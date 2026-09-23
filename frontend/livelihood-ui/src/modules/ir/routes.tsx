import { contextPath, translateOr, useModuleI18n, useTranslate } from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRoute, Outlet, redirect } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { IrKpis } from "./components/IrOverview";
import { IR_ROUTES } from "./constants/routes";
import { ActivityList } from "./pages/employee/ActivityList";
import { ActivityReview } from "./pages/employee/ActivityReview";
import { InstallationPlanInbox } from "./pages/employee/InstallationPlanInbox";
import { IR_ROLES } from "./utils/access";

/**
 * Parent route component for all IR pages.
 * Blocks rendering until the rainmaker-ir translation module is loaded
 * (either from localStorage cache or fetched from the API on first visit).
 */
function IrModuleWrapper() {
  const { isLoading } = useModuleI18n("ir");
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

export function createIrRoutes(rootRoute: AnyRoute, employeeLayoutRoute: AnyRoute) {
  const basePath = contextPath();
  const irRootPath = `/${basePath}${IR_ROUTES.irRoot}`;
  const installationPlansPath = `/${basePath}${IR_ROUTES.installationPlans}`;
  const activitiesPath = `${installationPlansPath}/$planId/activities`;
  const activityReviewPath = `${activitiesPath}/$activityId/review`;

  // Parent route — loads rainmaker-ir translations before any IR page renders
  const irParentRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
    id: "ir-module",
    component: IrModuleWrapper,
  });

  const irIndexRoute = createRoute({
    getParentRoute: () => irParentRoute,
    path: irRootPath,
    beforeLoad: () => {
      throw redirect({ to: installationPlansPath });
    },
  });

  const installationPlansRoute = createRoute({
    getParentRoute: () => irParentRoute,
    path: installationPlansPath,
    component: InstallationPlanInbox,
  });

  const activitiesRoute = createRoute({
    getParentRoute: () => irParentRoute,
    path: activitiesPath,
    component: ActivityList,
  });

  const activityReviewRoute = createRoute({
    getParentRoute: () => irParentRoute,
    path: activityReviewPath,
    component: ActivityReview,
  });

  return {
    routes: [
      irParentRoute,
      irIndexRoute,
      installationPlansRoute,
      activitiesRoute,
      activityReviewRoute,
    ],
    navItems: [
      {
        id: "ir-installation-plans",
        label: "Installation Plans",
        labelKey: "ES_IR_INSTALLATION_PLANS",
        to: installationPlansPath,
        icon: ClipboardCheck,
        // No matchPrefixes needed: activities/review paths are now literally
        // nested under installationPlansPath ($planId/activities/...), and
        // AppShell's isNavItemActive already treats `to` as a startsWith
        // prefix — unlike before, when "entries"/"review" were sibling
        // segments under installation-plans that needed listing explicitly.
        roles: [...IR_ROLES],
      },
    ],
  };
}

export function createIrModule(rootRoute: AnyRoute, employeeLayoutRoute: AnyRoute) {
  const { routes, navItems } = createIrRoutes(rootRoute, employeeLayoutRoute);

  return {
    id: "ir",
    order: 2,
    routes,
    navItems,
    overview: { kpis: IrKpis },
  };
}
