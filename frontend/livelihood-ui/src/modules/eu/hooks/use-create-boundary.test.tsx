import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reloadModule, upsertLocalization, useAuthStore } from "@/shared";
import { createBoundary, createBoundaryRelationship } from "../services/boundary";
import { useCreateBoundary } from "./use-create-boundary";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, upsertLocalization: vi.fn(), reloadModule: vi.fn() };
});

vi.mock("../services/boundary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/boundary")>();
  return { ...actual, createBoundary: vi.fn(), createBoundaryRelationship: vi.fn() };
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

const user = { uuid: "user-1" };

beforeEach(() => {
  vi.mocked(createBoundary).mockReset().mockResolvedValue(undefined);
  vi.mocked(createBoundaryRelationship).mockReset().mockResolvedValue(undefined);
  vi.mocked(upsertLocalization).mockReset().mockResolvedValue(undefined);
  vi.mocked(reloadModule).mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useCreateBoundary", () => {
  it("upserts the localization entry under the uppercase BOUNDARY_ prefix, matching boundaryDisplayName's reader key", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateBoundary(), { wrapper });
    result.current.mutate({
      state: "State A",
      district: "",
      block: "Some Block",
      isStateTextMode: true,
      isDistrictTextMode: false,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const stateUpsertCall = vi.mocked(upsertLocalization).mock.calls.find((call) =>
      (call[0].messages[0].code as string).includes("STATE"),
    );
    expect(stateUpsertCall?.[0].messages[0].code).toBe("BOUNDARY_INDIA_STATE/A");
    expect(stateUpsertCall?.[0].messages[0].message).toBe("State A");
  });
});
