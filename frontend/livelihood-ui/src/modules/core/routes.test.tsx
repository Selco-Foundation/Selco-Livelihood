import type { ComponentType } from "react";
import { createRootRoute } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CORE_ROUTES } from "./constants/routes";
import { ChangePasswordPage } from "./pages/employee/ChangePasswordPage";
import { ForgotPasswordPage } from "./pages/employee/ForgotPasswordPage";
import { HomePage } from "./pages/employee/HomePage";
import { LoginPage } from "./pages/employee/LoginPage";
import { ProfileChangePasswordPage } from "./pages/employee/ProfileChangePasswordPage";
import { ProfilePage } from "./pages/employee/ProfilePage";

// AppShell's own conditional logic (sidebar, nav, logout) is covered in
// layout/AppShell.test.tsx — here we only need to confirm the layout route
// renders it, so it's stubbed out.
vi.mock("./layout/AppShell", () => ({ AppShell: () => <div data-testid="app-shell-stub" /> }));

import { useAuthStore } from "@/shared";
import { createCoreRoutes } from "./routes";

const rootRoute = createRootRoute();
const { routes, navItems, employeeLayoutRoute } = createCoreRoutes(rootRoute);
const [
  indexRoute,
  contextRootRoute,
  employeeLoginRoute,
  employeeForgotPasswordRoute,
  employeeChangePasswordRoute,
  employeeLayoutRouteFromArray,
  employeeHomeRoute,
  employeeProfileRoute,
  employeeProfileChangePasswordRoute,
] = routes;

const basePath = "livelihood-ui";
const employeeHomePath = `/${basePath}${CORE_ROUTES.employeeHome}`;
const employeeLoginPath = `/${basePath}${CORE_ROUTES.employeeLogin}`;
const employeeForgotPasswordPath = `/${basePath}${CORE_ROUTES.employeeForgotPassword}`;
const employeeChangePasswordPath = `/${basePath}${CORE_ROUTES.employeeChangePassword}`;
const employeeProfilePath = `/${basePath}${CORE_ROUTES.employeeProfile}`;
const employeeProfileChangePasswordPath = `/${basePath}${CORE_ROUTES.employeeProfileChangePassword}`;

// The routes array's inferred element type is a union across all nine route
// variants, so TS won't narrow `.options.path` per-element without a cast.
function pathOf(route: (typeof routes)[number]): string | undefined {
  return (route.options as { path?: string }).path;
}

function captureRedirect(fn: () => unknown): { options?: { to?: string; search?: unknown } } {
  try {
    fn();
    throw new Error("expected a redirect to be thrown");
  } catch (thrown) {
    return thrown as { options?: { to?: string; search?: unknown } };
  }
}

beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    employeeTenantId: null,
    isAuthenticated: false,
  });
});

