import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useInstallationPlansSearch } from "./use-installation-plans-search";
import { searchInstallationPlans } from "../services/installation-plan";

vi.mock("../services/installation-plan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/installation-plan")>();
  return { ...actual, searchInstallationPlans: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(searchInstallationPlans).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useInstallationPlansSearch", () => {
  it("searches scoped to the given projectId with default paging", async () => {
    vi.mocked(searchInstallationPlans).mockResolvedValue({ plans: [], totalCount: 0 });

    const { result } = renderHook(() => useInstallationPlansSearch({ projectId: "project-1" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchInstallationPlans).toHaveBeenCalledWith(
      { criteria: { projectId: "project-1" }, limit: 10, offset: 0 },
      "token-1",
      { uuid: "u1" },
    );
  });

  it("does not search when projectId is undefined", async () => {
    const { result } = renderHook(() => useInstallationPlansSearch({ projectId: undefined }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(searchInstallationPlans).not.toHaveBeenCalled();
  });
});
