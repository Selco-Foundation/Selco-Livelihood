import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFacilityForm } from "./use-facility-form";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

describe("useFacilityForm toUpdatePayload", () => {
  it("preserves the raw record's other address fields alongside the edited lat/lng and tenantId", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFacilityForm("facility-1"), { wrapper });

    act(() => {
      result.current.updateField("latitude", "12.9");
      result.current.updateField("longitude", "77.6");
    });

    const raw = {
      id: "facility-1",
      address: { id: "addr-1", city: "Bengaluru", pincode: "560001", tenantId: "old-tenant" },
    };

    const payload = result.current.toUpdatePayload(raw, "new-tenant");

    expect(payload.address).toEqual({
      id: "addr-1",
      city: "Bengaluru",
      pincode: "560001",
      tenantId: "new-tenant",
      latitude: 12.9,
      longitude: 77.6,
    });
  });

  it("falls back to an empty address object when the raw record has none", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFacilityForm("facility-1"), { wrapper });

    const payload = result.current.toUpdatePayload({ id: "facility-1" }, "new-tenant");

    expect(payload.address).toEqual({ tenantId: "new-tenant" });
  });
});
