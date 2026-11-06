import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useVendorAssignmentSearch } from "./use-vendor-assignment-search";
import { searchVendorAssignment } from "../services/vendor-assignment";

vi.mock("../services/vendor-assignment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/vendor-assignment")>();
  return { ...actual, searchVendorAssignment: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(searchVendorAssignment).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useVendorAssignmentSearch", () => {
  it("searches by fieldPlanId when enabled defaults to true", async () => {
    vi.mocked(searchVendorAssignment).mockResolvedValue({ sites: [], totalAssets: 0, assignable: false });

    const { result } = renderHook(() => useVendorAssignmentSearch("plan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchVendorAssignment).toHaveBeenCalledWith("plan-1", "token-1", { uuid: "u1" });
  });

  it("does not search when enabled is explicitly false", async () => {
    const { result } = renderHook(() => useVendorAssignmentSearch("plan-1", false), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(searchVendorAssignment).not.toHaveBeenCalled();
  });

  it("does not search when fieldPlanId is undefined", async () => {
    const { result } = renderHook(() => useVendorAssignmentSearch(undefined), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(searchVendorAssignment).not.toHaveBeenCalled();
  });
});
