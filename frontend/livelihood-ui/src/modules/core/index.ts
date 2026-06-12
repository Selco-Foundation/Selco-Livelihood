import type { ModuleDefinition } from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createCoreRoutes } from "./routes";

export { AppShell } from "./layout/AppShell";
export { LoginPage } from "./pages/employee/LoginPage";
export { ChangeCity } from "./components/ChangeCity";
export { HomePage } from "./pages/employee/HomePage";
export { CORE_ROUTES } from "./constants/routes";
export { createCoreRoutes };

export function createCoreModule(rootRoute: AnyRoute): ModuleDefinition<AnyRoute> {
  const { routes, navItems } = createCoreRoutes(rootRoute);

  return {
    id: "core",
    routes,
    navItems,
  };
}
