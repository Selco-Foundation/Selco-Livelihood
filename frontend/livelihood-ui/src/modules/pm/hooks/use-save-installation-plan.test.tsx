import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useSaveInstallationPlan } from "./use-save-installation-plan";
import { createInstallationPlan, updateInstallationPlan } from "../services/installation-plan";
import { pmKeys } from "./query-keys";
import type { InstallationPlan } from "../types/installation-plan";

vi.mock("../services/installation-plan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/installation-plan")>();
  return { ...actual, createInstallationPlan: vi.fn(), updateInstallationPlan: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateQueries };
}

beforeEach(() => {
  vi.mocked(createInstallationPlan).mockReset();
  vi.mocked(updateInstallationPlan).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useSaveInstallationPlan", () => {
  it("creates a new plan when it has no id", async () => {
    const plan: InstallationPlan = { tenantId: "tenant-1", projectId: "project-1" };
    vi.mocked(createInstallationPlan).mockResolvedValue({ plan: { ...plan, id: "plan-1" } });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSaveInstallationPlan(), { wrapper });
    result.current.mutate(plan);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createInstallationPlan).toHaveBeenCalledWith(plan, "token-1", { uuid: "u1" });
    expect(updateInstallationPlan).not.toHaveBeenCalled();
  });

  it("updates an existing plan when it has an id", async () => {
    const plan: InstallationPlan = { id: "plan-1", tenantId: "tenant-1", projectId: "project-1" };
    vi.mocked(updateInstallationPlan).mockResolvedValue({ plan });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSaveInstallationPlan(), { wrapper });
    result.current.mutate(plan);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateInstallationPlan).toHaveBeenCalledWith(plan, "token-1", { uuid: "u1" });
    expect(createInstallationPlan).not.toHaveBeenCalled();
  });

  it("invalidates the plans() query key on success", async () => {
    vi.mocked(createInstallationPlan).mockResolvedValue({ plan: { id: "plan-1", tenantId: "tenant-1", projectId: "project-1" } });
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useSaveInstallationPlan(), { wrapper });
    result.current.mutate({ tenantId: "tenant-1", projectId: "project-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: pmKeys.plans() });
  });
});
