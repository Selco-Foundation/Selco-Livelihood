import { describe, expect, it, vi, beforeEach } from "vitest";
import { postSearch } from "@/shared";
import { searchVendorOrganisations } from "./vendor-organisation";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, postSearch: vi.fn() };
});

describe("searchVendorOrganisations", () => {
  beforeEach(() => {
    vi.mocked(postSearch).mockReset();
  });

  it("searches VENDOR-type organizations for the tenant, omitting name when no query is given", async () => {
    vi.mocked(postSearch).mockResolvedValue({ organisations: [] });

    await searchVendorOrganisations(undefined, "tenant-1", "token-1");

    expect(postSearch).toHaveBeenCalledWith(
      "/vendor/organisation/v1/_search",
      "SearchCriteria",
      { tenantId: "tenant-1", orgType: "VENDOR" },
      { accessToken: "token-1", user: undefined, limit: 50 },
    );
  });

  it("includes name in the criteria when a query is given", async () => {
    vi.mocked(postSearch).mockResolvedValue({ organisations: [] });

    await searchVendorOrganisations("acme", "tenant-1", "token-1");

    expect(postSearch).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { tenantId: "tenant-1", orgType: "VENDOR", name: "acme" },
      expect.anything(),
    );
  });

  it("reads the lowercase organisations key and maps id/name to code/name", async () => {
    vi.mocked(postSearch).mockResolvedValue({
      organisations: [{ id: "org-1", name: "Acme Vendors", orgStatus: "ACTIVE" }],
    });

    const result = await searchVendorOrganisations(undefined, "tenant-1", "token-1");

    expect(result).toEqual([{ code: "org-1", name: "Acme Vendors" }]);
  });

  it("filters out organisations with no id or that aren't ACTIVE", async () => {
    vi.mocked(postSearch).mockResolvedValue({
      organisations: [
        { id: "org-1", name: "Active Org", orgStatus: "ACTIVE" },
        { id: "org-2", name: "Inactive Org", orgStatus: "INACTIVE" },
        { name: "No Id Org", orgStatus: "ACTIVE" },
      ],
    });

    const result = await searchVendorOrganisations(undefined, "tenant-1", "token-1");

    expect(result).toEqual([{ code: "org-1", name: "Active Org" }]);
  });

  it("falls back to id as the display name when name is absent", async () => {
    vi.mocked(postSearch).mockResolvedValue({
      organisations: [{ id: "org-1", orgStatus: "ACTIVE" }],
    });

    const result = await searchVendorOrganisations(undefined, "tenant-1", "token-1");

    expect(result).toEqual([{ code: "org-1", name: "org-1" }]);
  });
});
