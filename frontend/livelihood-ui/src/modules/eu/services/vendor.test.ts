import { describe, expect, it, vi, beforeEach } from "vitest";
import { postSearch } from "@/shared";
import { searchVendorOrgUsers } from "./vendor";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, postSearch: vi.fn() };
});

describe("searchVendorOrgUsers", () => {
  beforeEach(() => {
    vi.mocked(postSearch).mockReset();
  });

  it("posts organizationIds as a list, the vendor/resolver roles, and the given limit/offset", async () => {
    vi.mocked(postSearch).mockResolvedValue({ OrgUsers: [], TotalCount: 0 });

    await searchVendorOrgUsers("org-1", "tenant-1", 10, 20, "token-1");

    expect(postSearch).toHaveBeenCalledWith(
      "/vendor/organisation/v1/user/_search",
      "OrgUser",
      { tenantId: "tenant-1", organizationIds: ["org-1"], roles: ["LIVELIHOOD_VENDOR", "COMPLAINT_RESOLVER"] },
      { accessToken: "token-1", user: undefined, limit: 10, offset: 20 },
    );
  });

  it("reads name off the nested HRMS-enriched user object, not the top level", async () => {
    vi.mocked(postSearch).mockResolvedValue({
      OrgUsers: [{ id: "row-1", user: { uuid: "u1", name: "Vendor One", roles: [{ code: "LIVELIHOOD_VENDOR" }] } }],
      TotalCount: 1,
    });

    const result = await searchVendorOrgUsers("org-1", "tenant-1", 10, 0, "token-1");

    expect(result).toEqual({ options: [{ code: "u1", name: "Vendor One" }], total: 1, rawCount: 1 });
  });

  it("falls back to the uuid as the name when the user has none", async () => {
    vi.mocked(postSearch).mockResolvedValue({
      OrgUsers: [{ user: { uuid: "u1", roles: [{ code: "COMPLAINT_RESOLVER" }] } }],
      TotalCount: 1,
    });

    const result = await searchVendorOrgUsers("org-1", "tenant-1", 10, 0, "token-1");

    expect(result.options).toEqual([{ code: "u1", name: "u1" }]);
  });

  it("filters out rows with no uuid", async () => {
    vi.mocked(postSearch).mockResolvedValue({
      OrgUsers: [{ user: { roles: [{ code: "LIVELIHOOD_VENDOR" }] } }, {}],
      TotalCount: 2,
    });

    const result = await searchVendorOrgUsers("org-1", "tenant-1", 10, 0, "token-1");

    expect(result.options).toEqual([]);
  });

  it("filters out rows whose user doesn't hold a vendor/resolver role, since the backend's roles criterion is a no-op", async () => {
    vi.mocked(postSearch).mockResolvedValue({
      OrgUsers: [
        { user: { uuid: "u1", name: "Non Vendor", roles: [{ code: "EMPLOYEE" }] } },
        { user: { uuid: "u2", name: "Vendor Two", roles: [{ code: "LIVELIHOOD_VENDOR" }] } },
      ],
      TotalCount: 2,
    });

    const result = await searchVendorOrgUsers("org-1", "tenant-1", 10, 0, "token-1");

    expect(result.options).toEqual([{ code: "u2", name: "Vendor Two" }]);
  });

  it("reports rawCount as the rows returned before role filtering, not the filtered option count, so pagination math stays correct", async () => {
    vi.mocked(postSearch).mockResolvedValue({
      OrgUsers: [
        { user: { uuid: "u1", name: "Non Vendor", roles: [{ code: "EMPLOYEE" }] } },
        { user: { uuid: "u2", name: "Vendor Two", roles: [{ code: "LIVELIHOOD_VENDOR" }] } },
      ],
      TotalCount: 5,
    });

    const result = await searchVendorOrgUsers("org-1", "tenant-1", 10, 0, "token-1");

    expect(result.rawCount).toBe(2);
    expect(result.options).toHaveLength(1);
  });

  it("defaults total to the raw row count when TotalCount is absent", async () => {
    vi.mocked(postSearch).mockResolvedValue({
      OrgUsers: [
        { user: { uuid: "u1", name: "Vendor One", roles: [{ code: "LIVELIHOOD_VENDOR" }] } },
        { user: { uuid: "u2", name: "Non Vendor", roles: [{ code: "EMPLOYEE" }] } },
      ],
    });

    const result = await searchVendorOrgUsers("org-1", "tenant-1", 10, 0, "token-1");

    expect(result.total).toBe(2);
    expect(result.rawCount).toBe(2);
  });
});
