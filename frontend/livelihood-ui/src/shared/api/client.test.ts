import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import type { InternalAxiosRequestConfig } from "axios";

vi.mock("../stores/auth-store", () => ({
  useAuthStore: { getState: vi.fn() },
}));
vi.mock("../stores/jurisdiction-store", () => ({
  useJurisdictionStore: { getState: vi.fn() },
}));
vi.mock("../config/global-config", () => ({
  tenantId: vi.fn(),
}));
vi.mock("../env", () => ({
  getViteEnv: vi.fn(),
}));
vi.mock("../config/routes", () => ({
  employeeLoginPath: vi.fn(() => "/livelihood-ui/employee/user/login"),
}));

import { apiClient } from "./client";
import { useAuthStore } from "../stores/auth-store";
import { useJurisdictionStore } from "../stores/jurisdiction-store";
import { tenantId } from "../config/global-config";
import { getViteEnv } from "../env";

const requestInterceptor = apiClient.interceptors.request.handlers![0].fulfilled as (
  config: InternalAxiosRequestConfig,
) => InternalAxiosRequestConfig;
const responseFulfilled = apiClient.interceptors.response.handlers![0].fulfilled as (
  response: unknown,
) => unknown;
const responseRejected = apiClient.interceptors.response.handlers![0].rejected as (
  error: unknown,
) => Promise<never>;

function makeConfig(headers: Record<string, string> = {}): InternalAxiosRequestConfig {
  return { headers } as unknown as InternalAxiosRequestConfig;
}

describe("apiClient request interceptor", () => {
  beforeEach(() => {
    vi.mocked(useAuthStore.getState).mockReset();
    vi.mocked(tenantId).mockReset();
    vi.mocked(getViteEnv).mockReset();
  });

  it("adds a Bearer Authorization header when an access token is present", () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({
      accessToken: "tok-1",
      employeeTenantId: null,
    } as ReturnType<typeof useAuthStore.getState>);

    const config = makeConfig();
    const result = requestInterceptor(config);

    expect(result.headers.Authorization).toBe("Bearer tok-1");
  });

  it("does not add an Authorization header when there is no access token", () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({
      accessToken: null,
      employeeTenantId: null,
    } as ReturnType<typeof useAuthStore.getState>);

    const config = makeConfig();
    const result = requestInterceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it("uses the employee tenant id for X-Tenant-Id when present, without consulting the fallback", () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({
      accessToken: null,
      employeeTenantId: "tenant-emp",
    } as ReturnType<typeof useAuthStore.getState>);

    const config = makeConfig();
    const result = requestInterceptor(config);

    expect(result.headers["X-Tenant-Id"]).toBe("tenant-emp");
    expect(tenantId).not.toHaveBeenCalled();
  });

  it("falls back to tenantId(getViteEnv(...)) when there is no employee tenant id", () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({
      accessToken: null,
      employeeTenantId: null,
    } as ReturnType<typeof useAuthStore.getState>);
    vi.mocked(getViteEnv).mockReturnValue("env-tenant");
    vi.mocked(tenantId).mockReturnValue("fallback-tenant");

    const config = makeConfig();
    const result = requestInterceptor(config);

    expect(getViteEnv).toHaveBeenCalledWith("VITE_STATE_LEVEL_TENANT_ID");
    expect(tenantId).toHaveBeenCalledWith("env-tenant");
    expect(result.headers["X-Tenant-Id"]).toBe("fallback-tenant");
  });

  it("does not overwrite an X-Tenant-Id header already set on the config", () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({
      accessToken: null,
      employeeTenantId: "tenant-emp",
    } as ReturnType<typeof useAuthStore.getState>);

    const config = makeConfig({ "X-Tenant-Id": "already-set" });
    const result = requestInterceptor(config);

    expect(result.headers["X-Tenant-Id"]).toBe("already-set");
  });

  it("returns the same config object it was given", () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({
      accessToken: null,
      employeeTenantId: null,
    } as ReturnType<typeof useAuthStore.getState>);
    vi.mocked(tenantId).mockReturnValue("");
    vi.mocked(getViteEnv).mockReturnValue("");

    const config = makeConfig();
    const result = requestInterceptor(config);

    expect(result).toBe(config);
  });
});

describe("apiClient response interceptor", () => {
  const originalLocation = window.location;
  const clearSession = vi.fn();
  const clearJurisdiction = vi.fn();

  beforeEach(() => {
    clearSession.mockReset();
    clearJurisdiction.mockReset();
    vi.mocked(useAuthStore.getState).mockReturnValue({
      clearSession,
    } as unknown as ReturnType<typeof useAuthStore.getState>);
    vi.mocked(useJurisdictionStore.getState).mockReturnValue({
      clearJurisdiction,
    } as unknown as ReturnType<typeof useJurisdictionStore.getState>);

    // Replacing jsdom's Location with a plain, writable stub for assertions
    // (jsdom's real Location throws "Not implemented: navigation" on href assignment).
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: {
        pathname: "/livelihood-ui/employee/ir/activities",
        search: "",
        href: "",
      },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("passes a successful response through unchanged", () => {
    const response = { data: { ok: true } };
    expect(responseFulfilled(response)).toBe(response);
  });

  it("re-rejects with the original error and does not clear session for a non-token error", async () => {
    const error = { response: { data: { Errors: [{ message: "SomeOtherError" }] } } };

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(clearSession).not.toHaveBeenCalled();
    expect(clearJurisdiction).not.toHaveBeenCalled();
    expect(window.location.href).toBe("");
  });

  it("re-rejects a network error (no response at all) without clearing session", async () => {
    const error = new Error("Network Error");

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(clearSession).not.toHaveBeenCalled();
  });

  it("treats a non-array Errors field as not an invalid-access-token error", async () => {
    const error = { response: { data: { Errors: "not-an-array" } } };

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(clearSession).not.toHaveBeenCalled();
  });

  it("clears session/jurisdiction and redirects with a return path on InvalidAccessTokenException", async () => {
    window.location.pathname = "/livelihood-ui/employee/ir/activities";
    window.location.search = "?tab=pending";
    const error = {
      response: {
        data: { Errors: [{ message: "Auth failed: InvalidAccessTokenException" }] },
      },
    };

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(clearJurisdiction).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe(
      `/livelihood-ui/employee/user/login?from=${encodeURIComponent(
        "/livelihood-ui/employee/ir/activities?tab=pending",
      )}`,
    );
  });

  it("clears session but does not redirect again when already on the login page", async () => {
    window.location.pathname = "/livelihood-ui/employee/user/login";
    const error = {
      response: { data: { Errors: [{ message: "InvalidAccessTokenException" }] } },
    };

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(clearJurisdiction).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe("");
  });

  it("matches InvalidAccessTokenException among several error entries", async () => {
    const error = {
      response: {
        data: {
          Errors: [{ message: "SomeOtherError" }, { message: "boom InvalidAccessTokenException" }],
        },
      },
    };

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("does not throw when an error entry has no message", async () => {
    const error = { response: { data: { Errors: [{}] } } };

    await expect(responseRejected(error)).rejects.toBe(error);

    expect(clearSession).not.toHaveBeenCalled();
  });
});
