import { describe, expect, it, vi, beforeEach } from "vitest";
import { searchHrmsEmployees } from "@/shared";
import { fetchVendorOptions } from "./vendor";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    searchHrmsEmployees: vi.fn(),
  };
});

describe("fetchVendorOptions", () => {
  beforeEach(() => {
    vi.mocked(searchHrmsEmployees).mockReset();
  });

  it("searches HRMS employees scoped to the vendor/resolver roles and the given boundary", async () => {
    vi.mocked(searchHrmsEmployees).mockResolvedValue([]);

    await fetchVendorOptions("token-1", { uuid: "u1" }, "boundary-1");

    expect(searchHrmsEmployees).toHaveBeenCalledWith(
      {
        roles: "LIVELIHOOD_VENDOR,COMPLAINT_RESOLVER",
        isActive: true,
        boundaryCodes: "boundary-1",
      },
      "token-1",
      { uuid: "u1" },
    );
  });

  it("maps employees with a uuid to {code, name}, filtering out those without one", async () => {
    vi.mocked(searchHrmsEmployees).mockResolvedValue([
      { user: { uuid: "u1", name: "Vendor One" } },
      { user: { uuid: "u2" } },
      { user: {} },
      {},
    ]);

    const result = await fetchVendorOptions("token-1", null, "boundary-1");

    expect(result).toEqual([
      { code: "u1", name: "Vendor One" },
      { code: "u2", name: "" },
    ]);
  });
});