describe("createCoreRoutes", () => {
  it("builds every route's path from CORE_ROUTES", () => {
    expect(pathOf(indexRoute)).toBe("/");
    expect(pathOf(contextRootRoute)).toBe(`/${basePath}`);
    expect(pathOf(employeeLoginRoute)).toBe(employeeLoginPath);
    expect(pathOf(employeeForgotPasswordRoute)).toBe(employeeForgotPasswordPath);
    expect(pathOf(employeeChangePasswordRoute)).toBe(employeeChangePasswordPath);
    expect(pathOf(employeeHomeRoute)).toBe(employeeHomePath);
    expect(pathOf(employeeProfileRoute)).toBe(employeeProfilePath);
    expect(pathOf(employeeProfileChangePasswordRoute)).toBe(employeeProfileChangePasswordPath);
  });

  it("returns an empty navItems list and exposes employeeLayoutRoute — core owns the shell, not a nav surface, by design", () => {
    expect(navItems).toEqual([]);
    expect(employeeLayoutRoute).toBe(employeeLayoutRouteFromArray);
  });

  describe("indexRoute", () => {
    it("always redirects to the employee home path", () => {
      const redirected = captureRedirect(() => (indexRoute.options.beforeLoad as () => void)());
      expect(redirected.options?.to).toBe(employeeHomePath);
    });
  });

  describe("contextRootRoute", () => {
    it("always redirects to the employee home path", () => {
      const redirected = captureRedirect(() => (contextRootRoute.options.beforeLoad as () => void)());
      expect(redirected.options?.to).toBe(employeeHomePath);
    });
  });

  describe("employeeLoginRoute", () => {
    it("assigns LoginPage as its component", () => {
      expect(employeeLoginRoute.options.component).toBe(LoginPage);
    });

    it("parses known string search params and drops anything else", () => {
      const validateSearch = employeeLoginRoute.options.validateSearch as (
        search: Record<string, unknown>,
      ) => unknown;

      expect(
        validateSearch({ from: "/x", username: "bob", tenantId: "t1", facilityId: "f1", extra: "ignored" }),
      ).toEqual({ from: "/x", username: "bob", tenantId: "t1", facilityId: "f1" });
    });

    it("returns undefined for search params that are missing or not strings", () => {
      const validateSearch = employeeLoginRoute.options.validateSearch as (
        search: Record<string, unknown>,
      ) => unknown;

      expect(validateSearch({ tenantId: 123 })).toEqual({
        from: undefined,
        username: undefined,
        tenantId: undefined,
        facilityId: undefined,
      });
    });

    it("redirects to the employee home path when already authenticated", () => {
      useAuthStore.setState({ isAuthenticated: true });

      const redirected = captureRedirect(() =>
        (employeeLoginRoute.options.beforeLoad as () => void)(),
      );
      expect(redirected.options?.to).toBe(employeeHomePath);
    });

    it("does not redirect when not authenticated", () => {
      useAuthStore.setState({ isAuthenticated: false });

      expect(() => (employeeLoginRoute.options.beforeLoad as () => void)()).not.toThrow();
    });
  });

  describe("employeeForgotPasswordRoute", () => {
    it("assigns ForgotPasswordPage as its component", () => {
      expect(employeeForgotPasswordRoute.options.component).toBe(ForgotPasswordPage);
    });

    it("redirects to the employee home path when already authenticated", () => {
      useAuthStore.setState({ isAuthenticated: true });

      const redirected = captureRedirect(() =>
        (employeeForgotPasswordRoute.options.beforeLoad as () => void)(),
      );
      expect(redirected.options?.to).toBe(employeeHomePath);
    });

    it("does not redirect when not authenticated", () => {
      useAuthStore.setState({ isAuthenticated: false });

      expect(() => (employeeForgotPasswordRoute.options.beforeLoad as () => void)()).not.toThrow();
    });
  });

  describe("employeeChangePasswordRoute", () => {
    it("assigns ChangePasswordPage as its component", () => {
      expect(employeeChangePasswordRoute.options.component).toBe(ChangePasswordPage);
    });

    it("coerces a numeric mobileNumber search param to a string", () => {
      const validateSearch = employeeChangePasswordRoute.options.validateSearch as (
        search: Record<string, unknown>,
      ) => unknown;

      expect(validateSearch({ mobileNumber: 9876543210 })).toEqual({ mobileNumber: "9876543210" });
      expect(validateSearch({ mobileNumber: "9876543210" })).toEqual({ mobileNumber: "9876543210" });
    });

    it("returns undefined mobileNumber when it's missing or the wrong type", () => {
      const validateSearch = employeeChangePasswordRoute.options.validateSearch as (
        search: Record<string, unknown>,
      ) => unknown;

      expect(validateSearch({})).toEqual({ mobileNumber: undefined });
      expect(validateSearch({ mobileNumber: true })).toEqual({ mobileNumber: undefined });
    });

    it("redirects to the employee home path when already authenticated, regardless of search", () => {
      useAuthStore.setState({ isAuthenticated: true });
      const beforeLoad = employeeChangePasswordRoute.options.beforeLoad as (args: {
        search: { mobileNumber?: string };
      }) => void;

      const redirected = captureRedirect(() => beforeLoad({ search: { mobileNumber: "123" } }));
      expect(redirected.options?.to).toBe(employeeHomePath);
    });

    it("redirects to the forgot-password path when not authenticated and mobileNumber is missing", () => {
      useAuthStore.setState({ isAuthenticated: false });
      const beforeLoad = employeeChangePasswordRoute.options.beforeLoad as (args: {
        search: { mobileNumber?: string };
      }) => void;

      const redirected = captureRedirect(() => beforeLoad({ search: {} }));
      expect(redirected.options?.to).toBe(employeeForgotPasswordPath);
    });

    it("does not redirect when not authenticated and mobileNumber is present", () => {
      useAuthStore.setState({ isAuthenticated: false });
      const beforeLoad = employeeChangePasswordRoute.options.beforeLoad as (args: {
        search: { mobileNumber?: string };
      }) => void;

      expect(() => beforeLoad({ search: { mobileNumber: "9876543210" } })).not.toThrow();
    });
  });

  describe("employeeLayoutRoute", () => {
    it("redirects to the login path with the current location as `from` when not authenticated", () => {
      useAuthStore.setState({ isAuthenticated: false });
      const beforeLoad = employeeLayoutRoute.options.beforeLoad as (args: {
        location: { href: string };
      }) => void;

      const redirected = captureRedirect(() =>
        beforeLoad({ location: { href: `${employeeProfilePath}?x=1` } }),
      );
      expect(redirected.options?.to).toBe(employeeLoginPath);
      expect(redirected.options?.search).toEqual({ from: `${employeeProfilePath}?x=1` });
    });

    it("does not redirect when authenticated", () => {
      useAuthStore.setState({ isAuthenticated: true });
      const beforeLoad = employeeLayoutRoute.options.beforeLoad as (args: {
        location: { href: string };
      }) => void;

      expect(() => beforeLoad({ location: { href: employeeHomePath } })).not.toThrow();
    });

    it("renders AppShell as its component", () => {
      const LayoutComponent = employeeLayoutRoute.options.component as ComponentType;

      render(<LayoutComponent />);

      expect(screen.getByTestId("app-shell-stub")).toBeInTheDocument();
    });
  });

  describe("employeeHomeRoute", () => {
    it("assigns HomePage as its component", () => {
      expect(employeeHomeRoute.options.component).toBe(HomePage);
    });
  });

  describe("employeeProfileRoute", () => {
    it("assigns ProfilePage as its component", () => {
      expect(employeeProfileRoute.options.component).toBe(ProfilePage);
    });
  });

  describe("employeeProfileChangePasswordRoute", () => {
    it("assigns ProfileChangePasswordPage as its component", () => {
      expect(employeeProfileChangePasswordRoute.options.component).toBe(ProfileChangePasswordPage);
    });
  });
});
