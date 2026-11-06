import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../stores/auth-store";
import { useBoundary } from "./use-boundary";

vi.mock("../api/boundary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/boundary")>();
  return {
    ...actual,
    fetchBoundaryRelations: vi.fn(),
  };
});

import { fetchBoundaryRelations } from "../api/boundary";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

const authedUser = { uuid: "user-1" };

beforeEach(() => {
  vi.mocked(fetchBoundaryRelations).mockReset();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
});

describe("useBoundary", () => {
  it("fetches boundary relations with sorted, deduped codes when enabled", async () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
    vi.mocked(fetchBoundaryRelations).mockResolvedValue({ districts: [{ code: "D1", parentCode: "" }] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useBoundary(["B2", "B1"]), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchBoundaryRelations).toHaveBeenCalledWith(["B2", "B1"], "token-1", authedUser);
    expect(result.current.data).toEqual({ districts: [{ code: "D1", parentCode: "" }] });
  });

  it("does not fetch when there is no access token", async () => {
    useAuthStore.setState({ accessToken: null, user: authedUser });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useBoundary(["B1"]), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchBoundaryRelations).not.toHaveBeenCalled();
  });

  it("does not fetch when codes is empty", async () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
    const { wrapper } = createWrapper();

    renderHook(() => useBoundary([]), { wrapper });

    await waitFor(() => expect(fetchBoundaryRelations).not.toHaveBeenCalled());
  });
});
