import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { tenantId } from "../config/global-config";
import { fetchLanguages, fetchLoginBannerImages, fetchMdmsMasters } from "./mdms";

vi.mock("./client", () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
}));
vi.mock("../config/global-config", () => ({
  tenantId: vi.fn(),
}));

describe("fetchMdmsMasters", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts MdmsCriteria with the module and master names, tenantId as a param", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { MdmsRes: {} } });
    const user = { uuid: "u1", name: "Reviewer" };

    await fetchMdmsMasters("state-tenant", "ir", ["RejectionReasons", "InstallationTypes"], "token-1", user);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/egov-mdms-service/v1/_search",
      {
        RequestInfo: expect.objectContaining({
          apiId: "Rainmaker",
          authToken: "token-1",
          userInfo: user,
        }),
        MdmsCriteria: {
          tenantId: "state-tenant",
          moduleDetails: [
            {
              moduleName: "ir",
              masterDetails: [{ name: "RejectionReasons" }, { name: "InstallationTypes" }],
            },
          ],
        },
      },
      { params: { tenantId: "state-tenant" } },
    );
  });

  it("returns the module's masters keyed by master name", async () => {
    const masters = { RejectionReasons: [{ code: "R1" }] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: { MdmsRes: { ir: masters } } });

    const result = await fetchMdmsMasters("state-tenant", "ir", ["RejectionReasons"]);

    expect(result).toBe(masters);
  });

  it("returns an empty object when the module is missing from MdmsRes", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { MdmsRes: {} } });

    const result = await fetchMdmsMasters("state-tenant", "ir", ["RejectionReasons"]);

    expect(result).toEqual({});
  });

  it("returns an empty object when MdmsRes is absent", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    const result = await fetchMdmsMasters("state-tenant", "ir", ["RejectionReasons"]);

    expect(result).toEqual({});
  });
});

describe("fetchLanguages", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(tenantId).mockReset().mockReturnValue("state-tenant");
  });

  it("fetches the Languages master from common-masters using tenantId()", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { MdmsRes: { "common-masters": { Languages: [] } } } });

    await fetchLanguages("token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/egov-mdms-service/v1/_search",
      expect.objectContaining({
        MdmsCriteria: expect.objectContaining({
          tenantId: "state-tenant",
          moduleDetails: [{ moduleName: "common-masters", masterDetails: [{ name: "Languages" }] }],
        }),
      }),
      { params: { tenantId: "state-tenant" } },
    );
  });

  it("filters out entries missing code or label, and falls back nativeLabel to label", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        MdmsRes: {
          "common-masters": {
            Languages: [
              { code: "en_IN", label: "English", nativeLabel: "English" },
              { code: "hi_IN", label: "Hindi" },
              { label: "Missing code" },
              { code: "missing-label" },
            ],
          },
        },
      },
    });

    const result = await fetchLanguages("token-1");

    expect(result).toEqual([
      { code: "en_IN", label: "English", nativeLabel: "English" },
      { code: "hi_IN", label: "Hindi", nativeLabel: "Hindi" },
    ]);
  });

  it("returns an empty array when the Languages master is absent", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { MdmsRes: { "common-masters": {} } } });

    const result = await fetchLanguages("token-1");

    expect(result).toEqual([]);
  });
});

describe("fetchLoginBannerImages", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(tenantId).mockReset().mockReturnValue("state-tenant");
  });

  it("fetches the LoginBannerImages master from commonUiConfig using tenantId()", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { MdmsRes: { commonUiConfig: { LoginBannerImages: [] } } },
    });

    await fetchLoginBannerImages("token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/egov-mdms-service/v1/_search",
      expect.objectContaining({
        MdmsCriteria: expect.objectContaining({
          tenantId: "state-tenant",
          moduleDetails: [{ moduleName: "commonUiConfig", masterDetails: [{ name: "LoginBannerImages" }] }],
        }),
      }),
      { params: { tenantId: "state-tenant" } },
    );
  });

  it("filters out entries missing an image field", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        MdmsRes: {
          commonUiConfig: {
            LoginBannerImages: [
              { image: "banner1.png", title: "Banner 1", discription: "First" },
              { title: "Missing image" },
            ],
          },
        },
      },
    });

    const result = await fetchLoginBannerImages("token-1");

    expect(result).toEqual([{ image: "banner1.png", title: "Banner 1", discription: "First" }]);
  });

  it("returns an empty array when the LoginBannerImages master is absent", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { MdmsRes: { commonUiConfig: {} } } });

    const result = await fetchLoginBannerImages("token-1");

    expect(result).toEqual([]);
  });
});
