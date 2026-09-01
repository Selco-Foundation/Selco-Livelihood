// Temporary: LIVELIHOOD_POC is included alongside INSTALLATION_REVIEWER while the
// backend role addition is pending. Remove LIVELIHOOD_POC once INSTALLATION_REVIEWER
// is live server-side (tracked outside this module).
export const IR_ROLES = ["INSTALLATION_REVIEWER", "LIVELIHOOD_POC"] as const;

export function hasIrAccess(roles: Array<{ code?: string }> | undefined): boolean {
  if (!roles?.length) {
    return false;
  }
  return roles.some(
    (role) => role.code && IR_ROLES.includes(role.code as (typeof IR_ROLES)[number]),
  );
}
