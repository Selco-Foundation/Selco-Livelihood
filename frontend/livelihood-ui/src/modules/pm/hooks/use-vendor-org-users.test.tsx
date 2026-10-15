import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tenantId, useAuthStore } from "@/shared";
import { useVendorOrgUsers } from "./use-vendor-org-users";
import { searchVendorOrgUsers } from "../services/vendor-registry";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, tenantId: vi.fn(() => "tenant-1") };
});

vi.mock("../services/vendor-registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/vendor-registry")>();
  return { ...actual, searchVendorOrgUsers: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(searchVendorOrgUsers).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useVendorOrgUsers", () => {
  it("fetches org users for the given organizationId using the shared tenantId", async () => {
    vi.mocked(searchVendorOrgUsers).mockResolvedValue([{ code: "u1", name: "Tech One" }]);

    const { result } = renderHook(() => useVendorOrgUsers("org-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchVendorOrgUsers).toHaveBeenCalledWith("tenant-1", "org-1", "token-1", { uuid: "u1" });
  });

  it("does not fetch when organizationId is undefined", async () => {
    const { result } = renderHook(() => useVendorOrgUsers(undefined), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(searchVendorOrgUsers).not.toHaveBeenCalled();
  });
});
