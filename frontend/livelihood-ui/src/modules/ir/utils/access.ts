export const IR_ROLES = ["INSTALLATION_REPORT_APPROVER_QC_TEAM"] as const;

export function hasIrAccess(roles: Array<{ code?: string }> | undefined): boolean {
  if (!roles?.length) {
    return false;
  }
  return roles.some(
    (role) => role.code && IR_ROLES.includes(role.code as (typeof IR_ROLES)[number]),
  );
}
