import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../stores/auth-store";
import { useFacility } from "./use-facility";

vi.mock("../api/facility", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/facility")>();
  return {
    ...actual,
    fetchFacilities: vi.fn(),
  };
});

import { fetchFacilities } from "../api/facility";

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
  vi.mocked(fetchFacilities).mockReset();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
});

describe("useFacility", () => {
  it("fetches facilities with the tenant id, access token and user when enabled", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(fetchFacilities).mockResolvedValue({ facilities: [], total: 0 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFacility(["B2", "B1"]), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchFacilities).toHaveBeenCalledWith(["B2", "B1"], "tenant-1", "token-1", authedUser);
    expect(result.current.data).toEqual({ facilities: [], total: 0 });
  });

  it.each([
    ["missing accessToken", { accessToken: null, employeeTenantId: "tenant-1" }],
    ["missing employeeTenantId", { accessToken: "token-1", employeeTenantId: null }],
  ])("does not fetch when %s", async (_label, state) => {
    useAuthStore.setState({ ...state, user: authedUser });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFacility(["B1"]), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchFacilities).not.toHaveBeenCalled();
  });

  it("does not fetch when boundaryCodes is empty", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();

    renderHook(() => useFacility([]), { wrapper });

    await waitFor(() => expect(fetchFacilities).not.toHaveBeenCalled());
  });
});
