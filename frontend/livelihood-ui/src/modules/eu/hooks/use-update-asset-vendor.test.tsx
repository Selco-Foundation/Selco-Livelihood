import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { toast } from "@/ui";
import { useUpdateAssetVendor } from "./use-update-asset-vendor";

vi.mock("@/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/ui")>();
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } };
});

vi.mock("../services/asset", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/asset")>();
  return { ...actual, updateAssetVendorMapping: vi.fn() };
});

import { updateAssetVendorMapping } from "../services/asset";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

const user = { uuid: "user-1" };

beforeEach(() => {
  vi.mocked(updateAssetVendorMapping).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useUpdateAssetVendor", () => {
  it("calls updateAssetVendorMapping with the payload and tenantId, and shows a success toast", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    vi.mocked(updateAssetVendorMapping).mockResolvedValue({ status: "success" });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateAssetVendor(), { wrapper });
    result.current.mutate({ assetId: "a1", vendorId: "vendor-1", organisationId: "org-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateAssetVendorMapping).toHaveBeenCalledWith(
      { assetId: "a1", vendorId: "vendor-1", organisationId: "org-1" },
      expect.any(String),
      "token-1",
      user,
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it("shows an error toast when the mutation fails", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    vi.mocked(updateAssetVendorMapping).mockRejectedValue(new Error("boom"));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateAssetVendor(), { wrapper });
    result.current.mutate({ assetId: "a1", vendorId: "vendor-1", organisationId: "org-1" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalled();
  });
});
