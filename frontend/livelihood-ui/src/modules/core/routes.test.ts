import { createRootRoute } from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { createCoreRoutes } from "./routes";

const rootRoute = createRootRoute();
const { routes } = createCoreRoutes(rootRoute);

// createCoreRoutes returns routes in this fixed order (see routes.tsx); top-level
// `.id`/`.path` only resolve once a route is attached to a built tree via
// addChildren(), so tests read the literal config via `.options` and reference
// routes by their documented array position instead of by id/path lookup.
const [
  indexRoute,
  contextRootRoute,
  employeeLoginRoute,
  employeeForgotPasswordRoute,
  employeeChangePasswordRoute,
  employeeLayoutRoute,
] = routes;

function captureRedirect(fn: () => unknown): { options?: { to?: string; search?: unknown } } {
  try {
    fn();
    throw new Error("expected a redirect to be thrown");
  } catch (thrown) {
    return thrown as { options?: { to?: string; search?: unknown } };
  }
}

afterEach(() => {
  resetAuthStore();
});

describe("indexRoute / contextRootRoute", () => {
  it("both always redirect to the employee home", () => {
    const indexRedirect = captureRedirect(() => (indexRoute.options.beforeLoad as () => void)());
    const contextRedirect = captureRedirect(() =>
      (contextRootRoute.options.beforeLoad as () => void)(),
    );

    expect(indexRedirect.options.to).toBe("/livelihood-ui/employee");
    expect(contextRedirect.options.to).toBe("/livelihood-ui/employee");
  });
});

describe("employeeLoginRoute", () => {
  describe("validateSearch", () => {
    it("passes through valid string search params", () => {
      const result = employeeLoginRoute.options.validateSearch!({
        from: "/return/path",
        username: "user1",
        tenantId: "livelihood",
        facilityId: "fac-1",
      });
      expect(result).toEqual({
        from: "/return/path",
        username: "user1",
        tenantId: "livelihood",
        facilityId: "fac-1",
      });
    });

    it("defaults non-string values to undefined", () => {
      const result = employeeLoginRoute.options.validateSearch!({ from: 123, username: null });
      expect(result).toEqual({
        from: undefined,
        username: undefined,
        tenantId: undefined,
        facilityId: undefined,
      });
    });
  });

  describe("beforeLoad", () => {
    it("redirects to employee home when already authenticated", () => {
      seedAuthenticatedSession();
      const redirected = captureRedirect(() =>
        (employeeLoginRoute.options.beforeLoad as () => void)(),
      );
      expect(redirected.options.to).toBe("/livelihood-ui/employee");
    });

    it("does not redirect when unauthenticated", () => {
      resetAuthStore();
      expect(() => (employeeLoginRoute.options.beforeLoad as () => void)()).not.toThrow();
    });
  });
});

describe("employeeForgotPasswordRoute", () => {
  it("redirects to employee home when already authenticated", () => {
    seedAuthenticatedSession();
    const redirected = captureRedirect(() =>
      (employeeForgotPasswordRoute.options.beforeLoad as () => void)(),
    );
    expect(redirected.options.to).toBe("/livelihood-ui/employee");
  });

  it("does not redirect when unauthenticated", () => {
    resetAuthStore();
    expect(() =>
      (employeeForgotPasswordRoute.options.beforeLoad as () => void)(),
    ).not.toThrow();
  });
});

describe("employeeChangePasswordRoute", () => {
  describe("validateSearch", () => {
    it("coerces a string mobileNumber", () => {
      expect(
        employeeChangePasswordRoute.options.validateSearch!({ mobileNumber: "9999999999" }),
      ).toEqual({ mobileNumber: "9999999999" });
    });

    it("coerces a numeric mobileNumber to a string", () => {
      expect(
        employeeChangePasswordRoute.options.validateSearch!({ mobileNumber: 9999999999 }),
      ).toEqual({ mobileNumber: "9999999999" });
    });

    it("defaults to undefined when mobileNumber is missing", () => {
      expect(employeeChangePasswordRoute.options.validateSearch!({})).toEqual({
        mobileNumber: undefined,
      });
    });
  });

  describe("beforeLoad", () => {
    it("redirects to employee home when already authenticated, even with a mobileNumber", () => {
      seedAuthenticatedSession();
      const redirected = captureRedirect(() =>
        (employeeChangePasswordRoute.options.beforeLoad as (ctx: unknown) => void)({
          search: { mobileNumber: "9999999999" },
        }),
      );
      expect(redirected.options.to).toBe("/livelihood-ui/employee");
    });

    it("redirects to forgot-password when unauthenticated with no mobileNumber", () => {
      resetAuthStore();
      const redirected = captureRedirect(() =>
        (employeeChangePasswordRoute.options.beforeLoad as (ctx: unknown) => void)({
          search: { mobileNumber: undefined },
        }),
      );
      expect(redirected.options.to).toBe("/livelihood-ui/employee/user/forgot-password");
    });

    it("does not redirect when unauthenticated with a mobileNumber present", () => {
      resetAuthStore();
      expect(() =>
        (employeeChangePasswordRoute.options.beforeLoad as (ctx: unknown) => void)({
          search: { mobileNumber: "9999999999" },
        }),
      ).not.toThrow();
    });
  });
});

describe("employeeLayoutRoute", () => {
  it("redirects to login with a `from` search param when unauthenticated", () => {
    resetAuthStore();
    const redirected = captureRedirect(() =>
      (employeeLayoutRoute.options.beforeLoad as (ctx: unknown) => void)({
        location: { href: "/livelihood-ui/employee/im/inbox" },
      }),
    );
    expect(redirected.options.to).toBe("/livelihood-ui/employee/user/login");
    expect(redirected.options.search).toEqual({ from: "/livelihood-ui/employee/im/inbox" });
  });

  it("does not redirect when authenticated", () => {
    seedAuthenticatedSession();
    expect(() =>
      (employeeLayoutRoute.options.beforeLoad as (ctx: unknown) => void)({
        location: { href: "/livelihood-ui/employee/im/inbox" },
      }),
    ).not.toThrow();
  });
});
