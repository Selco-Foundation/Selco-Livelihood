/**
 * Unit tests for src/modules/im/index.ts
 *
 * This file is a pure barrel: it re-exports `ImOverview` (from
 * ./components/ImOverview), `createImModule`/`createImRoutes` (from
 * ./routes), and `IM_ROUTES` (from ./constants/routes) without adding any
 * logic of its own. `ImOverview`'s rendering behavior is already covered by
 * ./components/ImOverview.test.tsx and `createImRoutes`'s route-building
 * behavior is already covered by ./routes.test.ts, so re-testing those
 * behaviors here would be redundant.
 *
 * What this file actually needs to verify:
 *  1. Every named export the barrel promises is genuinely re-exported (not
 *     silently dropped by a typo/rename in index.ts) and is a reference to
 *     the *same* underlying symbol as its source module -- a barrel that
 *     re-exports a wrong/stale binding would still type-check but would
 *     wire up the wrong component/function at runtime.
 *  2. `createImModule` itself -- unlike `createImRoutes`, it is not exercised
 *     by any other test file (src/modules.ts is its only other caller) -- so
 *     this is the first real test of its wiring: that it forwards
 *     `createImRoutes`'s `routes`/`navItems` through untouched and attaches
 *     `ImOverview` as the module's `overview`, alongside the static `id`
 *     and `order` fields consumed by src/module-registry.ts.
 *
 * Testing approach: no rendering, no React Testing Library, and no provider
 * wrapper are needed -- `createImModule`/`createImRoutes` are plain
 * synchronous functions operating on TanStack Router route objects, and
 * `IM_ROUTES` is a static constant. A bare `createRootRoute()` stands in for
 * both the app root route and the employee layout route parameters, mirroring
 * the pattern already used in ./routes.test.ts.
 */
import { createRootRoute } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import * as indexBarrel from "./index";
import { createImModule, createImRoutes, IM_ROUTES } from "./index";
import { ImOverview as OriginalImOverview } from "./components/ImOverview";
import { IM_ROUTES as OriginalImRoutes } from "./constants/routes";
import { createImModule as originalCreateImModule, createImRoutes as originalCreateImRoutes } from "./routes";

// The barrel's job is solely to re-export; every export it promises must be
// defined and must point at the exact same symbol as its source module.
describe("index.ts barrel exports", () => {
  it("re-exports ImOverview as the same reference as the source component", () => {
    expect(indexBarrel.ImOverview).toBeDefined();
    expect(indexBarrel.ImOverview).toBe(OriginalImOverview);
  });

  it("re-exports createImRoutes as the same reference as the source function", () => {
    expect(indexBarrel.createImRoutes).toBeDefined();
    expect(indexBarrel.createImRoutes).toBe(originalCreateImRoutes);
  });

  it("re-exports createImModule as the same reference as the source function", () => {
    expect(indexBarrel.createImModule).toBeDefined();
    expect(indexBarrel.createImModule).toBe(originalCreateImModule);
  });

  it("re-exports IM_ROUTES as the same reference as the source constant", () => {
    expect(indexBarrel.IM_ROUTES).toBeDefined();
    expect(indexBarrel.IM_ROUTES).toBe(OriginalImRoutes);
  });

  it("exposes exactly the four documented exports, no more and no fewer", () => {
    // Guards against a future export being silently added to routes.ts (or
    // elsewhere) without a deliberate decision to surface it through this
    // barrel, and against one of the four being accidentally dropped.
    expect(Object.keys(indexBarrel).sort()).toEqual(
      ["ImOverview", "createImModule", "createImRoutes", "IM_ROUTES"].sort(),
    );
  });
});

// createImModule(rootRoute, employeeLayoutRoute) builds the IM module's full
// registration object consumed by src/modules.ts / src/module-registry.ts. It
// internally calls createImRoutes(...) for `routes`/`navItems` and attaches
// static `id`/`order` plus `ImOverview` as `overview`. It expects a root
// route and an employee-layout route as its two parent-route parameters (a
// bare createRootRoute() satisfies both here, matching ./routes.test.ts).
describe("createImModule", () => {
  const rootRoute = createRootRoute();
  const moduleDefinition = createImModule(rootRoute, rootRoute);

  it("sets the static id and order fields the module registry keys off of", () => {
    expect(moduleDefinition.id).toBe("im");
    expect(moduleDefinition.order).toBe(1);
  });

  it("attaches ImOverview as the overview component", () => {
    // Business rule: the module registry (getModuleOverviews) renders
    // `overview` on the employee home/dashboard. Wiring the wrong component
    // (or omitting it) would silently break that page for the IM module.
    expect(moduleDefinition.overview).toBe(OriginalImOverview);
  });

  it("forwards the same route tree shape produced by createImRoutes", () => {
    // Each call to createImRoutes builds a fresh set of TanStack `Route`
    // instances (circular parent-route references, per-call closures for
    // beforeLoad/validateSearch), so two independently-created trees are
    // never referentially or deep-equal to each other even when they
    // describe the same routes -- comparing the two calls' identifying
    // options (id/path) is the meaningful, non-flaky check that
    // createImModule forwards createImRoutes's output untouched rather than
    // rebuilding or reordering it.
    const { routes } = createImRoutes(rootRoute, rootRoute);
    expect(moduleDefinition.routes).toHaveLength(routes.length);
    const describeRoute = (route: (typeof routes)[number]) => ({
      id: (route as { options: { id?: string; path?: string } }).options.id,
      path: (route as { options: { id?: string; path?: string } }).options.path,
    });
    expect(moduleDefinition.routes.map(describeRoute)).toEqual(routes.map(describeRoute));
  });

  it("forwards the exact navItems produced by createImRoutes", () => {
    const { navItems } = createImRoutes(rootRoute, rootRoute);
    expect(moduleDefinition.navItems).toEqual(navItems);
  });
});

// IM_ROUTES is a static, frozen-by-convention (`as const`) object mapping
// route keys to their literal path fragments; it takes no input. It is
// string-concatenated onto a runtime basePath throughout routes.tsx (e.g.
// `` `/${basePath}${IM_ROUTES.inbox}` ``), so a typo or dropped/renamed key
// here would not be caught by TypeScript but would break real navigation.
describe("IM_ROUTES", () => {
  it("exposes the exact route path strings routes.tsx depends on", () => {
    expect(IM_ROUTES).toEqual({
      imRoot: "/employee/im",
      inbox: "/employee/im/inbox",
      createIncident: "/employee/im/incident/create",
      complaintDetails: "/employee/im/complaint/details",
    });
  });

  it("nests every sub-route under the imRoot path", () => {
    const { imRoot, ...rest } = IM_ROUTES;
    for (const path of Object.values(rest)) {
      expect(path.startsWith(imRoot)).toBe(true);
    }
  });

  // Silence unused-import lint noise for destructured re-exports that are
  // only needed to prove the barrel forwards live bindings usable alongside
  // IM_ROUTES in the same import statement a real consumer would write.
  it("is usable alongside createImModule/createImRoutes imported from the same barrel", () => {
    expect(typeof createImModule).toBe("function");
    expect(typeof createImRoutes).toBe("function");
  });
});
