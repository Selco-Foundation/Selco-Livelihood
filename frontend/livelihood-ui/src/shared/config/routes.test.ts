/**
 * Unit tests for the employee route path builders in src/shared/config/routes.ts
 *
 * Covers:
 * - employeeHomePath(), employeeLoginPath(), employeeForgotPasswordPath(),
 *   employeeChangePasswordPath(), employeeProfilePath(), employeeProfileChangePasswordPath()
 * - Verification that paths respect the default context path ("livelihood-ui")
 * - Verification that paths respect a custom context path from global config
 *
 * Approach: Direct function calls with global config mocking via window.globalConfigs
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  employeeChangePasswordPath,
  employeeForgotPasswordPath,
  employeeHomePath,
  employeeLoginPath,
  employeeProfileChangePasswordPath,
  employeeProfilePath,
} from "./routes";

afterEach(() => {
  window.globalConfigs = { getConfig: () => undefined };
});

describe("employee path builders", () => {
  /**
   * These functions build navigation paths by joining a dynamic context path
   * (from global config or defaulting to "livelihood-ui") with hard-coded route segments.
   * Tests verify both default and configured behaviors.
   */
  it("build paths under the default livelihood-ui context path", () => {
    expect(employeeHomePath()).toBe("/livelihood-ui/employee");
    expect(employeeLoginPath()).toBe("/livelihood-ui/employee/user/login");
    expect(employeeForgotPasswordPath()).toBe("/livelihood-ui/employee/user/forgot-password");
    expect(employeeChangePasswordPath()).toBe("/livelihood-ui/employee/user/change-password");
    expect(employeeProfilePath()).toBe("/livelihood-ui/employee/profile");
    expect(employeeProfileChangePasswordPath()).toBe(
      "/livelihood-ui/employee/profile/change-password",
    );
  });

  it("reflect a configured context path", () => {
    window.globalConfigs = {
      getConfig: (key) => (key === "CONTEXT_PATH" ? "custom-ctx" : undefined),
    };
    expect(employeeHomePath()).toBe("/custom-ctx/employee");
    expect(employeeLoginPath()).toBe("/custom-ctx/employee/user/login");
  });
});
