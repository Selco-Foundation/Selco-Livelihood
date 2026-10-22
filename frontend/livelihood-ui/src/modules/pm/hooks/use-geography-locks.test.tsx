import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useGeographyLocks, useSectorLocks } from "./use-geography-locks";
import { fetchGeographyLocks } from "../services/installation-plan";

vi.mock("../services/installation-plan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/installation-plan")>();
  return { ...actual, fetchGeographyLocks: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(fetchGeographyLocks).mockReset().mockResolvedValue({
    GeographyLocks: [{ code: "BLOCK_1", usedBy: [{ fieldPlanId: "plan-1", siteCount: 2 }] }],
    SectorLocks: [{ code: "Agriculture", usedBy: [{ fieldPlanId: "plan-1", siteCount: 3 }] }],
  });
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useGeographyLocks", () => {
  it("maps each locked geography code to why it can't be removed", async () => {
    const { result } = renderHook(() => useGeographyLocks({ fieldPlanId: "plan-1" }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect([...result.current.data!.keys()]).toEqual(["BLOCK_1"]);
  });
});

describe("useSectorLocks", () => {
  it("maps each locked sector to why it can't be removed", async () => {
    const { result } = renderHook(() => useSectorLocks({ fieldPlanId: "plan-1" }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect([...result.current.data!.keys()]).toEqual(["Agriculture"]);
  });

  it("is empty when the response has no sector locks", async () => {
    vi.mocked(fetchGeographyLocks).mockResolvedValue({ GeographyLocks: [] });
    const { result } = renderHook(() => useSectorLocks({ projectId: "project-1" }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.size).toBe(0);
  });
});
