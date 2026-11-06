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

describe("employee route paths", () => {
  it("build each path from the default context path when unconfigured", () => {
    expect(employeeHomePath()).toBe("/livelihood-ui/employee");
    expect(employeeLoginPath()).toBe("/livelihood-ui/employee/user/login");
    expect(employeeForgotPasswordPath()).toBe("/livelihood-ui/employee/user/forgot-password");
    expect(employeeChangePasswordPath()).toBe("/livelihood-ui/employee/user/change-password");
    expect(employeeProfilePath()).toBe("/livelihood-ui/employee/profile");
    expect(employeeProfileChangePasswordPath()).toBe("/livelihood-ui/employee/profile/change-password");
  });

  it("pick up a configured CONTEXT_PATH", () => {
    window.globalConfigs = { getConfig: () => "custom-context" };

    expect(employeeHomePath()).toBe("/custom-context/employee");
    expect(employeeLoginPath()).toBe("/custom-context/employee/user/login");
  });
});
