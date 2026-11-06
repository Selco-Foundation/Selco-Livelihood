import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { fetchJustificationCodePrefixQuery, useJustificationCodePrefix } from "./use-justification-code-prefix";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    fetchMdmsMasters: vi.fn(),
    tenantId: vi.fn(() => "fallback-tenant"),
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

describe("fetchJustificationCodePrefixQuery", () => {
  it("fetches the JustificationCodePrefix master from the HCM-PROJECT-TYPES module and maps the active row", async () => {
    vi.mocked(fetchMdmsMasters).mockResolvedValue({
      JustificationCodePrefix: [{ code: "JUS", prefix: "JUS", active: true }],
    });

    const result = await fetchJustificationCodePrefixQuery("tenant-1", "token-1", null)();

    expect(fetchMdmsMasters).toHaveBeenCalledWith(
      "tenant-1",
      "HCM-PROJECT-TYPES",
      ["JustificationCodePrefix"],
      "token-1",
      null,
    );
    expect(result).toBe("JUS");
  });
});

describe("useJustificationCodePrefix", () => {
  it("fetches and returns the prefix when accessToken is present", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: null });
    vi.mocked(fetchMdmsMasters).mockResolvedValue({
      JustificationCodePrefix: [{ code: "JUS", prefix: "JUS", active: true }],
    });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useJustificationCodePrefix(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMdmsMasters).toHaveBeenCalledWith(
      "tenant-1",
      "HCM-PROJECT-TYPES",
      ["JustificationCodePrefix"],
      "token-1",
      null,
    );
    expect(result.current.data).toBe("JUS");
  });

  it("falls back to the default prefix when the master has no active row", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: null });
    vi.mocked(fetchMdmsMasters).mockResolvedValue({ JustificationCodePrefix: [] });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useJustificationCodePrefix(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe("JUS");
  });

  it("falls back to the shared tenantId() when employeeTenantId is missing", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: null, user: null });
    vi.mocked(fetchMdmsMasters).mockResolvedValue({});
    const wrapper = createWrapper();

    renderHook(() => useJustificationCodePrefix(), { wrapper });

    await waitFor(() =>
      expect(fetchMdmsMasters).toHaveBeenCalledWith(
        "fallback-tenant",
        "HCM-PROJECT-TYPES",
        ["JustificationCodePrefix"],
        "token-1",
        null,
      ),
    );
  });

  it("never calls fetchMdmsMasters when there is no accessToken", async () => {
    useAuthStore.setState({ accessToken: null, employeeTenantId: "tenant-1", user: null });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useJustificationCodePrefix(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMdmsMasters).not.toHaveBeenCalled();
  });
});
