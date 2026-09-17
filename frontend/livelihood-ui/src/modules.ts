import { createCoreModule } from "@/modules/core";
import { createImModule } from "@/modules/im";
import { setRegisteredModules } from "./module-registry";
import type { ModuleDefinition } from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRootRoute, Outlet } from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: Outlet,
});

const core = createCoreModule(rootRoute);
const im = createImModule(rootRoute, core.employeeLayoutRoute);

const enabledModules: ModuleDefinition<AnyRoute>[] = [core, im];

setRegisteredModules(enabledModules);

export { rootRoute, enabledModules };
export { getModuleOverviews, getModuleNavItems } from "./module-registry";
