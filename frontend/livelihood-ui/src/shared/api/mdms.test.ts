/**
 * Unit tests for `fetchMdmsMasters`, `fetchLanguages`, and `fetchLoginBannerImages`
 * (src/shared/api/mdms.ts).
 *
 * `fetchMdmsMasters` is a generic MDMS (Master Data Management Service) endpoint
 * caller that queries a module for master data and returns the module's subtree
 * from the response (or an empty object if absent). `fetchLanguages` and
 * `fetchLoginBannerImages` are convenience wrappers that call fetchMdmsMasters
 * with fixed module/master names, then filter the result using type-guard helpers
 * (isSupportedLanguage, isLoginBannerImage) to ensure code/label/image fields
 * are present before building the final array.
 *
 * Mocking strategy: `apiClient.post` is spied on with `vi.spyOn` and stubbed
 * via `mockAxiosSuccess` so no real HTTP call is made. Each test supplies a
 * shaped response and verifies field filtering, fallback to empty arrays, and
 * nativeLabel defaulting. No providers/wrappers needed since these are plain
 * async data-fetching functions.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { apiClient } from "./client";
import { fetchLanguages, fetchLoginBannerImages, fetchMdmsMasters } from "./mdms";

afterEach(() => {
  vi.restoreAllMocks();
});

// fetchMdmsMasters(stateTenantId, moduleCode, masterNames, accessToken?, user?)
// posts an MDMS search request and returns the response's MdmsRes[moduleCode]
// subtree, or an empty object if the module key is missing or undefined.
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

// fetchLanguages(accessToken?, user?) wraps fetchMdmsMasters and filters the
// Languages array, keeping only entries with both code and label, defaulting
// nativeLabel to label if absent.
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

// fetchLoginBannerImages(accessToken?, user?) wraps fetchMdmsMasters and filters
// the LoginBannerImages array, keeping only entries with an image field.
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
