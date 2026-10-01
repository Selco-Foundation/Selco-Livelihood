import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { fetchInstallationSolutions } from "@/shared/api/mdms";
import { useSectors } from "./use-sectors";

vi.mock("@/shared/api/mdms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/api/mdms")>();
  return { ...actual, fetchInstallationSolutions: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(fetchInstallationSolutions).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useSectors", () => {
  it("derives distinct sectors from the solutions' sectorName, preserving first-seen order", async () => {
    vi.mocked(fetchInstallationSolutions).mockResolvedValue([
      { code: "SOLAR_A", sectorName: "Solar" },
      { code: "MACHINE_A", sectorName: "Machine" },
      { code: "SOLAR_B", sectorName: "Solar" },
    ] as never);

    const { result } = renderHook(() => useSectors(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      { code: "Solar", name: "Solar" },
      { code: "Machine", name: "Machine" },
    ]);
  });

  it("returns undefined data while the underlying solutions query has no data yet", async () => {
    vi.mocked(fetchInstallationSolutions).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSectors(), { wrapper: createWrapper() });

    expect(result.current.data).toBeUndefined();
  });
});
