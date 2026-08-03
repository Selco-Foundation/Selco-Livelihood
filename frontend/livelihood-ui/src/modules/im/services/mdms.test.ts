/**
 * Unit tests for src/modules/im/services/mdms.ts.
 *
 * Covers `fetchAssetTypes` and `fetchServiceDefsForMenuPath`, both of which call the shared
 * `fetchMdmsMasters` helper (which internally POSTs to the MDMS `_search` endpoint via
 * `apiClient`). Rather than mocking `fetchMdmsMasters` itself, these tests spy on the underlying
 * `apiClient.post` and stub its resolved value with `mockAxiosSuccess`, shaping the response the
 * same way the real MDMS API does: `{ MdmsRes: { <moduleName>: { <masterName>: [...] } } }`.
 * This exercises the real request/response plumbing while keeping the tests independent of any
 * live backend. Each test only cares about the shape of the mocked `ItemCode` / `ServiceDefs`
 * arrays and the transformation (filtering, dedup, sort, translate) applied on top.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { fetchAssetTypes, fetchServiceDefsForMenuPath } from "./mdms";

afterEach(() => {
  vi.restoreAllMocks();
});

// Identity translator: passes the i18n key straight through so tests can assert on the raw key
// (or reproduce the real translateOr fallback behavior) without needing a real i18n provider.
const noopT = (key: string) => key;

// fetchAssetTypes reads the "ItemCode" MDMS master for the "livelihood" module, drops any item
// that is explicitly inactive (active === false) or has no category, deduplicates categories via
// a Set, sorts them alphabetically, and returns each as a { code, name } SelectOption (name is
// left untranslated — translation happens at render time, not in this service).
describe("fetchAssetTypes", () => {
  // Two ItemCode entries share the "STREETLIGHT" category — the Set-based dedup must collapse
  // them into a single output entry rather than producing a duplicate.
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

  // Only `active === false` (a strict boolean check) should exclude an item; an item without
  // an `active` field at all (undefined) must still be treated as active and included.
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

  // An item missing `category` entirely (falsy) must be filtered out rather than surfacing as
  // an empty-string category option.
  it("skips items with no category", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ MdmsRes: { livelihood: { ItemCode: [{ code: "I1" }] } } }),
    );

    const result = await fetchAssetTypes("token", null);

    expect(result).toEqual([]);
  });

  // Categories are sorted with localeCompare on the raw (untranslated) code, since translation
  // happens later at render time — "APPLE" must come before "ZEBRA" regardless of input order.
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

  // `masters.ItemCode` can be undefined if the master isn't returned at all — the `?? []`
  // fallback must prevent a crash and simply yield no options.
  it("returns an empty array when ItemCode master is missing", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({ MdmsRes: { livelihood: {} } }));

    const result = await fetchAssetTypes("token", null);

    expect(result).toEqual([]);
  });
});

// fetchServiceDefsForMenuPath reads the "ServiceDefs" MDMS master for the "Incident" module,
// keeps only entries that are not deprecated and whose menuPath matches the given menuPath,
// derives a `key`/name via translateOr (looking up "SERVICEDEFS.<SERVICECODE>" with the raw
// serviceCode as fallback), drops any entry whose derived key is empty (no serviceCode), and
// sorts the remainder alphabetically by the (translated) name.
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

  // An entry with no `serviceCode` derives an empty string as its `key`; such entries must be
  // dropped by the post-map `.filter((item) => item.key)` rather than surfacing as a blank option.
  it("filters out entries with an empty derived key", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        MdmsRes: { Incident: { ServiceDefs: [{ menuPath: "streetlight" }] } },
      }),
    );

    const result = await fetchServiceDefsForMenuPath("token", null, "streetlight", noopT);

    expect(result).toEqual([]);
  });

  // Sorting happens after translation, on the translated `name`, not the raw serviceCode — this
  // custom `t` strips the "SERVICEDEFS." prefix so the translated name equals the serviceCode,
  // letting the assertion confirm ordering is driven by the (translated) name field.
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
