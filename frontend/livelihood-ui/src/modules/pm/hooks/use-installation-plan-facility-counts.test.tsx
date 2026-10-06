import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useInstallationPlanFacilityCounts } from "./use-installation-plan-facility-counts";
import { searchFieldPlanFacilityCounts } from "../services/installation-scope";

vi.mock("../services/installation-scope", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/installation-scope")>();
  return { ...actual, searchFieldPlanFacilityCounts: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(searchFieldPlanFacilityCounts).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useInstallationPlanFacilityCounts", () => {
  it("sorts the ids before searching, for query-key stability", async () => {
    vi.mocked(searchFieldPlanFacilityCounts).mockResolvedValue({});

    const { result } = renderHook(() => useInstallationPlanFacilityCounts(["plan-2", "plan-1"]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchFieldPlanFacilityCounts).toHaveBeenCalledWith(["plan-1", "plan-2"], "token-1", { uuid: "u1" });
  });

  it("does not search when the id list is empty", async () => {
    const { result } = renderHook(() => useInstallationPlanFacilityCounts([]), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(searchFieldPlanFacilityCounts).not.toHaveBeenCalled();
  });
});
