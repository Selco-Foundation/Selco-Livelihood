import { contextPath } from "./global-config";

export function employeeHomePath(): string {
  return `/${contextPath()}/employee`;
}

export function employeeLoginPath(): string {
  return `/${contextPath()}/employee/user/login`;
}
