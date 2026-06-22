import { contextPath } from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRoute, redirect } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { ImHomeCard } from "./components/ImHomeCard";
import { IM_ROUTES } from "./constants/routes";
import { ComplaintDetailsPage } from "./pages/employee/ComplaintDetailsPage";
import { CreateIncidentPage } from "./pages/employee/CreateIncidentPage";
import { CreateIncidentResponsePage } from "./pages/employee/CreateIncidentResponsePage";
import { InboxPage } from "./pages/employee/InboxPage";

export function createImRoutes(rootRoute: AnyRoute, employeeLayoutRoute: AnyRoute) {
  const basePath = contextPath();
  const imRoot = `/${basePath}${IM_ROUTES.imRoot}`;
  const inboxPath = `/${basePath}${IM_ROUTES.inbox}`;
  const createPath = `/${basePath}${IM_ROUTES.createIncident}`;
  const createResponsePath = `/${basePath}${IM_ROUTES.createResponse}`;
  const complaintDetailsPath = `/${basePath}${IM_ROUTES.complaintDetails}/$incidentId/$tenantId`;

  const imIndexRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
    path: imRoot,
    beforeLoad: () => {
      throw redirect({ to: inboxPath });
    },
  });

  const inboxRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
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
    getParentRoute: () => employeeLayoutRoute,
    path: createPath,
    component: CreateIncidentPage,
  });

  const createIncidentResponseRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
    path: createResponsePath,
    component: CreateIncidentResponsePage,
  });

  const complaintDetailsRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
    path: complaintDetailsPath,
    component: ComplaintDetailsPage,
  });

  return {
    routes: [
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
