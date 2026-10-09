import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tenantId, useAuthStore } from "@/shared";
import { useFacilitySummary } from "./use-facility-summary";

vi.mock("../services/facility", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/facility")>();
  return { ...actual, searchFacilities: vi.fn() };
});

import { searchFacilities } from "../services/facility";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

const adminUser = { uuid: "user-1", roles: [{ code: "END_USER_ADMIN" }] };
const noAccessUser = { uuid: "user-2", roles: [{ code: "OTHER" }] };

beforeEach(() => {
  vi.mocked(searchFacilities).mockReset();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useFacilitySummary", () => {
  it.each([
    ["missing accessToken", { accessToken: null, user: adminUser }],
    ["user lacks eu access", { accessToken: "token-1", user: noAccessUser }],
  ])("never calls searchFacilities when %s", async (_label, state) => {
    useAuthStore.setState(state);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFacilitySummary(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(searchFacilities).not.toHaveBeenCalled();
  });

  it("fetches a single-row tenant-wide count and returns the response's total", async () => {
    useAuthStore.setState({ accessToken: "token-1", user: adminUser });
    vi.mocked(searchFacilities).mockResolvedValue({ facilities: [], total: 42 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFacilitySummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchFacilities).toHaveBeenCalledWith(
      { tenantId: [tenantId()], limit: 1, offset: 0 },
      "token-1",
      adminUser,
    );
    expect(result.current.data).toBe(42);
  });
});
