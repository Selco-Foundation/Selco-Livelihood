/**
 * Unit tests for the authentication state store (Zustand).
 *
 * Covers: useAuthStore state (accessToken, refreshToken, user, employeeTenantId, isAuthenticated)
 * and methods (setSession, setUser, clearSession).
 * Testing approach: Direct store state access and mutation via getState().method(...);
 * resets the persisted store via resetAuthStore() after each test.
 * No provider wrapper needed as this is a direct Zustand store access.
 */
import { afterEach, describe, expect, it } from "vitest";
import { resetAuthStore } from "@/test/mocks/auth";
import { useAuthStore } from "./auth-store";

afterEach(() => {
  resetAuthStore();
});

describe("useAuthStore", () => {
  it("starts unauthenticated", () => {
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    });
  });

  /**
   * setSession: Sets the authentication state atomically. Inputs: accessToken (required),
   * refreshToken (optional), user (optional), employeeTenantId (optional).
   * Derives employeeTenantId from user.tenantId if not explicitly given.
   */
  describe("setSession", () => {
    it("marks isAuthenticated true when an access token is provided", () => {
      useAuthStore.getState().setSession({ accessToken: "token-1" });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().accessToken).toBe("token-1");
    });

    it("derives employeeTenantId from the user's tenantId when not explicitly given", () => {
      useAuthStore.getState().setSession({
        accessToken: "token-1",
        user: { uuid: "u1", tenantId: "livelihood.sub" },
      });
      expect(useAuthStore.getState().employeeTenantId).toBe("livelihood.sub");
    });

    it("prefers an explicit employeeTenantId over the user's tenantId", () => {
      useAuthStore.getState().setSession({
        accessToken: "token-1",
        user: { uuid: "u1", tenantId: "livelihood.sub" },
        employeeTenantId: "livelihood.override",
      });
      expect(useAuthStore.getState().employeeTenantId).toBe("livelihood.override");
    });

    it("defaults employeeTenantId to null when neither is given", () => {
      useAuthStore.getState().setSession({ accessToken: "token-1" });
      expect(useAuthStore.getState().employeeTenantId).toBeNull();
    });

    it("defaults refreshToken/user to null when omitted", () => {
      useAuthStore.getState().setSession({ accessToken: "token-1" });
      expect(useAuthStore.getState().refreshToken).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  /**
   * setUser: Updates the user field only, leaving accessToken, refreshToken, etc. untouched.
   * Inputs: user (AuthUser object).
   */
  describe("setUser", () => {
    it("updates only the user field", () => {
      useAuthStore.getState().setSession({ accessToken: "token-1" });
      useAuthStore.getState().setUser({ uuid: "u2", name: "New Name" });
      expect(useAuthStore.getState().user).toEqual({ uuid: "u2", name: "New Name" });
      expect(useAuthStore.getState().accessToken).toBe("token-1");
    });
  });

  /**
   * clearSession: Resets all authentication state to initial (logged-out) values.
   * No inputs required.
   */
  describe("clearSession", () => {
    it("resets all session fields to their initial values", () => {
      useAuthStore.getState().setSession({
        accessToken: "token-1",
        refreshToken: "refresh-1",
        user: { uuid: "u1" },
        employeeTenantId: "livelihood",
      });
      useAuthStore.getState().clearSession();
      expect(useAuthStore.getState()).toMatchObject({
        accessToken: null,
        refreshToken: null,
        user: null,
        employeeTenantId: null,
        isAuthenticated: false,
      });
    });
  });
});
