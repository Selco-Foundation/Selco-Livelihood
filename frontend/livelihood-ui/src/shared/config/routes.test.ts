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
