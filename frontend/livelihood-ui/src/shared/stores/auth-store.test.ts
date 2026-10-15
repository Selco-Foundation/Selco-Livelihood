import { afterEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "../query/query-client";
import { useAuthStore } from "./auth-store";

const initialState = useAuthStore.getState();

afterEach(() => {
  useAuthStore.setState(initialState, true);
  vi.restoreAllMocks();
});

describe("useAuthStore", () => {
  it("starts unauthenticated with no session data", () => {
    const state = useAuthStore.getState();

    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.employeeTenantId).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  describe("setSession", () => {
    it("sets accessToken, refreshToken, user, employeeTenantId and marks authenticated", () => {
      const user = { uuid: "u-1", name: "Jane Doe", tenantId: "pg" };

      useAuthStore.getState().setSession({
        accessToken: "token-123",
        refreshToken: "refresh-123",
        user,
        employeeTenantId: "pg.city",
      });

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe("token-123");
      expect(state.refreshToken).toBe("refresh-123");
      expect(state.user).toEqual(user);
      expect(state.employeeTenantId).toBe("pg.city");
      expect(state.isAuthenticated).toBe(true);
    });

    it("falls back employeeTenantId to user.tenantId when not explicitly passed", () => {
      useAuthStore.getState().setSession({
        accessToken: "token-123",
        user: { uuid: "u-1", tenantId: "pg.city" },
      });

      expect(useAuthStore.getState().employeeTenantId).toBe("pg.city");
    });

    it("defaults refreshToken, user and employeeTenantId to null when omitted", () => {
      useAuthStore.getState().setSession({ accessToken: "token-only" });

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe("token-only");
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.employeeTenantId).toBeNull();
      expect(state.isAuthenticated).toBe(true);
    });

    it("marks isAuthenticated false when accessToken is an empty string", () => {
      useAuthStore.getState().setSession({ accessToken: "" });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe("setUser", () => {
    it("replaces the user without touching other session fields", () => {
      useAuthStore.getState().setSession({ accessToken: "token-123", refreshToken: "refresh-123" });

      useAuthStore.getState().setUser({ uuid: "u-2", name: "New Name" });

      const state = useAuthStore.getState();
      expect(state.user).toEqual({ uuid: "u-2", name: "New Name" });
      expect(state.accessToken).toBe("token-123");
      expect(state.refreshToken).toBe("refresh-123");
    });
  });

  describe("clearSession", () => {
    it("resets accessToken, refreshToken, user, employeeTenantId and isAuthenticated atomically", () => {
      useAuthStore.getState().setSession({
        accessToken: "token-123",
        refreshToken: "refresh-123",
        user: { uuid: "u-1", tenantId: "pg" },
        employeeTenantId: "pg.city",
      });

      useAuthStore.getState().clearSession();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.employeeTenantId).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it("clears the shared query cache as part of logging out", () => {
      const clearSpy = vi.spyOn(queryClient, "clear");

      useAuthStore.getState().clearSession();

      expect(clearSpy).toHaveBeenCalledTimes(1);
    });
  });
});
