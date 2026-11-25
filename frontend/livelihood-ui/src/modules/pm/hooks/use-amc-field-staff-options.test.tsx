import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useAmcFieldStaffOptions } from "./use-amc-field-staff-options";
import { searchOrgUsers } from "../services/vendor-registry";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, tenantId: vi.fn(() => "tenant-1") };
});
vi.mock("../services/vendor-registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/vendor-registry")>();
  return { ...actual, searchOrgUsers: vi.fn() };
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.mocked(searchOrgUsers).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});
afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useAmcFieldStaffOptions", () => {
  it("returns the organization's AMC field staff", async () => {
    vi.mocked(searchOrgUsers).mockResolvedValue({
      OrgUsers: [
        { userId: "u1", user: { name: "Ravi", roles: [{ code: "AMC_FIELD_STAFF" }] } },
        { userId: "u2", user: { name: "Other", roles: [] } },
      ],
    });
    const { result } = renderHook(() => useAmcFieldStaffOptions("org-1"), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([{ code: "u1", name: "Ravi" }]));
    expect(searchOrgUsers).toHaveBeenCalledWith("tenant-1", "org-1", "token-1", { uuid: "u1" });
  });

  it("does not fetch without an organization", () => {
    renderHook(() => useAmcFieldStaffOptions(undefined), { wrapper });
    expect(searchOrgUsers).not.toHaveBeenCalled();
  });
});
