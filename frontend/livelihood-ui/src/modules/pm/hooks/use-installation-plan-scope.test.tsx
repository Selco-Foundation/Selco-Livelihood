import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useInstallationPlanScope } from "./use-installation-plan-scope";
import { searchFieldPlanFacilities } from "../services/installation-scope";

vi.mock("../services/installation-scope", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/installation-scope")>();
  return { ...actual, searchFieldPlanFacilities: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(searchFieldPlanFacilities).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useInstallationPlanScope", () => {
  it("returns the plan's scope entries", async () => {
    const entries = [{ siteId: "f1", included: true }];
    vi.mocked(searchFieldPlanFacilities).mockResolvedValue(entries);

    const { result } = renderHook(() => useInstallationPlanScope("plan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchFieldPlanFacilities).toHaveBeenCalledWith("plan-1", "token-1", { uuid: "u1" });
    expect(result.current.data).toEqual(entries);
  });

  it("does not search when fieldPlanId is undefined", async () => {
    const { result } = renderHook(() => useInstallationPlanScope(undefined), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(searchFieldPlanFacilities).not.toHaveBeenCalled();
  });
});
