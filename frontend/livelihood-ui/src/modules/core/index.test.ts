/**
 * Unit tests for src/modules/core/index.ts
 *
 * This file is the "core" module's public barrel: it re-exports a handful of
 * components/values that live deeper in `src/modules/core/**` (AppShell,
 * LoginPage, LanguageSwitcher, HomePage, CORE_ROUTES, createCoreRoutes), and
 * it also *defines* one piece of real runtime logic locally —
 * `createCoreModule(rootRoute)` — which calls `createCoreRoutes(rootRoute)`
 * and repackages its result into the `ModuleDefinition` shape
 * (`{ id, order, routes, navItems, employeeLayoutRoute }`) that the app's
 * module registry expects from every feature module.
 *
 * Two things are exercised here:
 *  1. Every named re-export resolves to a defined value of the expected kind
 *     (React components are functions, `CORE_ROUTES` is the routes object,
 *     `createCoreRoutes` is a function) — guarding against a re-export being
 *     silently dropped or renamed.
 *  2. `createCoreModule`'s actual wiring behavior: that it stamps the fixed
 *     `id: "core"` / `order: 0` identity, forwards the caller's `rootRoute`
 *     down into the route tree unchanged, passes through the (currently
 *     always-empty) `navItems` from `createCoreRoutes`, and that the
 *     `employeeLayoutRoute` it returns at the top level is the *same*
 *     instance found inside `routes` (i.e. it isn't accidentally
 *     reconstructed or decoupled from the tree during repackaging).
 *
 * Testing approach: no mocking and no provider wrapper/rendering is needed.
 * `createCoreRoutes` (and by extension `createCoreModule`) only builds
 * TanStack Router route *config objects* — it doesn't render anything or
 * touch the network — so a bare `createRootRoute()` (the same helper used in
 * routes.test.ts) is enough to drive it directly and inspect the returned
 * object's shape and reference identity.
 */
import { createRootRoute } from "@tanstack/react-router";
import type { AnyRoute } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import {
  AppShell,
  CORE_ROUTES,
  HomePage,
  LanguageSwitcher,
  LoginPage,
  createCoreModule,
  createCoreRoutes,
} from "./index";

// The barrel's job is simply to forward these bindings unchanged from their
// source modules. There is no branching logic to exercise here, so the
// meaningful regression is a re-export silently disappearing (e.g. a typo'd
// path during a refactor) or resolving to `undefined`/the wrong kind of
// value, which TypeScript alone would not always catch for a plain named
// re-export.
describe("core module barrel re-exports", () => {
  it("re-exports every component as a defined function", () => {
    for (const Component of [AppShell, LoginPage, LanguageSwitcher, HomePage]) {
      expect(typeof Component).toBe("function");
    }
  });

  it("re-exports CORE_ROUTES as the routes constant object", () => {
    expect(CORE_ROUTES).toBeDefined();
    expect(typeof CORE_ROUTES).toBe("object");
    expect(CORE_ROUTES.employeeHome).toBe("/employee");
  });

  it("re-exports createCoreRoutes as a defined function", () => {
    expect(typeof createCoreRoutes).toBe("function");
  });
});

// createCoreModule(rootRoute) is defined directly in index.ts. It expects a
// TanStack Router `AnyRoute` to act as the parent of the whole core route
// tree, delegates the actual route-building to `createCoreRoutes`, and
// reshapes the result into the `ModuleDefinition` contract consumed by the
// app's module registry (see src/shared/modules/types.ts): a fixed `id`,
// an `order` used for nav/registration ordering, the flat `routes` array,
// `navItems` for the app shell's navigation, and `employeeLayoutRoute`
// (needed separately so other modules can nest their own routes under the
// authenticated employee layout).
describe("createCoreModule", () => {
  it("stamps the fixed core module identity", () => {
    const rootRoute = createRootRoute();

    const module = createCoreModule(rootRoute);

    expect(module.id).toBe("core");
    expect(module.order).toBe(0);
  });

  it("forwards the caller-provided rootRoute down into the built route tree", () => {
    // Business rule: createCoreModule must not build its own root or swap in
    // a different one — every top-level route it returns has to resolve its
    // parent back to the exact `rootRoute` instance the caller passed in,
    // otherwise the module could not be attached into the app's real route
    // tree by the module registry.
    const rootRoute = createRootRoute();

    const module = createCoreModule(rootRoute);
    const [indexRoute] = module.routes as AnyRoute[];

    expect(indexRoute.options.getParentRoute()).toBe(rootRoute);
  });

  it("passes through the (currently empty) navItems from createCoreRoutes", () => {
    const rootRoute = createRootRoute();

    const module = createCoreModule(rootRoute);

    expect(module.navItems).toEqual([]);
  });

  it("returns the full flat route array produced by createCoreRoutes", () => {
    const rootRoute = createRootRoute();

    const module = createCoreModule(rootRoute);

    // createCoreRoutes documents 9 routes in a fixed order (see
    // routes.tsx/routes.test.ts); createCoreModule must forward that array
    // untouched rather than filtering or re-ordering it.
    expect(module.routes).toHaveLength(9);
  });

  it("exposes employeeLayoutRoute as the same instance found inside routes", () => {
    // Guards against createCoreModule accidentally decoupling the top-level
    // `employeeLayoutRoute` field from the tree it repackages -- e.g. by
    // calling createCoreRoutes a second time (which would build a fresh,
    // reference-distinct route) instead of destructuring the single call's
    // result. Other modules rely on this being the literal parent route
    // object already wired into `routes` so their own routes nest correctly.
    const rootRoute = createRootRoute();

    const module = createCoreModule(rootRoute);
    const routesArray = module.routes as AnyRoute[];

    expect(routesArray).toContain(module.employeeLayoutRoute);
  });

  it("builds an independent route tree on each call (no shared/module-level state)", () => {
    // Two separate invocations for two separate root routes must not leak
    // route instances between each other -- each call to createCoreModule
    // should produce its own fresh set of route objects.
    const firstRoot = createRootRoute();
    const secondRoot = createRootRoute();

    const firstModule = createCoreModule(firstRoot);
    const secondModule = createCoreModule(secondRoot);

    expect(firstModule.employeeLayoutRoute).not.toBe(secondModule.employeeLayoutRoute);
    expect((firstModule.routes as AnyRoute[])[0].options.getParentRoute()).toBe(firstRoot);
    expect((secondModule.routes as AnyRoute[])[0].options.getParentRoute()).toBe(secondRoot);
  });
});
