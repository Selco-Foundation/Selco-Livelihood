import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useInstallationPlanById } from "./use-installation-plan-by-id";
import { searchInstallationPlans } from "../services/installation-plan";
import type { InstallationPlan } from "../types/installation-plan";

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

const plan: InstallationPlan = { id: "plan-1", tenantId: "tenant-1", projectId: "project-1" };

beforeEach(() => {
  vi.mocked(searchInstallationPlans).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useInstallationPlanById", () => {
  it("searches by id and returns the found plan", async () => {
    vi.mocked(searchInstallationPlans).mockResolvedValue({ plans: [{ plan, status: "DRAFT" }], totalCount: 1 });

    const { result } = renderHook(() => useInstallationPlanById("plan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchInstallationPlans).toHaveBeenCalledWith(
      { criteria: { id: ["plan-1"] }, limit: 1, offset: 0 },
      "token-1",
      { uuid: "u1" },
    );
    expect(result.current.data).toEqual(plan);
  });

  it("returns null when no plan is found", async () => {
    vi.mocked(searchInstallationPlans).mockResolvedValue({ plans: [], totalCount: 0 });

    const { result } = renderHook(() => useInstallationPlanById("plan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("does not search when planId is undefined", async () => {
    const { result } = renderHook(() => useInstallationPlanById(undefined), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(searchInstallationPlans).not.toHaveBeenCalled();
  });

  it("does not search when accessToken is missing", async () => {
    useAuthStore.setState({ accessToken: null });

    const { result } = renderHook(() => useInstallationPlanById("plan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(searchInstallationPlans).not.toHaveBeenCalled();
  });
});
