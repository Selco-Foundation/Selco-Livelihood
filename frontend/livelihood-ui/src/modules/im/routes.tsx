import { contextPath, useModuleI18n } from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRoute, Outlet, redirect } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { ImHomeCard } from "./components/ImHomeCard";
import { IM_ROUTES } from "./constants/routes";
import { ComplaintDetailsPage } from "./pages/employee/ComplaintDetailsPage";
import { CreateIncidentPage } from "./pages/employee/CreateIncidentPage";
import { CreateIncidentResponsePage } from "./pages/employee/CreateIncidentResponsePage";
import { InboxPage } from "./pages/employee/InboxPage";

/**
 * Parent route component for all IM pages.
 * Blocks rendering until the rainmaker-im translation module is loaded
 * (either from localStorage cache or fetched from the API on first visit).
 */
function ImModuleWrapper() {
  const { isLoading } = useModuleI18n("im");

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return <Outlet />;
}

export function createImRoutes(rootRoute: AnyRoute, employeeLayoutRoute: AnyRoute) {
  const basePath = contextPath();
  const imRoot = `/${basePath}${IM_ROUTES.imRoot}`;
  const inboxPath = `/${basePath}${IM_ROUTES.inbox}`;
  const createPath = `/${basePath}${IM_ROUTES.createIncident}`;
  const createResponsePath = `/${basePath}${IM_ROUTES.createResponse}`;
  const complaintDetailsPath = `/${basePath}${IM_ROUTES.complaintDetails}/$incidentId/$tenantId`;

  // Parent route — loads rainmaker-im translations before any IM page renders
  const imParentRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
    id: "im-module",
    component: ImModuleWrapper,
  });

  const imIndexRoute = createRoute({
    getParentRoute: () => imParentRoute,
    path: imRoot,
    beforeLoad: () => {
      throw redirect({ to: inboxPath });
    },
  });

  const inboxRoute = createRoute({
    getParentRoute: () => imParentRoute,
    path: inboxPath,
    validateSearch: (search: Record<string, unknown>) => ({
      filter: typeof search.filter === "string" ? search.filter : undefined,
      pageOffset: Number(search.pageOffset ?? 0),
      pageSize: Number(search.pageSize ?? 10),
      nearing: typeof search.nearing === "string" ? search.nearing : undefined,
    }),
    component: InboxPage,
  });

  const createIncidentRoute = createRoute({
    getParentRoute: () => imParentRoute,
    path: createPath,
    component: CreateIncidentPage,
  });

  const createIncidentResponseRoute = createRoute({
    getParentRoute: () => imParentRoute,
    path: createResponsePath,
    component: CreateIncidentResponsePage,
  });

  const complaintDetailsRoute = createRoute({
    getParentRoute: () => imParentRoute,
    path: complaintDetailsPath,
    component: ComplaintDetailsPage,
  });

  return {
    routes: [
      imParentRoute,
      imIndexRoute,
      inboxRoute,
      createIncidentRoute,
      createIncidentResponseRoute,
      complaintDetailsRoute,
    ],
    navItems: [
      {
        id: "im-inbox",
        label: "Inbox",
        to: inboxPath,
        icon: Inbox,
      },
    ],
  };
}

export function createImModule(rootRoute: AnyRoute, employeeLayoutRoute: AnyRoute) {
  const { routes, navItems } = createImRoutes(rootRoute, employeeLayoutRoute);

  return {
    id: "im",
    order: 1,
    routes,
    navItems,
    homeCards: [ImHomeCard],
  };
}
