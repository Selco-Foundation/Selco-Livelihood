/**
 * Unit tests for src/modules/core/constants/routes.ts
 *
 * This file exports a single runtime value, `CORE_ROUTES` — a plain `as const`
 * object mapping route keys to their literal path strings. There are no
 * functions, no branches, and no conditional logic to exercise; the only
 * meaningful regression risk is the path strings themselves silently drifting
 * (e.g. a typo, a trailing slash, or a key being renamed/removed) since these
 * strings are string-concatenated directly into route paths in
 * src/modules/core/routes.tsx (e.g. `` `/${basePath}${CORE_ROUTES.employeeLogin}` ``)
 * and consumed by other modules via src/modules/core/index.ts. A change here
 * would not be caught by TypeScript (the literal values are still valid
 * strings) but would break real navigation/login/profile routes at runtime.
 *
 * Testing approach: no mocking, no provider wrapper, and no rendering is
 * needed — the module is imported directly and its exported object is
 * asserted against exact expected values and shape. This keeps the test a
 * genuine regression check on the literal contents rather than a placeholder.
 */
import { describe, expect, it } from "vitest";
import { CORE_ROUTES } from "./routes";

// CORE_ROUTES is the full set of employee-facing route path fragments used
// throughout src/modules/core/routes.tsx to build the app's absolute routes
// (each is concatenated onto a runtime-configured basePath). It expects no
// input — it is a static, frozen-by-convention (`as const`) object.
describe("CORE_ROUTES", () => {
  it("exposes the exact route path strings expected by src/modules/core/routes.tsx", () => {
    // Asserting the full object in one go (rather than key-by-key) catches
    // both value drift on existing keys and accidental addition/removal of
    // keys in a single assertion.
    expect(CORE_ROUTES).toEqual({
      employeeHome: "/employee",
      employeeLogin: "/employee/user/login",
      employeeForgotPassword: "/employee/user/forgot-password",
      employeeChangePassword: "/employee/user/change-password",
      employeeProfile: "/employee/profile",
      employeeProfileChangePassword: "/employee/profile/change-password",
    });
  });

  it("exposes exactly the six documented route keys, no more and no fewer", () => {
    // Guards against a key being silently renamed or an extra key being
    // added without an accompanying update to this test / the consumers.
    expect(Object.keys(CORE_ROUTES).sort()).toEqual(
      [
        "employeeHome",
        "employeeLogin",
        "employeeForgotPassword",
        "employeeChangePassword",
        "employeeProfile",
        "employeeProfileChangePassword",
      ].sort(),
    );
  });

  it("nests every sub-route under the employeeHome root path", () => {
    // Business rule: employeeHome ("/employee") is the root all other
    // employee routes hang off of. If a future edit accidentally detaches a
    // route from this root (e.g. drops the "/employee" prefix), navigation
    // built from `basePath + CORE_ROUTES.x` in routes.tsx would silently
    // point outside the employee section of the app.
    const { employeeHome, ...rest } = CORE_ROUTES;

    for (const path of Object.values(rest)) {
      expect(path.startsWith(`${employeeHome}/`)).toBe(true);
    }
  });

  it("does not have any trailing slashes on any route", () => {
    // A trailing slash would produce double slashes when concatenated as
    // `/${basePath}${CORE_ROUTES.x}` in routes.tsx.
    for (const path of Object.values(CORE_ROUTES)) {
      expect(path.endsWith("/")).toBe(false);
    }
  });
});
