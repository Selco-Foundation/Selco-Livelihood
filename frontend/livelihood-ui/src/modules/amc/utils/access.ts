export const AMC_REVIEWER_ROLES = ["AMC_REVIEWER"] as const;

export function hasAmcReviewerAccess(roles: Array<{ code?: string }> | undefined): boolean {
  if (!roles?.length) {
    return false;
  }
  return roles.some(
    (role) => role.code && AMC_REVIEWER_ROLES.includes(role.code as (typeof AMC_REVIEWER_ROLES)[number]),
  );
}
