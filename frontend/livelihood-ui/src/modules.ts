import { createCoreModule } from "@/modules/core";
import { createEuModule } from "@/modules/eu";
import { createImModule } from "@/modules/im";
import { createIrModule } from "@/modules/ir";
import { createPmModule } from "@/modules/pm";
import { setRegisteredModules } from "./module-registry";
import type { ModuleDefinition } from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRootRoute, Outlet } from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: Outlet,
});

const core = createCoreModule(rootRoute);
const pm = createPmModule(rootRoute, core.employeeLayoutRoute);
const im = createImModule(rootRoute, core.employeeLayoutRoute);
const ir = createIrModule(rootRoute, core.employeeLayoutRoute);
const eu = createEuModule(rootRoute, core.employeeLayoutRoute);

const enabledModules: ModuleDefinition<AnyRoute>[] = [core, pm, im, ir, eu];

setRegisteredModules(enabledModules);

export { rootRoute, enabledModules };
export { getModuleOverviews, getModuleNavItems } from "./module-registry";
