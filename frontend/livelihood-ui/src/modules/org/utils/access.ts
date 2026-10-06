import { ORG_USE_MOCK_API } from "../constants/config";

type Roles = Array<{ code?: string }> | undefined;

/** Super Admin — manages every Platform and Vendor Organisation. */
export const ORG_SUPER_ADMIN_ROLES = ["ORG_PLATFORM_ADMIN"] as const;

/**
 * Organisation POC / Vendor POC — manage users of their own organisation only.
 * `VENDOR_POC` is a new role code pending backend configuration.
 */
export const ORG_POC_ROLES = ["ORG_ADMIN", "VENDOR_POC"] as const;

function hasAnyRole(roles: Roles, allowed: readonly string[]): boolean {
  if (!roles?.length) {
    return false;
  }
  return roles.some((role) => role.code && allowed.includes(role.code));
}

export function hasOrgSuperAdminAccess(roles: Roles): boolean {
  // Mock mode: let any logged-in user exercise the screens before the roles exist.
  return ORG_USE_MOCK_API || hasAnyRole(roles, ORG_SUPER_ADMIN_ROLES);
}

export function hasOrgPocAccess(roles: Roles): boolean {
  return ORG_USE_MOCK_API || hasAnyRole(roles, ORG_POC_ROLES);
}

/** Nav-item role lists — `undefined` shows the item to everyone (mock mode only). */
export function superAdminNavRoles(): string[] | undefined {
  return ORG_USE_MOCK_API ? undefined : [...ORG_SUPER_ADMIN_ROLES];
}

export function pocNavRoles(): string[] | undefined {
  return ORG_USE_MOCK_API ? undefined : [...ORG_POC_ROLES];
}
