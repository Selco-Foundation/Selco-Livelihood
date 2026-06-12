import { createCoreModule } from "@/modules/core";
import type { ModuleDefinition } from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRootRoute, Outlet } from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: Outlet,
});

const enabledModules: ModuleDefinition<AnyRoute>[] = [createCoreModule(rootRoute)];

export { rootRoute, enabledModules };
