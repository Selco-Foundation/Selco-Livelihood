import { contextPath, translateOr, useModuleI18n, useTranslate } from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRoute, Outlet, redirect } from "@tanstack/react-router";
import { Building2, MapPinned } from "lucide-react";
import { EU_ROUTES } from "./constants/routes";
import { BoundaryListPage } from "./pages/employee/BoundaryListPage";
import { FacilityListPage } from "./pages/employee/FacilityListPage";
import { UploadBoundaryPage } from "./pages/employee/UploadBoundaryPage";
import { EU_ROLES } from "./utils/access";

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
  const boundariesPath = `/${basePath}${EU_ROUTES.boundaries}`;
  const boundaryUploadPath = `/${basePath}${EU_ROUTES.boundaryUpload}`;

  // Parent route — loads rainmaker-eu translations before any EU page renders
  const euParentRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
    id: "eu-module",
    component: EuModuleWrapper,
  });

  const euIndexRoute = createRoute({
    getParentRoute: () => euParentRoute,
    path: euRootPath,
    beforeLoad: () => {
      throw redirect({ to: facilitiesPath });
    },
  });

  const facilitiesRoute = createRoute({
    getParentRoute: () => euParentRoute,
    path: facilitiesPath,
    component: FacilityListPage,
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
    routes: [euParentRoute, euIndexRoute, facilitiesRoute, boundariesRoute, boundaryUploadRoute],
    navItems: [
      {
        id: "eu-facilities",
        label: "End User Sites",
        labelKey: "END_USER_SITES",
        to: facilitiesPath,
        icon: Building2,
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
  };
}
