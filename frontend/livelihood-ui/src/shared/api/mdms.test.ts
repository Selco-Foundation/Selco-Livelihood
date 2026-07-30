import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { apiClient } from "./client";
import { fetchLanguages, fetchLoginBannerImages, fetchMdmsMasters } from "./mdms";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchMdmsMasters", () => {
  it("returns the module's master data keyed by module name", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ MdmsRes: { livelihood: { ItemCode: [{ code: "I1" }] } } }),
    );

    const result = await fetchMdmsMasters("livelihood", "livelihood", ["ItemCode"]);
    expect(result).toEqual({ ItemCode: [{ code: "I1" }] });
  });

  it("returns an empty object when the module has no data in the response", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({ MdmsRes: {} }));
    const result = await fetchMdmsMasters("livelihood", "livelihood", ["ItemCode"]);
    expect(result).toEqual({});
  });
});

describe("fetchLanguages", () => {
  it("filters out entries missing code or label", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        MdmsRes: {
          "common-masters": {
            Languages: [
              { code: "en_IN", label: "English" },
              { code: "kn_IN" },
              { notALanguage: true },
            ],
          },
        },
      }),
    );

    const result = await fetchLanguages();
    expect(result).toEqual([{ code: "en_IN", label: "English", nativeLabel: "English" }]);
  });

  it("defaults nativeLabel to label when nativeLabel is missing", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        MdmsRes: {
          "common-masters": { Languages: [{ code: "kn_IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" }] },
        },
      }),
    );

    const result = await fetchLanguages();
    expect(result).toEqual([{ code: "kn_IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" }]);
  });

  it("returns an empty array when the Languages master is absent", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ MdmsRes: { "common-masters": {} } }),
    );
    expect(await fetchLanguages()).toEqual([]);
  });
});

describe("fetchLoginBannerImages", () => {
  it("filters out entries missing an image field", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        MdmsRes: {
          commonUiConfig: {
            LoginBannerImages: [
              { image: "https://cdn/img1.jpg", title: "Banner 1", discription: "d1" },
              { title: "No image here" },
            ],
          },
        },
      }),
    );

    const result = await fetchLoginBannerImages();
    expect(result).toEqual([
      { image: "https://cdn/img1.jpg", title: "Banner 1", discription: "d1" },
    ]);
  });

  it("returns an empty array when the master is absent", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ MdmsRes: { commonUiConfig: {} } }),
    );
    expect(await fetchLoginBannerImages()).toEqual([]);
  });
});
