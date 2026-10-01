import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tenantId, useAuthStore } from "@/shared";
import { useVendorOrganisations } from "./use-vendor-organisations";
import { searchVendorOrganisations } from "../services/vendor-registry";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, tenantId: vi.fn(() => "tenant-1") };
});

vi.mock("../services/vendor-registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/vendor-registry")>();
  return { ...actual, searchVendorOrganisations: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(searchVendorOrganisations).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useVendorOrganisations", () => {
  it("fetches using the shared tenantId", async () => {
    vi.mocked(searchVendorOrganisations).mockResolvedValue([{ code: "org-1", name: "Vendor One" }]);

    const { result } = renderHook(() => useVendorOrganisations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchVendorOrganisations).toHaveBeenCalledWith("tenant-1", "token-1", { uuid: "u1" });
  });

  it("does not fetch when accessToken is missing", async () => {
    useAuthStore.setState({ accessToken: null });

    const { result } = renderHook(() => useVendorOrganisations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(searchVendorOrganisations).not.toHaveBeenCalled();
  });
});
