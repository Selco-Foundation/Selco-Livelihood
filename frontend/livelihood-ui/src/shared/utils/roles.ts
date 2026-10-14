export interface RoleLike {
  code?: string;
}

export function hasRole(roles: RoleLike[] | undefined, code: string): boolean {
  return roles?.some((role) => role.code === code) ?? false;
}

export function hasAnyRole(roles: RoleLike[] | undefined, codes: string[]): boolean {
  return codes.some((code) => hasRole(roles, code));
}

export const PROJECT_MANAGER_ROLE = "PROJECT_MANAGER";

export function isProjectManager(roles: RoleLike[] | undefined): boolean {
  return hasRole(roles, PROJECT_MANAGER_ROLE);
}
