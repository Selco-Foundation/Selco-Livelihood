import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchMdmsMasters, tenantId } from "@/shared";
import { fetchAssetTypes, fetchServiceDefsForMenuPath } from "./mdms";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    fetchMdmsMasters: vi.fn(),
    tenantId: vi.fn(() => "state-1"),
  };
});

describe("fetchAssetTypes", () => {
  beforeEach(() => {
    vi.mocked(fetchMdmsMasters).mockReset();
    vi.mocked(tenantId).mockReset().mockReturnValue("state-1");
  });

  it("fetches the ItemCode master for the livelihood module", async () => {
    vi.mocked(fetchMdmsMasters).mockResolvedValue({ ItemCode: [] });

    await fetchAssetTypes("token-1", { uuid: "u1" });

    expect(fetchMdmsMasters).toHaveBeenCalledWith(
      "state-1",
      "livelihood",
      ["ItemCode"],
      "token-1",
      { uuid: "u1" },
    );
  });

  it("returns the deduped, sorted set of active categories as {code, name} options", async () => {
    vi.mocked(fetchMdmsMasters).mockResolvedValue({
      ItemCode: [
        { code: "1", category: "Solar", active: true },
        { code: "2", category: "Solar", active: true },
        { code: "3", category: "Battery", active: true },
        { code: "4", category: "Inactive", active: false },
        { code: "5", active: true },
      ],
    });

    const result = await fetchAssetTypes("token-1", null);

    expect(result).toEqual([
      { code: "Battery", name: "Battery" },
      { code: "Solar", name: "Solar" },
    ]);
  });

  it("returns an empty array when the master is missing", async () => {
    vi.mocked(fetchMdmsMasters).mockResolvedValue({});

    const result = await fetchAssetTypes("token-1", null);

    expect(result).toEqual([]);
  });
});

describe("fetchServiceDefsForMenuPath", () => {
  beforeEach(() => {
    vi.mocked(fetchMdmsMasters).mockReset();
    vi.mocked(tenantId).mockReset().mockReturnValue("state-1");
  });

  const t = (key: string) => (key === "SERVICEDEFS.NOT_WORKING" ? "Not Working" : key);

  it("fetches the ServiceDefs master for the Incident module", async () => {
    vi.mocked(fetchMdmsMasters).mockResolvedValue({ ServiceDefs: [] });

    await fetchServiceDefsForMenuPath("token-1", { uuid: "u1" }, "PANEL", t);

    expect(fetchMdmsMasters).toHaveBeenCalledWith(
      "state-1",
      "Incident",
      ["ServiceDefs"],
      "token-1",
      { uuid: "u1" },
    );
  });

  it("filters to non-deprecated defs matching menuPath, translates the name, and sorts by name", async () => {
    vi.mocked(fetchMdmsMasters).mockResolvedValue({
      ServiceDefs: [
        { serviceCode: "NOT_WORKING", menuPath: "PANEL", deprecated: false },
        { serviceCode: "OTHER_MENU", menuPath: "BATTERY", deprecated: false },
        { serviceCode: "DEPRECATED", menuPath: "PANEL", deprecated: true },
      ],
    });

    const result = await fetchServiceDefsForMenuPath("token-1", null, "PANEL", t);

    expect(result).toEqual([
      { key: "NOT_WORKING", serviceCode: "NOT_WORKING", menuPath: "PANEL", name: "Not Working" },
    ]);
  });

  it("falls back to the serviceCode as name when there's no translation, and drops entries without a serviceCode", async () => {
    vi.mocked(fetchMdmsMasters).mockResolvedValue({
      ServiceDefs: [
        { serviceCode: "UNTRANSLATED", menuPath: "PANEL" },
        { serviceCode: "", menuPath: "PANEL" },
      ],
    });

    const result = await fetchServiceDefsForMenuPath("token-1", null, "PANEL", t);

    expect(result).toEqual([
      { key: "UNTRANSLATED", serviceCode: "UNTRANSLATED", menuPath: "PANEL", name: "UNTRANSLATED" },
    ]);
  });
});
