// Temporary: LIVELIHOOD_POC is included alongside END_USER_ADMIN while the
// backend role addition is pending. Remove LIVELIHOOD_POC once END_USER_ADMIN
// is live server-side (tracked outside this module).
export const EU_ROLES = ["END_USER_ADMIN", "LIVELIHOOD_POC"] as const;

export function hasEuAccess(roles: Array<{ code?: string }> | undefined): boolean {
  if (!roles?.length) {
    return false;
  }
  return roles.some(
    (role) => role.code && EU_ROLES.includes(role.code as (typeof EU_ROLES)[number]),
  );
}
