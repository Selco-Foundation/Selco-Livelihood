const IM_ROLES = [
  "COMPLAINT_RESOLVER",
  "COMPLAINT_ASSESSOR",
  "COMPLAINANT",
  "COMPLAINT_CLOSER",
  "COMPLAINT",
  "COMPLAINT_FACILITATOR_1",
  "COMPLAINT_FACILITATOR_2",
  "VIEWER",
] as const;

export function hasRole(
  roles: Array<{ code?: string }> | undefined,
  code: string,
): boolean {
  return roles?.some((role) => role.code === code) ?? false;
}

export function hasImAccess(roles: Array<{ code?: string }> | undefined): boolean {
  if (!roles?.length) {
    return false;
  }
  return roles.some((role) => role.code && IM_ROLES.includes(role.code as (typeof IM_ROLES)[number]));
}

export function isNonHcrUser(roles: Array<{ code?: string }> | undefined): boolean {
  return roles?.some((role) => role.code !== "EMPLOYEE" && role.code !== "COMPLAINANT") ?? false;
}

export function isTechPocUser(roles: Array<{ code?: string }> | undefined): boolean {
  return hasRole(roles, "COMPLAINT_FACILITATOR_2");
}
