import { trackPageView } from "@/shared";
import { createRouter } from "@tanstack/react-router";
import { enabledModules, rootRoute } from "./modules";

export function createAppRouter() {
  const routes = enabledModules.flatMap((module) => module.routes);
  const routeTree = rootRoute.addChildren(routes);

  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
  });

  router.subscribe("onResolved", (event) => {
    trackPageView(event.toLocation.pathname, document.title);
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
