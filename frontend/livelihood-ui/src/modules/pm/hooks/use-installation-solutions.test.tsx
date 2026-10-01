import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tenantId, useAuthStore } from "@/shared";
import { fetchInstallationSolutions } from "@/shared/api/mdms";
import { useInstallationSolutions } from "./use-installation-solutions";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, tenantId: vi.fn(() => "tenant-1") };
});

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

describe("useInstallationSolutions", () => {
  it("fetches the MDMS master using the shared tenantId", async () => {
    const solutions = [{ code: "SOLAR", sectorName: "Solar" }];
    vi.mocked(fetchInstallationSolutions).mockResolvedValue(solutions as never);

    const { result } = renderHook(() => useInstallationSolutions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchInstallationSolutions).toHaveBeenCalledWith("tenant-1", "token-1", { uuid: "u1" });
    expect(result.current.data).toEqual(solutions);
    expect(tenantId).toHaveBeenCalled();
  });

  it("does not fetch when accessToken is missing", async () => {
    useAuthStore.setState({ accessToken: null });

    const { result } = renderHook(() => useInstallationSolutions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(fetchInstallationSolutions).not.toHaveBeenCalled();
  });
});
