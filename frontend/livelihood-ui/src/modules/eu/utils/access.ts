export const EU_ROLES = ["END_USER_ADMIN", "ORG_PLATFORM_ADMIN"] as const;

export function hasEuAccess(roles: Array<{ code?: string }> | undefined): boolean {
  if (!roles?.length) {
    return false;
  }
  return roles.some(
    (role) => role.code && EU_ROLES.includes(role.code as (typeof EU_ROLES)[number]),
  );
}
