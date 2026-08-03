/**
 * Unit tests for the shared `apiClient` (src/shared/api/client.ts).
 *
 * `apiClient` is a shared axios instance with two interceptors:
 *  - a request interceptor that attaches `Authorization: Bearer <token>` (from
 *    the auth store) and an `X-Tenant-Id` header (from the employee tenant, or
 *    the state-level tenant fallback) to every outgoing request, without
 *    clobbering a caller-supplied `X-Tenant-Id`;
 *  - a response interceptor that, on an `InvalidAccessTokenException` error
 *    from the API, clears the auth and jurisdiction stores and redirects the
 *    browser to the employee login page (unless already there), while still
 *    rejecting the original error so callers can handle it too.
 *
 * Mocking strategy: rather than mocking axios itself, we swap out
 * `apiClient.defaults.adapter` — the actual HTTP transport axios calls under
 * the hood — with a fake that either captures the outgoing request config
 * (to assert on headers the interceptor added) or synchronously rejects with
 * a shaped error (to drive the response interceptor's error-handling branch).
 * This exercises the real interceptor pipeline end-to-end while never making
 * a real network call. The auth/jurisdiction Zustand stores and
 * `window.location` are reset after every test so state never leaks between
 * cases.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { useAuthStore } from "../stores/auth-store";
import { useJurisdictionStore } from "../stores/jurisdiction-store";
import { apiClient } from "./client";

const originalAdapter = apiClient.defaults.adapter;
const originalLocation = window.location;

// Replaces the axios adapter with a fake that resolves with a 200 and
// captures the final request config, so tests can assert on the headers
// the request interceptor injected (Authorization / X-Tenant-Id).
function mockAdapterCapturing() {
  let capturedConfig: import("axios").InternalAxiosRequestConfig | undefined;
  apiClient.defaults.adapter = vi.fn(async (config) => {
    capturedConfig = config;
    return { data: {}, status: 200, statusText: "OK", headers: {}, config };
  }) as never;
  return () => capturedConfig!;
}

// Replaces the axios adapter with a fake that always throws an
// axios-error-shaped object (response.status + response.data.Errors), which
// is the shape isInvalidAccessTokenError() in client.ts inspects to decide
// whether to clear the session and redirect.
function mockAdapterRejecting(status: number, errors: Array<{ message: string }>) {
  apiClient.defaults.adapter = vi.fn(async () => {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw { response: { status, data: { Errors: errors } } };
  }) as never;
}

beforeEach(() => {
  resetAuthStore();
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
});

afterEach(() => {
  // Restore the real adapter and window.location, and clear auth state, so
  // no test's stubbed transport/session/navigation leaks into the next test.
  apiClient.defaults.adapter = originalAdapter;
  Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  resetAuthStore();
});

describe("request interceptor", () => {
  it("does not set an Authorization header when there is no access token", async () => {
    const getConfig = mockAdapterCapturing();
    await apiClient.get("/anything");
    expect(getConfig().headers.Authorization).toBeUndefined();
  });

  it("sets a Bearer Authorization header when an access token is present", async () => {
    seedAuthenticatedSession();
    const getConfig = mockAdapterCapturing();
    await apiClient.get("/anything");
    expect(getConfig().headers.Authorization).toBe("Bearer test-access-token");
  });

  it("sets X-Tenant-Id from the employee tenant when authenticated", async () => {
    seedAuthenticatedSession({ tenantId: "livelihood.sub" });
    const getConfig = mockAdapterCapturing();
    await apiClient.get("/anything");
    expect(getConfig().headers["X-Tenant-Id"]).toBe("livelihood.sub");
  });

  it("does not override an already-set X-Tenant-Id header", async () => {
    seedAuthenticatedSession({ tenantId: "livelihood.sub" });
    const getConfig = mockAdapterCapturing();
    await apiClient.get("/anything", { headers: { "X-Tenant-Id": "explicit-tenant" } });
    expect(getConfig().headers["X-Tenant-Id"]).toBe("explicit-tenant");
  });
});

describe("response interceptor", () => {
  it("passes through a successful response untouched", async () => {
    mockAdapterCapturing();
    const response = await apiClient.get("/anything");
    expect(response.status).toBe(200);
  });

  it("clears auth and jurisdiction state on an InvalidAccessTokenException error", async () => {
    seedAuthenticatedSession();
    useJurisdictionStore.getState().setJurisdictionData({
      boundaries: { state: ["S1"] },
      hrmsUser: { uuid: "hrms-1" } as never,
    });
    Object.defineProperty(window, "location", {
      value: { pathname: "/livelihood-ui/employee/im/inbox", search: "", href: "" },
      writable: true,
    });
    mockAdapterRejecting(401, [{ message: "InvalidAccessTokenException occurred" }]);

    await expect(apiClient.get("/anything")).rejects.toBeTruthy();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useJurisdictionStore.getState().boundaries).toBeNull();
  });

  it("redirects to the login page with a return path when not already on the login page", async () => {
    seedAuthenticatedSession();
    Object.defineProperty(window, "location", {
      value: { pathname: "/livelihood-ui/employee/im/inbox", search: "?foo=bar", href: "" },
      writable: true,
    });
    mockAdapterRejecting(401, [{ message: "InvalidAccessTokenException occurred" }]);

    await expect(apiClient.get("/anything")).rejects.toBeTruthy();

    expect(window.location.href).toContain("/employee/user/login?from=");
    expect(window.location.href).toContain(encodeURIComponent("/livelihood-ui/employee/im/inbox?foo=bar"));
  });

  it("does not redirect when already on the login page", async () => {
    seedAuthenticatedSession();
    Object.defineProperty(window, "location", {
      value: { pathname: "/livelihood-ui/employee/user/login", search: "", href: "" },
      writable: true,
    });
    mockAdapterRejecting(401, [{ message: "InvalidAccessTokenException occurred" }]);

    await expect(apiClient.get("/anything")).rejects.toBeTruthy();

    expect(window.location.href).toBe("");
  });

  it("does not clear session for an unrelated error", async () => {
    seedAuthenticatedSession();
    mockAdapterRejecting(500, [{ message: "SomeOtherException" }]);

    await expect(apiClient.get("/anything")).rejects.toBeTruthy();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("rejects the original error so callers can still handle it", async () => {
    mockAdapterRejecting(500, [{ message: "Boom" }]);
    await expect(apiClient.get("/anything")).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
