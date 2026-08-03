/**
 * Unit tests for `createCoreRoutes` (src/modules/core/routes.tsx).
 *
 * `createCoreRoutes` builds the TanStack Router route tree for the employee
 * area: it wires up auth-gated redirects (`beforeLoad`) and search-param
 * coercion (`validateSearch`) for the index/context-root, login,
 * forgot-password, change-password, and authenticated-layout routes.
 *
 * Testing approach:
 * - We call `createCoreRoutes(rootRoute)` once against a real
 *   `createRootRoute()` and pull individual route objects out of the
 *   returned `routes` array. No React rendering or router navigation is
 *   involved — `beforeLoad`/`validateSearch` are plain functions on
 *   `route.options`, so they are invoked directly and their return
 *   values/thrown redirects are asserted against.
 * - The only external dependency that matters for these route guards is
 *   `useAuthStore` (via `@/shared`). Rather than mocking the store module,
 *   the tests use the real store through the `@/test/mocks/auth` helpers
 *   (`seedAuthenticatedSession` / `resetAuthStore`) to flip authentication
 *   state before each assertion, and reset it in `afterEach` so tests don't
 *   leak auth state into one another.
 * - TanStack Router's `beforeLoad` signals a redirect by *throwing* a
 *   `redirect()` object rather than returning one, so `captureRedirect`
 *   below wraps the call in try/catch and hands back the thrown value for
 *   inspection.
 */
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

// TanStack Router route guards signal navigation by *throwing* the object
// returned from `redirect(...)`, not by returning it. This helper invokes a
// `beforeLoad` (or similar) call, expects it to throw, and returns the
// thrown redirect descriptor so its `.options.to` / `.options.search` can be
// asserted on. If the guard does not redirect, the call falls through and we
// throw our own error so misuse of this helper fails loudly instead of
// silently passing.
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

// `indexRoute` (path "/") and `contextRootRoute` (path "/{basePath}") are
// unconditional landing routes: their `beforeLoad` always throws a redirect
// to the employee home, regardless of auth state, so there's nothing to
// stub — no auth seeding is needed for this describe block.
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

// The login route's `validateSearch` coerces the incoming search params to
// `LoginRouteSearch`, keeping only string values for `from`/`username`/
// `tenantId`/`facilityId` and defaulting anything else to `undefined`. Its
// `beforeLoad` redirects an already-authenticated user straight to the
// employee home so they can't land back on the login page.
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

    // `validateSearch` only accepts `string` values for each field (see
    // routes.tsx); a number or null must be coerced to `undefined` rather
    // than passed through as-is, so a non-string `from`/`username` is a
    // deliberate probe of that type guard.
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

// The forgot-password route has no `validateSearch` of its own; its
// `beforeLoad` only guards against an already-authenticated user visiting
// the page, redirecting them to the employee home. There's no
// "unauthenticated" business rule beyond "don't throw".
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

// The change-password route's `validateSearch` normalizes `mobileNumber` to
// a string whether it arrives as a string or a number (anything else
// becomes `undefined`). Its `beforeLoad` has two guards in sequence: an
// authenticated user is always bounced to the employee home first; only if
// unauthenticated does it then check whether `mobileNumber` was supplied,
// redirecting to forgot-password when it's missing (this page requires a
// mobile number carried over from that flow).
describe("employeeChangePasswordRoute", () => {
  describe("validateSearch", () => {
    it("coerces a string mobileNumber", () => {
      expect(
        employeeChangePasswordRoute.options.validateSearch!({ mobileNumber: "9999999999" }),
      ).toEqual({ mobileNumber: "9999999999" });
    });

    // `validateSearch` explicitly accepts `number` as well as `string` for
    // mobileNumber (see routes.tsx) and always outputs a string, so a raw
    // numeric input must come out `String(...)`-ified rather than dropped.
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
    // The auth check runs before the mobileNumber check, so an
    // authenticated visitor is redirected to the employee home regardless
    // of whether a mobileNumber is present — the mobileNumber requirement
    // only applies to unauthenticated visitors.
    it("redirects to employee home when already authenticated, even with a mobileNumber", () => {
      seedAuthenticatedSession();
      const redirected = captureRedirect(() =>
        (employeeChangePasswordRoute.options.beforeLoad as (ctx: unknown) => void)({
          search: { mobileNumber: "9999999999" },
        }),
      );
      expect(redirected.options.to).toBe("/livelihood-ui/employee");
    });

    // Without a mobileNumber (typically only reachable via the
    // forgot-password flow), an unauthenticated visitor is bounced to
    // forgot-password instead of being allowed onto the change-password
    // page.
    it("redirects to forgot-password when unauthenticated with no mobileNumber", () => {
      resetAuthStore();
      const redirected = captureRedirect(() =>
        (employeeChangePasswordRoute.options.beforeLoad as (ctx: unknown) => void)({
          search: { mobileNumber: undefined },
        }),
      );
      expect(redirected.options.to).toBe("/livelihood-ui/employee/user/forgot-password");
    });

    // Both guards must be satisfied to fall through cleanly: unauthenticated
    // AND a mobileNumber present is the only combination that lets this
    // route load without throwing a redirect.
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

// `employeeLayoutRoute` is the parent layout route for all authenticated
// employee pages (home, profile, etc.). Its `beforeLoad` is the app's main
// auth gate: an unauthenticated visitor is redirected to the login route,
// carrying the current `location.href` through as the `from` search param
// so login can send them back afterward. An authenticated visitor falls
// through without redirecting so nested child routes can render.
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
