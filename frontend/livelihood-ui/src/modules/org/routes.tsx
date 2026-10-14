import { contextPath, employeeHomePath, translateOr, useAuthStore, useModuleI18n, useTranslate } from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRoute, notFound, Outlet, redirect } from "@tanstack/react-router";
import { Building, Handshake, Users } from "lucide-react";
import { OrgKpis } from "./components/OrgOverview";
import { ORG_ROUTES } from "./constants/routes";
import { MyOrganisationPage } from "./pages/employee/MyOrganisationPage";
import { OrganisationDetailPage } from "./pages/employee/OrganisationDetailPage";
import { PlatformOrganisationListPage, VendorOrganisationListPage } from "./pages/employee/OrganisationListPage";
import { hasOrgAccess, pocNavRoles, superAdminNavRoles } from "./utils/access";

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

  // Parent route — loads rainmaker-org translations and gates the whole org
  // subtree behind having any org role at all before any org page renders.
  // Without this, a user who lacks access (e.g. after a login redirect
  // straight into an org page) would reach the page component itself —
  // each one does its own finer-grained check and renders `<NoOrgAccess />`
  // for the wrong org role, but nothing stopped a user with no org role at
  // all from reaching that point instead of landing back on Overview.
  const orgParentRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
    id: "org-module",
    component: OrgModuleWrapper,
    beforeLoad: () => {
      const user = useAuthStore.getState().user;
      if (!hasOrgAccess(user?.roles)) {
        throw redirect({ to: employeeHomePath() });
      }
    },
  });

  const orgIndexRoute = createRoute({
    getParentRoute: () => orgParentRoute,
    path: orgRootPath,
    // TanStack Router's fuzzy matching runs this beforeLoad for any
    // unmatched path under orgRootPath too, not just the exact path —
    // without this guard it would hijack those into the platforms list
    // instead of letting the app's not-found handling (redirect to
    // Overview) take over.
    beforeLoad: ({ location }) => {
      if (location.pathname !== orgRootPath) {
        throw notFound();
      }
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
    overview: { kpis: OrgKpis },
  };
}
