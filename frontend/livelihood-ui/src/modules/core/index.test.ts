import { createRootRoute } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { AppShell as OriginalAppShell } from "./layout/AppShell";
import { HomePage as OriginalHomePage } from "./pages/employee/HomePage";
import { LoginPage as OriginalLoginPage } from "./pages/employee/LoginPage";
import { CORE_ROUTES as OriginalCoreRoutes } from "./constants/routes";
import { createCoreRoutes as originalCreateCoreRoutes } from "./routes";
import { AppShell, CORE_ROUTES, HomePage, LoginPage, createCoreModule, createCoreRoutes } from "./index";

// This is a pure barrel/re-export file — the only invariant worth checking is
// that it re-exports the same values (by reference, for functions/components)
// as their original modules, rather than re-testing behavior covered by the
// tests for routes.tsx and the individual page components directly.
describe("core module barrel exports", () => {
  it("re-exports AppShell from ./layout/AppShell", () => {
    expect(AppShell).toBeDefined();
    expect(AppShell).toBe(OriginalAppShell);
  });

  it("re-exports LoginPage and HomePage from ./pages/employee", () => {
    expect(LoginPage).toBeDefined();
    expect(LoginPage).toBe(OriginalLoginPage);
    expect(HomePage).toBeDefined();
    expect(HomePage).toBe(OriginalHomePage);
  });

  it("re-exports CORE_ROUTES from ./constants/routes", () => {
    expect(CORE_ROUTES).toBeDefined();
    expect(CORE_ROUTES).toBe(OriginalCoreRoutes);
  });

  it("re-exports createCoreRoutes from ./routes", () => {
    expect(createCoreRoutes).toBeDefined();
    expect(createCoreRoutes).toBe(originalCreateCoreRoutes);
  });
});

// createCoreModule itself is defined in index.ts (unlike ir/im, where the
// equivalent factory lives in and is re-exported from routes.tsx), so its
// delegation to createCoreRoutes is tested here rather than in routes.test.tsx.
describe("createCoreModule", () => {
  const rootRoute = createRootRoute();
  const { routes, navItems, employeeLayoutRoute } = createCoreRoutes(rootRoute);
  const coreModule = createCoreModule(rootRoute);

  it("returns the core module id and order 0 (shell module, loads first)", () => {
    expect(coreModule.id).toBe("core");
    expect(coreModule.order).toBe(0);
  });

  it("has no overview slots and an empty navItems list, by design — core owns the shell, not a feature surface", () => {
    expect(coreModule.overview).toBeUndefined();
    expect(coreModule.navItems).toEqual([]);
  });

  it("delegates routes and employeeLayoutRoute to createCoreRoutes", () => {
    // Each createCoreRoutes() call builds fresh Route instances, so these are
    // compared structurally (by id) rather than by reference.
    expect(coreModule.routes).toHaveLength(routes.length);
    expect(coreModule.navItems).toEqual(navItems);
    expect((coreModule.employeeLayoutRoute.options as { id?: string }).id).toBe(
      (employeeLayoutRoute.options as { id?: string }).id,
    );
  });
});
