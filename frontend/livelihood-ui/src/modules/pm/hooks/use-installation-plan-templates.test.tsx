import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useInstallationPlanTemplates } from "./use-installation-plan-templates";
import { searchFieldPlanTemplateSolutionIds } from "../services/installation-template";

vi.mock("../services/installation-template", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/installation-template")>();
  return { ...actual, searchFieldPlanTemplateSolutionIds: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(searchFieldPlanTemplateSolutionIds).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useInstallationPlanTemplates", () => {
  it("maps each uploaded solutionId to a template entry", async () => {
    vi.mocked(searchFieldPlanTemplateSolutionIds).mockResolvedValue(new Set(["SOLAR", "MACHINE"]));

    const { result } = renderHook(() => useInstallationPlanTemplates("plan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      { solutionCode: "SOLAR", uploaded: true },
      { solutionCode: "MACHINE", uploaded: true },
    ]);
  });

  it("does not search when fieldPlanId is undefined", async () => {
    const { result } = renderHook(() => useInstallationPlanTemplates(undefined), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(searchFieldPlanTemplateSolutionIds).not.toHaveBeenCalled();
  });
});
