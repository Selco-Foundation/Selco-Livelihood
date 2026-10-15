import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useInstallationPlanReviewer } from "./use-installation-plan-reviewer";
import { searchAssignedReviewer } from "../services/installation-plan";

vi.mock("../services/installation-plan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/installation-plan")>();
  return { ...actual, searchAssignedReviewer: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(searchAssignedReviewer).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useInstallationPlanReviewer", () => {
  it("returns the assigned reviewer's uuid", async () => {
    vi.mocked(searchAssignedReviewer).mockResolvedValue("reviewer-1");

    const { result } = renderHook(() => useInstallationPlanReviewer("plan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchAssignedReviewer).toHaveBeenCalledWith("plan-1", "token-1", { uuid: "u1" });
    expect(result.current.data).toBe("reviewer-1");
  });

  it("does not search when fieldPlanId is undefined", async () => {
    const { result } = renderHook(() => useInstallationPlanReviewer(undefined), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(searchAssignedReviewer).not.toHaveBeenCalled();
  });
});
