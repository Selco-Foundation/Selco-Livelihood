import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../stores/auth-store";
import {
  fetchInstallationImageCriteriaQuery,
  installationImageCriteriaQueryKey,
  useInstallationImageCriteria,
} from "./use-installation-image-criteria";

vi.mock("../api/mdms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/mdms")>();
  return { ...actual, fetchMdmsMasters: vi.fn() };
});

vi.mock("../config/global-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/global-config")>();
  return { ...actual, tenantId: vi.fn(() => "fallback-tenant") };
});

import { fetchMdmsMasters } from "../api/mdms";
import { tenantId } from "../config/global-config";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return wrapper;
}

const masters = {
  InstallationImages: [
    { InstallationImage: [{ code: "SITE_OVERVIEW", description: "Site overview photo" }] },
  ],
};

beforeEach(() => {
  vi.mocked(fetchMdmsMasters).mockReset();
  vi.mocked(tenantId).mockReset().mockReturnValue("fallback-tenant");
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
});

describe("installationImageCriteriaQueryKey", () => {
  it("keys by tenantId under the ir-installation-image-criteria namespace", () => {
    expect(installationImageCriteriaQueryKey("tenant-1")).toEqual([
      "ir-installation-image-criteria",
      "tenant-1",
    ]);
  });
});

describe("fetchInstallationImageCriteriaQuery", () => {
  it("fetches the InstallationImages master and maps it", async () => {
    vi.mocked(fetchMdmsMasters).mockResolvedValue(masters);

    const result = await fetchInstallationImageCriteriaQuery("tenant-1", "token-1", null)();

    expect(fetchMdmsMasters).toHaveBeenCalledWith(
      "tenant-1",
      "common-masters",
      ["InstallationImages"],
      "token-1",
      null,
    );
    expect(result).toEqual([{ code: "SITE_OVERVIEW", description: "Site overview photo" }]);
  });
});

describe("useInstallationImageCriteria", () => {
  it("fetches and maps the criteria when accessToken is present", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: null });
    vi.mocked(fetchMdmsMasters).mockResolvedValue(masters);
    const wrapper = createWrapper();

    const { result } = renderHook(() => useInstallationImageCriteria(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMdmsMasters).toHaveBeenCalledWith(
      "tenant-1",
      "common-masters",
      ["InstallationImages"],
      "token-1",
      null,
    );
    expect(result.current.data).toEqual([{ code: "SITE_OVERVIEW", description: "Site overview photo" }]);
  });

  it("falls back to the shared tenantId() when employeeTenantId is missing", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: null, user: null });
    vi.mocked(fetchMdmsMasters).mockResolvedValue({});
    const wrapper = createWrapper();

    renderHook(() => useInstallationImageCriteria(), { wrapper });

    await waitFor(() =>
      expect(fetchMdmsMasters).toHaveBeenCalledWith(
        "fallback-tenant",
        "common-masters",
        ["InstallationImages"],
        "token-1",
        null,
      ),
    );
  });

  it("never calls fetchMdmsMasters when there is no accessToken", async () => {
    useAuthStore.setState({ accessToken: null, employeeTenantId: "tenant-1", user: null });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useInstallationImageCriteria(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMdmsMasters).not.toHaveBeenCalled();
  });
});
