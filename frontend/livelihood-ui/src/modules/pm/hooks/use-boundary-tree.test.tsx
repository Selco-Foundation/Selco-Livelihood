import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { fetchBoundaryRelations } from "@/shared/api/boundary";
import { useJurisdictionStore } from "@/shared/stores/jurisdiction-store";
import { useBoundaryTree } from "./use-boundary-tree";

vi.mock("@/shared/api/boundary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/api/boundary")>();
  return { ...actual, fetchBoundaryRelations: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(fetchBoundaryRelations).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
  useJurisdictionStore.setState({ boundaries: { state: ["ST1"], block: ["B1"] } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
  useJurisdictionStore.setState({ boundaries: null });
});

describe("useBoundaryTree", () => {
  it("resolves state/district/block display names to their own codes, and derives block.stateCode via its district's parent", async () => {
    vi.mocked(fetchBoundaryRelations).mockResolvedValue({
      states: [{ code: "ST1" }],
      districts: [{ code: "D1", parentCode: "ST1" }],
      blocks: [{ code: "B1", parentCode: "D1" }],
    } as never);

    const { result } = renderHook(() => useBoundaryTree(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      states: [{ code: "ST1", name: "ST1" }],
      districts: [{ code: "D1", name: "D1", stateCode: "ST1" }],
      blocks: [{ code: "B1", name: "B1", districtCode: "D1", stateCode: "ST1" }],
    });
  });

  it("calls fetchBoundaryRelations with the aggregated boundary codes", async () => {
    vi.mocked(fetchBoundaryRelations).mockResolvedValue({ states: [], districts: [], blocks: [] } as never);

    renderHook(() => useBoundaryTree(), { wrapper: createWrapper() });

    await waitFor(() =>
      expect(fetchBoundaryRelations).toHaveBeenCalledWith(["ST1", "B1"], "token-1", { uuid: "u1" }),
    );
  });

  it("does not fetch when there are no jurisdiction boundaries", async () => {
    useJurisdictionStore.setState({ boundaries: null });

    const { result } = renderHook(() => useBoundaryTree(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(fetchBoundaryRelations).not.toHaveBeenCalled();
  });

  it("does not fetch when accessToken is missing", async () => {
    useAuthStore.setState({ accessToken: null });

    const { result } = renderHook(() => useBoundaryTree(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(fetchBoundaryRelations).not.toHaveBeenCalled();
  });
});
