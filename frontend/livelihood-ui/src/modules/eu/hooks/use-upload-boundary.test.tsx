import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reloadModule, useAuthStore } from "@/shared";
import { uploadBoundaryData } from "../services/ingestion";
import { useUploadBoundary } from "./use-upload-boundary";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, reloadModule: vi.fn() };
});

vi.mock("../services/ingestion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/ingestion")>();
  return { ...actual, uploadBoundaryData: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

beforeEach(() => {
  vi.mocked(reloadModule).mockReset().mockResolvedValue(undefined);
  vi.mocked(uploadBoundaryData).mockReset();
});

describe("useUploadBoundary", () => {
  it("reloads the rainmaker-livelihood module (via reloadModule('livelihood')) after a successful upload", async () => {
    vi.mocked(uploadBoundaryData).mockResolvedValue({ success: true });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUploadBoundary(), { wrapper });
    result.current.mutate(new File(["x"], "boundaries.csv"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(reloadModule).toHaveBeenCalledWith("livelihood");
  });

  it("does not reload any module when the upload reports row-level failures", async () => {
    vi.mocked(uploadBoundaryData).mockResolvedValue({ success: false, errorCount: 2 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUploadBoundary(), { wrapper });
    result.current.mutate(new File(["x"], "boundaries.csv"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(reloadModule).not.toHaveBeenCalled();
  });
});
