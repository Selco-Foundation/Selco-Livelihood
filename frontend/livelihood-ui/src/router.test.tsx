/**
 * Unit tests for src/router.tsx.
 *
 * `createAppRouter()` is a thin factory: it flattens the `routes` array off
 * every module in `enabledModules` (currently the `core` and `im` modules
 * exported from ./modules), attaches them to the shared `rootRoute` via
 * `rootRoute.addChildren(routes)`, and hands the resulting route tree to
 * TanStack Router's `createRouter` with `defaultPreload: "intent"`. There is
 * no JSX to render and no conditional branching in the function body, so the
 * only real behavior to verify is that the *composed* route tree actually
 * contains every route each module contributes, correctly nested under their
 * real parent routes (core routes flat under root; IM routes nested under
 * both the authenticated `employee-layout` route and the `im-module`
 * translation-gating route) -- i.e. that `addChildren`/`createRouter` wired
 * the module route arrays together the way `./modules` intends.
 *
 * Testing approach: no rendering and no RouterProvider wrapper -- per the
 * task hint, `createAppRouter()` only needs to be called and its returned
 * router instance inspected. TanStack Router resolves `routesById` /
 * `routesByPath` synchronously inside `createRouter` (via `Router.update` ->
 * `buildRouteTree` at construction time), so these maps are available
 * immediately with no need to mount anything or await navigation. Nothing is
 * mocked: `./modules` builds real route objects from the real core/im
 * modules, and asserting against that real, fully-wired tree is the point of
 * this test (a mocked module list would only prove the mock was flattened
 * correctly, not that the real app's routes end up reachable). The single
 * piece of ambient state the route paths depend on -- `contextPath()` --
 * falls back to the literal `"livelihood-ui"` whenever `window.globalConfigs`
 * doesn't provide a `CONTEXT_PATH` override, which is exactly the default
 * `src/test/setup.ts` installs, so no per-test config stubbing is needed.
 */
import { describe, expect, it } from "vitest";
import { createAppRouter } from "./router";

describe("createAppRouter", () => {
  // createAppRouter() builds a brand-new Router instance every call (it does
  // not memoize/cache one), even though it's wired from the same module-level
  // rootRoute/enabledModules singletons each time. Distinct instances that
  // still resolve to an identical route set confirms the factory is a pure
  // rebuild, not a stateful singleton accessor.
  it("returns a new router instance on every call, each with the same route tree", () => {
    const first = createAppRouter();
    const second = createAppRouter();

    expect(first).not.toBe(second);
    expect(Object.keys(first.routesByPath).sort()).toEqual(
      Object.keys(second.routesByPath).sort(),
    );
  });

  it("enables intent-based preloading, per the defaultPreload option passed to createRouter", () => {
    const router = createAppRouter();

    expect(router.options.defaultPreload).toBe("intent");
  });

  // Core module routes (see src/modules/core/routes.tsx) are attached
  // directly to rootRoute -- none of them sit behind the authenticated
  // employee-layout route -- so their resolved paths should appear verbatim,
  // prefixed only by the "/livelihood-ui" context path fallback.
  describe("core module routes", () => {
    it("includes the index and context-root redirect routes, plus the public employee auth routes", () => {
      const router = createAppRouter();

      expect(Object.keys(router.routesByPath)).toEqual(
        expect.arrayContaining([
          "/",
          "/livelihood-ui",
          "/livelihood-ui/employee/user/login",
          "/livelihood-ui/employee/user/forgot-password",
          "/livelihood-ui/employee/user/change-password",
        ]),
      );
    });

    it("nests the authenticated employee home/profile routes under the employee-layout route id", () => {
      const router = createAppRouter();

      // employeeLayoutRoute has no `path` of its own (only an explicit
      // `id: "employee-layout"`), so it never shows up in routesByPath -- but
      // its children's *ids* are still prefixed with it, proving they were
      // attached as descendants of the auth-gating layout route rather than
      // directly under root.
      expect(router.routesById["/employee-layout"]).toBeDefined();
      expect(Object.keys(router.routesById)).toEqual(
        expect.arrayContaining([
          "/employee-layout/livelihood-ui/employee",
          "/employee-layout/livelihood-ui/employee/profile",
          "/employee-layout/livelihood-ui/employee/profile/change-password",
        ]),
      );
      // And their resolved paths (routesByPath, which reflects the actual
      // full URL rather than the id chain) are the plain employee paths,
      // since employee-layout contributes no path segment of its own.
      expect(Object.keys(router.routesByPath)).toEqual(
        expect.arrayContaining([
          "/livelihood-ui/employee",
          "/livelihood-ui/employee/profile",
          "/livelihood-ui/employee/profile/change-password",
        ]),
      );
    });
  });

  // IM module routes (see src/modules/im/routes.tsx) are doubly nested: first
  // under employee-layout (auth gate), then under the pathless im-module
  // route (which blocks rendering until IM translations load). Both parent
  // ids should show up as prefixes in routesById, while routesByPath still
  // reflects only the real URL segments each route contributes.
  describe("im module routes", () => {
    it("nests every IM route under employee-layout/im-module in routesById", () => {
      const router = createAppRouter();

      expect(router.routesById["/employee-layout/im-module"]).toBeDefined();
      expect(Object.keys(router.routesById)).toEqual(
        expect.arrayContaining([
          "/employee-layout/im-module/livelihood-ui/employee/im",
          "/employee-layout/im-module/livelihood-ui/employee/im/inbox",
          "/employee-layout/im-module/livelihood-ui/employee/im/incident/create",
          "/employee-layout/im-module/livelihood-ui/employee/im/complaint/details/$incidentId/$tenantId",
        ]),
      );
    });

    it("resolves IM routes to their plain employee/im URLs, including the dynamic complaint-details params", () => {
      const router = createAppRouter();

      expect(Object.keys(router.routesByPath)).toEqual(
        expect.arrayContaining([
          "/livelihood-ui/employee/im",
          "/livelihood-ui/employee/im/inbox",
          "/livelihood-ui/employee/im/incident/create",
          "/livelihood-ui/employee/im/complaint/details/$incidentId/$tenantId",
        ]),
      );
    });
  });

  it("attaches the root route itself as __root__, the parent of every top-level route", () => {
    const router = createAppRouter();

    expect(router.routesById.__root__).toBeDefined();
  });
});
