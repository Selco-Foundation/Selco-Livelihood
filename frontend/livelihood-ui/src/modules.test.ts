import { describe, expect, it } from "vitest";
import { IR_ROLES } from "@/modules/ir/utils/access";
import { getRegisteredModules } from "./module-registry";
import { enabledModules, getModuleNavItems, getModuleOverviews, rootRoute } from "./modules";

// modules.ts's own job (composition/wiring), not the route-building logic
// inside each module's createXModule/createXRoutes, which is covered by
// core/im/ir's own routes.test.tsx and index.test.ts files.
describe("enabledModules", () => {
  it("assembles core, pm, im, and ir modules, in that order", () => {
    expect(enabledModules.map((module) => module.id)).toEqual(["core", "pm", "im", "ir"]);
  });

  it("gives each module the order its own factory defines (core=0, pm=0, im=1, ir=2)", () => {
    expect(enabledModules.map((module) => module.order)).toEqual([0, 0, 1, 2]);
  });

  it("wires core's employeeLayoutRoute as the parent for pm's, im's, and ir's own parent route", () => {
    const pm = enabledModules.find((module) => module.id === "pm")!;
    const im = enabledModules.find((module) => module.id === "im")!;
    const ir = enabledModules.find((module) => module.id === "ir")!;

    for (const module of [pm, im, ir]) {
      expect((module.routes[0].options as { getParentRoute?: () => { options?: { id?: string } } })
        .getParentRoute?.().options?.id).toBe("employee-layout");
    }
  });

  it("attaches core's top-level routes directly to the shared rootRoute instance", () => {
    const core = enabledModules.find((module) => module.id === "core")!;
    // core.routes[0] is indexRoute and core.routes[5] is employeeLayoutRoute
    // (see createCoreRoutes's return order) — both parent directly off
    // rootRoute, unlike the employee-area routes nested under
    // employeeLayoutRoute.
    for (const route of [core.routes[0], core.routes[5]]) {
      const getParentRoute = (route.options as { getParentRoute?: () => unknown }).getParentRoute;
      expect(getParentRoute?.()).toBe(rootRoute);
    }
  });
});

describe("module registration", () => {
  it("registers enabledModules with module-registry as the single source of truth", () => {
    expect(getRegisteredModules()).toBe(enabledModules);
  });

  it("re-exports getModuleNavItems and getModuleOverviews backed by the registered modules", () => {
    expect(getModuleNavItems([{ code: IR_ROLES[0] }])).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "ir-installation-plans" })]),
    );
    expect(getModuleOverviews().kpis.map((entry) => entry.moduleId)).toEqual(
      expect.arrayContaining(["im", "ir"]),
    );
  });
});
