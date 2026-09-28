import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useInstallationTypeOptions } from "./use-installation-type-options";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    fetchMdmsMasters: vi.fn(),
    tenantId: vi.fn(() => "fallback-tenant"),
    // Only ES_IR_COMPONENT_TYPE_MACHINE has a staged translation; every other
    // key comes back unresolved (i18next's own behavior: returns the key
    // itself), so translateOr falls back to the master's own `name`.
    useTranslate: () => ({
      t: (key: string) => (key === "ES_IR_COMPONENT_TYPE_MACHINE" ? "Machine (translated)" : key),
    }),
  };
});

import { fetchMdmsMasters, tenantId } from "@/shared";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return wrapper;
}

beforeEach(() => {
  vi.mocked(fetchMdmsMasters).mockReset();
  vi.mocked(tenantId).mockReset().mockReturnValue("fallback-tenant");
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
});

describe("useInstallationTypeOptions", () => {
  it("builds the ES_IR_COMPONENT_TYPE_<CODE> key per entry and uses the translation when staged", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: null });
    vi.mocked(fetchMdmsMasters).mockResolvedValue({
      InstallationTypes: [{ code: "MACHINE", name: "Machine" }],
    });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useInstallationTypeOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchMdmsMasters).toHaveBeenCalledWith("tenant-1", "Installation", ["InstallationTypes"], "token-1", null);
    expect(result.current.options).toEqual([{ code: "MACHINE", name: "Machine (translated)" }]);
  });

  it("falls back to the MDMS entry's own name when no translation is staged for a new code", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: null });
    vi.mocked(fetchMdmsMasters).mockResolvedValue({
      InstallationTypes: [{ code: "SOLAR_ROOFTOP", name: "Solar Rooftop" }],
    });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useInstallationTypeOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.options).toEqual([{ code: "SOLAR_ROOFTOP", name: "Solar Rooftop" }]);
  });

  it("falls back to the code itself when both the translation and the name are missing", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: null });
    vi.mocked(fetchMdmsMasters).mockResolvedValue({ InstallationTypes: [{ code: "UNNAMED" }] });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useInstallationTypeOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.options).toEqual([{ code: "UNNAMED", name: "UNNAMED" }]);
  });

  it("drops entries without a code", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: null });
    vi.mocked(fetchMdmsMasters).mockResolvedValue({
      InstallationTypes: [{ name: "No code here" }, { code: "MACHINE", name: "Machine" }],
    });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useInstallationTypeOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.options).toEqual([{ code: "MACHINE", name: "Machine (translated)" }]);
  });

  it("returns an empty options array when InstallationTypes is missing", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: null });
    vi.mocked(fetchMdmsMasters).mockResolvedValue({});
    const wrapper = createWrapper();

    const { result } = renderHook(() => useInstallationTypeOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.options).toEqual([]);
  });

  it("falls back to the shared tenantId() when employeeTenantId is missing", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: null, user: null });
    vi.mocked(fetchMdmsMasters).mockResolvedValue({});
    const wrapper = createWrapper();

    renderHook(() => useInstallationTypeOptions(), { wrapper });

    await waitFor(() =>
      expect(fetchMdmsMasters).toHaveBeenCalledWith(
        "fallback-tenant",
        "Installation",
        ["InstallationTypes"],
        "token-1",
        null,
      ),
    );
  });

  it("never calls fetchMdmsMasters when there is no accessToken", async () => {
    useAuthStore.setState({ accessToken: null, employeeTenantId: "tenant-1", user: null });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useInstallationTypeOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.options).toEqual([]);
    expect(fetchMdmsMasters).not.toHaveBeenCalled();
  });
});
