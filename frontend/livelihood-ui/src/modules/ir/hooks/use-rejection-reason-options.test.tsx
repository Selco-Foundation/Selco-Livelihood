import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import {
  fetchRejectionReasonOptionsQuery,
  rejectionReasonOptionsQueryKey,
  useRejectionReasonOptions,
} from "./use-rejection-reason-options";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, fetchMdmsMasters: vi.fn(), tenantId: vi.fn(() => "fallback-tenant") };
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

const masters = {
  RejectionReasons: [
    { code: "OTHER", name: "Other" },
    { code: "DAMAGED_GOODS", name: "Damaged Goods" },
  ],
};

beforeEach(() => {
  vi.mocked(fetchMdmsMasters).mockReset();
  vi.mocked(tenantId).mockReset().mockReturnValue("fallback-tenant");
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
});

describe("rejectionReasonOptionsQueryKey", () => {
  it("keys by tenantId under the ir-rejection-reason-options namespace", () => {
    expect(rejectionReasonOptionsQueryKey("tenant-1")).toEqual(["ir-rejection-reason-options", "tenant-1"]);
  });
});

describe("fetchRejectionReasonOptionsQuery", () => {
  it("fetches the RejectionReasons master and maps it, sorting Other to the end", async () => {
    vi.mocked(fetchMdmsMasters).mockResolvedValue(masters);

    const result = await fetchRejectionReasonOptionsQuery("tenant-1", "token-1", null)();

    expect(fetchMdmsMasters).toHaveBeenCalledWith("tenant-1", "Installation", ["RejectionReasons"], "token-1", null);
    expect(result.map((option) => option.code)).toEqual(["DAMAGED_GOODS", "OTHER"]);
  });
});

describe("useRejectionReasonOptions", () => {
  it("fetches and maps the options when accessToken is present", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: null });
    vi.mocked(fetchMdmsMasters).mockResolvedValue(masters);
    const wrapper = createWrapper();

    const { result } = renderHook(() => useRejectionReasonOptions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMdmsMasters).toHaveBeenCalledWith(
      "tenant-1",
      "Installation",
      ["RejectionReasons"],
      "token-1",
      null,
    );
    expect(result.current.data?.map((option) => option.code)).toEqual(["DAMAGED_GOODS", "OTHER"]);
  });

  it("falls back to the shared tenantId() when employeeTenantId is missing", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: null, user: null });
    vi.mocked(fetchMdmsMasters).mockResolvedValue({});
    const wrapper = createWrapper();

    renderHook(() => useRejectionReasonOptions(), { wrapper });

    await waitFor(() =>
      expect(fetchMdmsMasters).toHaveBeenCalledWith(
        "fallback-tenant",
        "Installation",
        ["RejectionReasons"],
        "token-1",
        null,
      ),
    );
  });

  it("never calls fetchMdmsMasters when there is no accessToken", async () => {
    useAuthStore.setState({ accessToken: null, employeeTenantId: "tenant-1", user: null });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useRejectionReasonOptions(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMdmsMasters).not.toHaveBeenCalled();
  });
});
