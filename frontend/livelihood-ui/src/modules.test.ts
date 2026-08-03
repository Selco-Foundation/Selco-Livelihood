/**
 * Unit tests for src/modules.ts.
 *
 * modules.ts is the app's module-registration entry point. At import time it:
 *   1. Builds a single shared `rootRoute` (via createRootRoute).
 *   2. Builds the "core" module on top of `rootRoute` (createCoreModule),
 *      which exposes its authenticated `employeeLayoutRoute`.
 *   3. Builds the "im" module (createImModule), chaining its routes under
 *      *core's* `employeeLayoutRoute` rather than the bare `rootRoute` -- this
 *      is what makes IM pages require an authenticated employee shell.
 *   4. Collects `[core, im]` into `enabledModules` and calls
 *      `setRegisteredModules(enabledModules)` as a side effect, so the
 *      module-registry singleton reflects these two modules for the rest of
 *      the app (nav bar, module overview grid, etc.) without any further
 *      wiring code.
 *   5. Re-exports `getModuleOverviews`/`getModuleNavItems` from
 *      module-registry.ts as a convenience surface.
 *
 * These tests target modules.ts's OWN wiring, not logic that belongs to its
 * collaborators:
 *   - createCoreRoutes/createImRoutes' internal route behavior (redirects,
 *     validateSearch, auth guards) is already covered by
 *     modules/core/routes.test.ts and modules/im/routes.test.ts.
 *   - getModuleNavItems/getModuleOverviews' own sorting/filtering logic is
 *     already covered by module-registry.test.ts.
 * What's unique to modules.ts and exercised here: the exact module
 * list/shape that gets built (ids, order, nav item counts, overview
 * presence), that im's routes are actually parented under core's
 * employeeLayoutRoute (proving the right argument was threaded through),
 * and that the built list is the one actually registered with the registry.
 *
 * No provider wrapper, router harness, or i18n instance is used here:
 * nothing from this module is ever rendered (ImOverview and the route
 * `component`s are referenced only as values, never invoked), so there is
 * nothing that needs a React tree, translations, or a live router. The file
 * is imported directly for its real, non-mocked side effects and exports.
 */
import type { AnyRoute } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { ImOverview } from "@/modules/im";
import { getRegisteredModules } from "./module-registry";
import { enabledModules, getModuleNavItems, getModuleOverviews, rootRoute } from "./modules";

// createCoreModule/createImModule return objects typed as ModuleDefinition,
// which doesn't declare `employeeLayoutRoute` -- but core's actual object
// (enabledModules[0]) still carries it at runtime. Read it via a narrow cast
// so the wiring test below can assert im's parent route matches it exactly.
const coreModule = enabledModules[0] as unknown as { employeeLayoutRoute: AnyRoute };

function getParentRoute(route: AnyRoute): unknown {
  return (route.options as { getParentRoute: () => unknown }).getParentRoute();
}

describe("enabledModules", () => {
  it("registers exactly the core and im modules, in core-then-im order", () => {
    expect(enabledModules.map((module) => module.id)).toEqual(["core", "im"]);
    expect(enabledModules.map((module) => module.order)).toEqual([0, 1]);
  });

  // core's routes.tsx returns navItems: [] (no top-level nav entry for core);
  // im's routes.tsx returns a single "Inbox" nav item. modules.ts must carry
  // both through into enabledModules unchanged.
  it("carries through each module's own nav item count", () => {
    expect(enabledModules[0].navItems).toEqual([]);
    expect(enabledModules[1].navItems).toHaveLength(1);
    expect(enabledModules[1].navItems[0]).toMatchObject({ id: "im-inbox", label: "Inbox" });
  });

  // Only im's module definition sets `overview: ImOverview`; core's does not
  // define one at all.
  it("only gives the im module an overview component", () => {
    expect(enabledModules[0].overview).toBeUndefined();
    expect(enabledModules[1].overview).toBe(ImOverview);
  });

  // core/routes.tsx and im/routes.tsx each return a fixed-length routes
  // array (9 and 5 entries respectively); modules.ts must pass those arrays
  // through as-is rather than dropping or duplicating entries.
  it("carries through each module's full routes array", () => {
    expect(enabledModules[0].routes).toHaveLength(9);
    expect(enabledModules[1].routes).toHaveLength(5);
  });

  it("parents core's routes under the shared rootRoute", () => {
    // enabledModules[0].routes[0] is core's indexRoute (see routes.tsx array
    // order); its getParentRoute must resolve to the exact rootRoute created
    // and exported by modules.ts, not a copy.
    expect(getParentRoute(enabledModules[0].routes[0])).toBe(rootRoute);
  });

  it("parents im's routes under core's employeeLayoutRoute, not the bare rootRoute", () => {
    // enabledModules[1].routes[0] is im's imParentRoute (see im/routes.tsx
    // array order). modules.ts calls
    // `createImModule(rootRoute, core.employeeLayoutRoute)`, so im's parent
    // route must be core's authenticated employeeLayoutRoute -- confirming
    // IM pages sit behind the same auth guard as the rest of the employee
    // shell -- and specifically must NOT be the plain rootRoute.
    const imParent = getParentRoute(enabledModules[1].routes[0]);
    expect(imParent).toBe(coreModule.employeeLayoutRoute);
    expect(imParent).not.toBe(rootRoute);
  });
});

// setRegisteredModules(enabledModules) runs once, at modules.ts import time,
// as a side effect -- there is no exported "register" function to call
// explicitly, so this only verifies the registry singleton actually picked
// up that call.
describe("module registration side effect", () => {
  it("registers enabledModules with the module registry", () => {
    expect(getRegisteredModules()).toBe(enabledModules);
  });
});

// getModuleNavItems (re-exported from module-registry.ts) sorts registered
// modules by `order` and flattens their navItems. With only core (order 0,
// no navItems) and im (order 1, one navItem) registered, the result should
// be exactly im's single nav item.
describe("getModuleNavItems", () => {
  it("returns only im's nav item, since core contributes none", () => {
    const navItems = getModuleNavItems();
    expect(navItems).toHaveLength(1);
    expect(navItems[0]).toMatchObject({ id: "im-inbox", to: expect.stringContaining("/im/inbox") });
  });
});

// getModuleOverviews (re-exported from module-registry.ts) filters registered
// modules down to those defining an `overview` component. Only im does.
describe("getModuleOverviews", () => {
  it("returns only the im module's overview entry", () => {
    expect(getModuleOverviews()).toEqual([{ Overview: ImOverview, moduleId: "im" }]);
  });
});
