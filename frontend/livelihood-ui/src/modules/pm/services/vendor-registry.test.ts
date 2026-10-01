import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { searchVendorOrgUsers, searchVendorOrganisations } from "./vendor-registry";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn() } };
});

describe("searchVendorOrganisations", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("reads the lowercase organisations key and maps code/name", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        organisations: [
          { id: "org-1", name: "Vendor One", orgSubType: "INSTALLATION_VENDOR", orgStatus: "ACTIVE" },
        ],
      },
    });

    const result = await searchVendorOrganisations("tenant-1", "token-1");

    expect(result).toEqual([{ code: "org-1", name: "Vendor One" }]);
  });

  it("filters out organisations that aren't an active installation vendor", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        organisations: [
          { id: "org-1", orgSubType: "OTHER", orgStatus: "ACTIVE" },
          { id: "org-2", orgSubType: "INSTALLATION_VENDOR", orgStatus: "INACTIVE" },
          { id: "org-3", orgSubType: "INSTALLATION_VENDOR", orgStatus: "ACTIVE" },
        ],
      },
    });

    const result = await searchVendorOrganisations("tenant-1", "token-1");

    expect(result).toEqual([{ code: "org-3", name: "org-3" }]);
  });

  it("filters out organisations with no id", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { organisations: [{ orgSubType: "INSTALLATION_VENDOR", orgStatus: "ACTIVE" }] },
    });

    const result = await searchVendorOrganisations("tenant-1", "token-1");

    expect(result).toEqual([]);
  });

  it("falls back to id as the display name when name is absent", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { organisations: [{ id: "org-1", orgSubType: "INSTALLATION_VENDOR", orgStatus: "ACTIVE" }] },
    });

    const result = await searchVendorOrganisations("tenant-1", "token-1");

    expect(result).toEqual([{ code: "org-1", name: "org-1" }]);
  });
});

describe("searchVendorOrgUsers", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("reads name/email off the nested HRMS-enriched user object, not the top level", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { OrgUsers: [{ userId: "u1", user: { name: "Tech One", emailId: "tech@example.com" } }] },
    });

    const result = await searchVendorOrgUsers("tenant-1", "org-1", "token-1");

    expect(result).toEqual([{ code: "u1", name: "Tech One", email: "tech@example.com" }]);
  });

  it("falls back to the raw uuid as the name and leaves email undefined when user is missing", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { OrgUsers: [{ userId: "u1" }] } });

    const result = await searchVendorOrgUsers("tenant-1", "org-1", "token-1");

    expect(result).toEqual([{ code: "u1", name: "u1", email: undefined }]);
  });

  it("falls back to id when userId is absent", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { OrgUsers: [{ id: "u2" }] } });

    const result = await searchVendorOrgUsers("tenant-1", "org-1", "token-1");

    expect(result).toEqual([{ code: "u2", name: "u2", email: undefined }]);
  });

  it("filters out rows with neither userId nor id", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { OrgUsers: [{}] } });

    const result = await searchVendorOrgUsers("tenant-1", "org-1", "token-1");

    expect(result).toEqual([]);
  });

  it("posts organizationIds as a list", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { OrgUsers: [] } });

    await searchVendorOrgUsers("tenant-1", "org-1", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/vendor/organisation/v1/user/_search",
      expect.objectContaining({ OrgUser: { tenantId: "tenant-1", organizationIds: ["org-1"] } }),
      expect.anything(),
    );
  });
});
