import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { fetchAssetTypes, fetchServiceDefsForMenuPath } from "./mdms";

afterEach(() => {
  vi.restoreAllMocks();
});

const noopT = (key: string) => key;

describe("fetchAssetTypes", () => {
  it("dedupes categories, keeping the first occurrence", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        MdmsRes: {
          livelihood: {
            ItemCode: [
              { code: "I1", category: "STREETLIGHT" },
              { code: "I2", category: "STREETLIGHT" },
              { code: "I3", category: "WATER_PUMP" },
            ],
          },
        },
      }),
    );

    const result = await fetchAssetTypes("token", null);

    expect(result.map((r) => r.code).sort()).toEqual(["STREETLIGHT", "WATER_PUMP"]);
  });

  it("excludes items explicitly marked inactive", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        MdmsRes: {
          livelihood: {
            ItemCode: [
              { code: "I1", category: "STREETLIGHT", active: false },
              { code: "I2", category: "WATER_PUMP", active: true },
            ],
          },
        },
      }),
    );

    const result = await fetchAssetTypes("token", null);

    expect(result.map((r) => r.code)).toEqual(["WATER_PUMP"]);
  });

  it("skips items with no category", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ MdmsRes: { livelihood: { ItemCode: [{ code: "I1" }] } } }),
    );

    const result = await fetchAssetTypes("token", null);

    expect(result).toEqual([]);
  });

  it("sorts results alphabetically by raw category code", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        MdmsRes: {
          livelihood: {
            ItemCode: [
              { code: "I1", category: "ZEBRA" },
              { code: "I2", category: "APPLE" },
            ],
          },
        },
      }),
    );

    const result = await fetchAssetTypes("token", null);

    expect(result.map((r) => r.code)).toEqual(["APPLE", "ZEBRA"]);
  });

  it("does not translate the name — callers translate at render time", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        MdmsRes: {
          livelihood: {
            ItemCode: [{ code: "I1", category: "STREETLIGHT" }],
          },
        },
      }),
    );

    const result = await fetchAssetTypes("token", null);

    expect(result).toEqual([{ code: "STREETLIGHT", name: "STREETLIGHT" }]);
  });

  it("returns an empty array when ItemCode master is missing", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({ MdmsRes: { livelihood: {} } }));

    const result = await fetchAssetTypes("token", null);

    expect(result).toEqual([]);
  });
});

describe("fetchServiceDefsForMenuPath", () => {
  it("filters to service defs matching the given menuPath, excluding deprecated ones", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        MdmsRes: {
          Incident: {
            ServiceDefs: [
              { serviceCode: "SL1", menuPath: "streetlight", deprecated: false },
              { serviceCode: "SL2", menuPath: "streetlight", deprecated: true },
              { serviceCode: "WP1", menuPath: "water", deprecated: false },
            ],
          },
        },
      }),
    );

    const result = await fetchServiceDefsForMenuPath("token", null, "streetlight", noopT);

    expect(result.map((r) => r.serviceCode)).toEqual(["SL1"]);
  });

  it("filters out entries with an empty derived key", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        MdmsRes: { Incident: { ServiceDefs: [{ menuPath: "streetlight" }] } },
      }),
    );

    const result = await fetchServiceDefsForMenuPath("token", null, "streetlight", noopT);

    expect(result).toEqual([]);
  });

  it("sorts results alphabetically by translated name", async () => {
    const t = (key: string) => key.replace("SERVICEDEFS.", "");
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        MdmsRes: {
          Incident: {
            ServiceDefs: [
              { serviceCode: "ZEBRA", menuPath: "streetlight" },
              { serviceCode: "APPLE", menuPath: "streetlight" },
            ],
          },
        },
      }),
    );

    const result = await fetchServiceDefsForMenuPath("token", null, "streetlight", t);

    expect(result.map((r) => r.serviceCode)).toEqual(["APPLE", "ZEBRA"]);
  });
});
