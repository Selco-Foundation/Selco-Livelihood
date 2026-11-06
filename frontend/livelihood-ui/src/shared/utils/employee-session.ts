import { searchHrmsEmployees } from "../api/hrms";
import type { AuthUser } from "../stores/auth-store";
import { buildJurisdictionBoundaries } from "./boundary-util";

export function filterRolesForEmployeeTenant(user: AuthUser, employeeTenantId: string): AuthUser {
  const roles = user.roles?.filter((role) => role.tenantId === employeeTenantId) ?? [];

  return {
    ...user,
    roles,
  };
}

export async function hydrateEmployeeJurisdictions(
  user: AuthUser,
  accessToken: string,
) {
  const employeeCode = user.userName;
  if (!employeeCode) {
    throw new Error("Could not find employee username");
  }

  const [hrmsUser] = await searchHrmsEmployees({ codes: employeeCode }, accessToken, user);
  if (!hrmsUser) {
    throw new Error("Could not find HRMS employee");
  }

  if (!hrmsUser.jurisdictions?.length) {
    throw new Error("Could not find HRMS employee jurisdictions");
  }

  const boundaries = buildJurisdictionBoundaries(hrmsUser.jurisdictions);

  return {
    hrmsUser,
    boundaries,
  };
}
