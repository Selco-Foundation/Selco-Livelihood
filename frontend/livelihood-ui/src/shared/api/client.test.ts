import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { useAuthStore } from "../stores/auth-store";
import { useJurisdictionStore } from "../stores/jurisdiction-store";
import { apiClient } from "./client";

const originalAdapter = apiClient.defaults.adapter;
const originalLocation = window.location;

function mockAdapterCapturing() {
  let capturedConfig: import("axios").InternalAxiosRequestConfig | undefined;
  apiClient.defaults.adapter = vi.fn(async (config) => {
    capturedConfig = config;
    return { data: {}, status: 200, statusText: "OK", headers: {}, config };
  }) as never;
  return () => capturedConfig!;
}

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
