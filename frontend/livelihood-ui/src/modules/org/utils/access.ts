type Roles = Array<{ code?: string }> | undefined;

/** Super Admin — manages every Platform and Vendor Organisation. */
export const ORG_SUPER_ADMIN_ROLES = ["ORG_PLATFORM_ADMIN"] as const;

/**
 * Organisation POC / Vendor POC — manage users of their own organisation only.
 * Vendor POC is the existing `VENDOR_ADMIN` role (MDMS group "Vendor Admin",
 * the E4H "Vendor Administrator") — no separate VENDOR_POC code.
 */
export const ORG_POC_ROLES = ["ORG_ADMIN", "VENDOR_ADMIN"] as const;

function hasAnyRole(roles: Roles, allowed: readonly string[]): boolean {
  if (!roles?.length) {
    return false;
  }
  return roles.some((role) => role.code && allowed.includes(role.code));
}

export function hasOrgSuperAdminAccess(roles: Roles): boolean {
  return hasAnyRole(roles, ORG_SUPER_ADMIN_ROLES);
}

export function hasOrgPocAccess(roles: Roles): boolean {
  return hasAnyRole(roles, ORG_POC_ROLES);
}

/** Sidebar role lists — an item is shown only to users holding one of these roles. */
export function superAdminNavRoles(): string[] {
  return [...ORG_SUPER_ADMIN_ROLES];
}

export function pocNavRoles(): string[] {
  return [...ORG_POC_ROLES];
}
