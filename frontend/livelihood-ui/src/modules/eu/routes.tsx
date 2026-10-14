import { contextPath, employeeHomePath, translateOr, useAuthStore, useModuleI18n, useTranslate } from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRoute, notFound, Outlet, redirect } from "@tanstack/react-router";
import { Building2, MapPinned } from "lucide-react";
import { EuKpis } from "./components/EuOverview";
import { EU_ROUTES } from "./constants/routes";
import { BoundaryListPage } from "./pages/employee/BoundaryListPage";
import { ActivityDetailPage } from "./pages/employee/ActivityDetailPage";
import { BulkAddFacilitiesPage } from "./pages/employee/BulkAddFacilitiesPage";
import { FacilityDetailPage } from "./pages/employee/FacilityDetailPage";
import { FacilityListPage } from "./pages/employee/FacilityListPage";
import { UploadBoundaryPage } from "./pages/employee/UploadBoundaryPage";
import { EU_ROLES, hasEuAccess } from "./utils/access";

/**
 * Parent route component for all EU pages. Blocks rendering until the
 * rainmaker-eu translation module is loaded (either from localStorage cache
 * or fetched from the API on first visit) — same convention as `IrModuleWrapper`.
 */
function EuModuleWrapper() {
  const { isLoading } = useModuleI18n("eu");
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

export function createEuRoutes(rootRoute: AnyRoute, employeeLayoutRoute: AnyRoute) {
  const basePath = contextPath();
  const euRootPath = `/${basePath}${EU_ROUTES.euRoot}`;
  const facilitiesPath = `/${basePath}${EU_ROUTES.facilities}`;
  const facilitiesBulkAddPath = `/${basePath}${EU_ROUTES.facilitiesBulkAdd}`;
  const boundariesPath = `/${basePath}${EU_ROUTES.boundaries}`;
  const boundaryUploadPath = `/${basePath}${EU_ROUTES.boundaryUpload}`;

  // Parent route — loads rainmaker-eu translations and gates the whole EU
  // subtree behind EU_ROLES before any EU page renders. Without this, a
  // user who lacks access (e.g. after a login redirect straight into an EU
  // page) would reach the page component itself, which just returns null —
  // a blank page with no way out, instead of landing back on Overview.
  const euParentRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
    id: "eu-module",
    component: EuModuleWrapper,
    beforeLoad: () => {
      const user = useAuthStore.getState().user;
      if (!hasEuAccess(user?.roles)) {
        throw redirect({ to: employeeHomePath() });
      }
    },
  });

  const euIndexRoute = createRoute({
    getParentRoute: () => euParentRoute,
    path: euRootPath,
    // TanStack Router's fuzzy matching runs this beforeLoad for any
    // unmatched path under euRootPath too (e.g. `/eu/does-not-exist`), not
    // just the exact path — without this guard it would hijack those into
    // the facilities list instead of letting the app's not-found handling
    // (redirect to Overview) take over.
    beforeLoad: ({ location }) => {
      if (location.pathname !== euRootPath) {
        throw notFound();
      }
      throw redirect({ to: facilitiesPath });
    },
  });

  const facilitiesRoute = createRoute({
    getParentRoute: () => euParentRoute,
    path: facilitiesPath,
    component: FacilityListPage,
  });

  const facilitiesBulkAddRoute = createRoute({
    getParentRoute: () => euParentRoute,
    path: facilitiesBulkAddPath,
    component: BulkAddFacilitiesPage,
  });

  const facilityDetailRoute = createRoute({
    getParentRoute: () => euParentRoute,
    path: `${facilitiesPath}/$facilityId`,
    component: FacilityDetailPage,
  });

  const activityDetailRoute = createRoute({
    getParentRoute: () => euParentRoute,
    path: `${facilitiesPath}/$facilityId/activities/$activityId`,
    component: ActivityDetailPage,
  });

  const boundariesRoute = createRoute({
    getParentRoute: () => euParentRoute,
    path: boundariesPath,
    component: BoundaryListPage,
  });

  const boundaryUploadRoute = createRoute({
    getParentRoute: () => euParentRoute,
    path: boundaryUploadPath,
    component: UploadBoundaryPage,
  });

  return {
    routes: [
      euParentRoute,
      euIndexRoute,
      facilitiesRoute,
      facilitiesBulkAddRoute,
      facilityDetailRoute,
      activityDetailRoute,
      boundariesRoute,
      boundaryUploadRoute,
    ],
    navItems: [
      {
        id: "eu-facilities",
        label: "End User Sites",
        labelKey: "END_USER_SITES",
        to: facilitiesPath,
        icon: Building2,
        // Covers bulk-add, facility detail, and its nested activity-detail
        // pages — all live under this one prefix.
        matchPrefixes: [`${facilitiesPath}/`],
        roles: [...EU_ROLES],
      },
      {
        id: "eu-boundaries",
        label: "Boundaries",
        labelKey: "FA_LABEL_BOUNDARIES",
        to: boundariesPath,
        icon: MapPinned,
        matchPrefixes: [boundaryUploadPath],
        roles: [...EU_ROLES],
      },
    ],
  };
}

export function createEuModule(rootRoute: AnyRoute, employeeLayoutRoute: AnyRoute) {
  const { routes, navItems } = createEuRoutes(rootRoute, employeeLayoutRoute);

  return {
    id: "eu",
    order: 3,
    routes,
    navItems,
    overview: { kpis: EuKpis },
  };
}
