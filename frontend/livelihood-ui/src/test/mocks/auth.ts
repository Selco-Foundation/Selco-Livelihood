import { useAuthStore, type AuthUser } from "@/shared";

export function buildAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    uuid: "user-uuid-1",
    name: "Test User",
    userName: "test.user",
    tenantId: "livelihood",
    roles: [{ code: "EMPLOYEE", name: "Employee", tenantId: "livelihood" }],
    ...overrides,
  };
}

const initialAuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  employeeTenantId: null,
  isAuthenticated: false,
};

export function resetAuthStore() {
  // Shallow merge, not `replace: true` — replacing would also wipe the
  // store's action functions (setSession/setUser/clearSession) since
  // initialAuthState doesn't include them.
  useAuthStore.setState(initialAuthState);
}

export function seedAuthenticatedSession(userOverrides: Partial<AuthUser> = {}) {
  const user = buildAuthUser(userOverrides);
  useAuthStore.getState().setSession({
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    user,
    employeeTenantId: user.tenantId,
  });
  return user;
}
