import { contextPath, translateOr, useModuleI18n, useTranslate } from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRoute, Outlet, redirect } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { IrDetails, IrKpis } from "./components/IrOverview";
import { IR_ROUTES } from "./constants/routes";
import { FacilityEntryListPage } from "./pages/employee/FacilityEntryListPage";
import { FacilityReviewPage } from "./pages/employee/FacilityReviewPage";
import { InstallationPlanInboxPage } from "./pages/employee/InstallationPlanInboxPage";

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
  const facilityEntriesPath = `/${basePath}${IR_ROUTES.facilityEntries}/$planId`;
  const facilityReviewPath = `/${basePath}${IR_ROUTES.facilityReview}/$planId/$entryId`;

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
    component: InstallationPlanInboxPage,
  });

  const facilityEntriesRoute = createRoute({
    getParentRoute: () => irParentRoute,
    path: facilityEntriesPath,
    component: FacilityEntryListPage,
  });

  const facilityReviewRoute = createRoute({
    getParentRoute: () => irParentRoute,
    path: facilityReviewPath,
    component: FacilityReviewPage,
  });

  return {
    routes: [
      irParentRoute,
      irIndexRoute,
      installationPlansRoute,
      facilityEntriesRoute,
      facilityReviewRoute,
    ],
    navItems: [
      {
        id: "ir-installation-plans",
        label: "Installation Plans",
        labelKey: "ES_IR_INSTALLATION_PLANS",
        to: installationPlansPath,
        icon: ClipboardCheck,
        matchPrefixes: [
          `/${basePath}${IR_ROUTES.facilityEntries}`,
          `/${basePath}${IR_ROUTES.facilityReview}`,
        ],
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
    overview: { kpis: IrKpis, details: IrDetails },
  };
}
