import { contextPath, translateOr, useModuleI18n, useTranslate } from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRoute, Outlet, redirect } from "@tanstack/react-router";
import { Building, Handshake, Users } from "lucide-react";
import { ORG_ROUTES } from "./constants/routes";
import { MyOrganisationPage } from "./pages/employee/MyOrganisationPage";
import { OrganisationDetailPage } from "./pages/employee/OrganisationDetailPage";
import { PlatformOrganisationListPage, VendorOrganisationListPage } from "./pages/employee/OrganisationListPage";
import { pocNavRoles, superAdminNavRoles } from "./utils/access";

/**
 * Parent route component for all org pages. Blocks rendering until the
 * rainmaker-org translation module is loaded — same convention as `EuModuleWrapper`.
 */
function OrgModuleWrapper() {
  const { isLoading } = useModuleI18n("org");
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

export function createOrgRoutes(_rootRoute: AnyRoute, employeeLayoutRoute: AnyRoute) {
  const basePath = contextPath();
  const orgRootPath = `/${basePath}${ORG_ROUTES.orgRoot}`;
  const platformsPath = `/${basePath}${ORG_ROUTES.platforms}`;
  const vendorsPath = `/${basePath}${ORG_ROUTES.vendors}`;
  const organisationsPath = `/${basePath}${ORG_ROUTES.organisations}`;
  const myOrganisationPath = `/${basePath}${ORG_ROUTES.myOrganisation}`;

  const orgParentRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
    id: "org-module",
    component: OrgModuleWrapper,
  });

  const orgIndexRoute = createRoute({
    getParentRoute: () => orgParentRoute,
    path: orgRootPath,
    beforeLoad: () => {
      throw redirect({ to: platformsPath });
    },
  });

  const platformsRoute = createRoute({
    getParentRoute: () => orgParentRoute,
    path: platformsPath,
    component: PlatformOrganisationListPage,
  });

  const vendorsRoute = createRoute({
    getParentRoute: () => orgParentRoute,
    path: vendorsPath,
    component: VendorOrganisationListPage,
  });

  const organisationDetailRoute = createRoute({
    getParentRoute: () => orgParentRoute,
    path: `${organisationsPath}/$organisationId`,
    component: OrganisationDetailPage,
  });

  const myOrganisationRoute = createRoute({
    getParentRoute: () => orgParentRoute,
    path: myOrganisationPath,
    component: MyOrganisationPage,
  });

  return {
    routes: [orgParentRoute, orgIndexRoute, platformsRoute, vendorsRoute, organisationDetailRoute, myOrganisationRoute],
    navItems: [
      {
        id: "org-platforms",
        // Short label: the full "Platform Organisations" truncates in the sidebar.
        label: "Platform Orgs",
        labelKey: "ORG_NAV_PLATFORM_ORGS",
        to: platformsPath,
        icon: Building,
        roles: superAdminNavRoles(),
      },
      {
        id: "org-vendors",
        label: "Vendor Orgs",
        labelKey: "ORG_NAV_VENDOR_ORGS",
        to: vendorsPath,
        icon: Handshake,
        roles: superAdminNavRoles(),
      },
      {
        id: "org-my-organisation",
        label: "My Organisation",
        labelKey: "ORG_MY_ORGANISATION",
        to: myOrganisationPath,
        icon: Users,
        roles: pocNavRoles(),
      },
    ],
  };
}

export function createOrgModule(rootRoute: AnyRoute, employeeLayoutRoute: AnyRoute) {
  const { routes, navItems } = createOrgRoutes(rootRoute, employeeLayoutRoute);

  return {
    id: "org",
    order: 4,
    routes,
    navItems,
  };
}
