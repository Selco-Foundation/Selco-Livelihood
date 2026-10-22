import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reloadModule, upsertLocalization, useAuthStore } from "@/shared";
import { createBoundary, createBoundaryRelationship, fetchBoundaryLgdCodes } from "../services/boundary";
import { useCreateBoundary } from "./use-create-boundary";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, upsertLocalization: vi.fn(), reloadModule: vi.fn() };
});

vi.mock("../services/boundary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/boundary")>();
  return { ...actual, createBoundary: vi.fn(), createBoundaryRelationship: vi.fn(), fetchBoundaryLgdCodes: vi.fn() };
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
  vi.mocked(fetchBoundaryLgdCodes).mockReset().mockResolvedValue(new Map());
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

describe("useCreateBoundary LGD codes", () => {
  function created(code: string) {
    return vi.mocked(createBoundary).mock.calls.find((call) => call[0].code === code)?.[0];
  }

  it("gives each new tier its own LGD codes, denormalised down the hierarchy", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateBoundary(), { wrapper });

    result.current.mutate({
      state: "Goa",
      district: "North Goa",
      block: "Bardez",
      isStateTextMode: true,
      isDistrictTextMode: true,
      lgdStateCode: "30",
      lgdDistrictCode: "549",
      lgdBlockCode: "5501",
      lgdBlockTier: "Sub-district",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(created("INDIA_GOA")).toMatchObject({ lgdStateCode: "30" });
    expect(created("INDIA_GOA")).not.toHaveProperty("lgdDistrictCode");
    expect(created("INDIA_GOA_NORTH/GOA")).toMatchObject({ lgdStateCode: "30", lgdDistrictCode: "549" });
    expect(created("INDIA_GOA_NORTH/GOA_BARDEZ")).toMatchObject({
      lgdStateCode: "30",
      lgdDistrictCode: "549",
      lgdBlockCode: "5501",
      lgdBlockTier: "Sub-district",
    });
    // Nothing to look up: every tier was typed (blanks are dropped by the service).
    expect(fetchBoundaryLgdCodes).toHaveBeenCalledWith(["", ""], "token-1", user);
  });

  it("inherits the stored codes of a picked state and district", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    vi.mocked(fetchBoundaryLgdCodes).mockResolvedValue(
      new Map([
        ["INDIA_KARNATAKA", { lgdStateCode: "29" }],
        ["INDIA_KARNATAKA_KOPPAL", { lgdStateCode: "29", lgdDistrictCode: "541" }],
      ]),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateBoundary(), { wrapper });

    result.current.mutate({
      state: "INDIA_KARNATAKA",
      district: "INDIA_KARNATAKA_KOPPAL",
      block: "New Block",
      isStateTextMode: false,
      isDistrictTextMode: false,
      lgdBlockCode: "",
      lgdBlockTier: "Block",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchBoundaryLgdCodes).toHaveBeenCalledWith(
      ["INDIA_KARNATAKA", "INDIA_KARNATAKA_KOPPAL"],
      "token-1",
      user,
    );
    const block = created("INDIA_KARNATAKA_KOPPAL_NEW/BLOCK");
    expect(block).toMatchObject({ lgdStateCode: "29", lgdDistrictCode: "541" });
    // No block code typed, so no tier is claimed for it.
    expect(block?.lgdBlockCode).toBeFalsy();
    expect(block?.lgdBlockTier).toBeUndefined();
  });
});
