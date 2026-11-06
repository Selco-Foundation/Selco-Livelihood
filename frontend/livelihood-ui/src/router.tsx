import { employeeHomePath } from "@/shared";
import { createRouter, Navigate } from "@tanstack/react-router";
import { enabledModules, rootRoute } from "./modules";

/** Fires whenever no route in the tree matches the current path — sends the user back to Overview. */
function NotFoundRedirect() {
  return <Navigate to={employeeHomePath()} replace />;
}

export function createAppRouter() {
  const routes = enabledModules.flatMap((module) => module.routes);
  const routeTree = rootRoute.addChildren(routes);

  return createRouter({
    routeTree,
    defaultPreload: "intent",
    defaultNotFoundComponent: NotFoundRedirect,
    // "fuzzy" (the default) renders the not-found boundary of the deepest
    // matched *layout* ancestor — for a path like `/eu/<garbage>` that's the
    // `eu` module's own pathless wrapper route, whose sibling index route
    // then runs its own beforeLoad redirect (to the facilities list) instead
    // of ever reaching this component. "root" always resolves to the app
    // root's boundary, so every unmatched path lands here regardless of
    // which module's routes it happens to resemble.
    notFoundMode: "root",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
