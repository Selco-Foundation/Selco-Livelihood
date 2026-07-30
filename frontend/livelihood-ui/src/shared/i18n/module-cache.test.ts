import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAllKnownModules,
  getLoadedModulesForLocale,
  markModuleLoaded,
  readModulePayload,
  removeModuleFromLocale,
  writeModulePayload,
} from "./module-cache";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("getLoadedModulesForLocale / markModuleLoaded", () => {
  it("returns an empty array when nothing has been loaded yet", () => {
    expect(getLoadedModulesForLocale("en_IN")).toEqual([]);
  });

  it("tracks a module as loaded for a specific locale", () => {
    markModuleLoaded("en_IN", "rainmaker-common");
    expect(getLoadedModulesForLocale("en_IN")).toEqual(["rainmaker-common"]);
  });

  it("does not leak a locale's loaded modules into another locale", () => {
    markModuleLoaded("en_IN", "rainmaker-common");
    expect(getLoadedModulesForLocale("kn_IN")).toEqual([]);
  });

  it("dedupes when marking the same module loaded twice", () => {
    markModuleLoaded("en_IN", "rainmaker-common");
    markModuleLoaded("en_IN", "rainmaker-common");
    expect(getLoadedModulesForLocale("en_IN")).toEqual(["rainmaker-common"]);
  });

  it("also tracks the module in the all-known-modules list", () => {
    markModuleLoaded("en_IN", "rainmaker-im");
    expect(getAllKnownModules()).toEqual(["rainmaker-im"]);
  });
});

describe("removeModuleFromLocale", () => {
  it("removes the module from that locale's loaded list", () => {
    markModuleLoaded("en_IN", "rainmaker-common");
    removeModuleFromLocale("en_IN", "rainmaker-common");
    expect(getLoadedModulesForLocale("en_IN")).toEqual([]);
  });

  it("removes the cached payload for that module/locale", () => {
    writeModulePayload("en_IN", "rainmaker-common", { KEY: "value" });
    removeModuleFromLocale("en_IN", "rainmaker-common");
    expect(readModulePayload("en_IN", "rainmaker-common")).toBeNull();
  });
});

describe("readModulePayload / writeModulePayload", () => {
  it("returns null when nothing has been written", () => {
    expect(readModulePayload("en_IN", "rainmaker-common")).toBeNull();
  });

  it("round-trips a written payload", () => {
    writeModulePayload("en_IN", "rainmaker-common", { GREETING: "Hello" });
    expect(readModulePayload("en_IN", "rainmaker-common")).toEqual({ GREETING: "Hello" });
  });

  it("returns null when the stored JSON is corrupt", () => {
    window.localStorage.setItem("livelihood-i18n.en_IN.rainmaker-common", "{not valid json");
    expect(readModulePayload("en_IN", "rainmaker-common")).toBeNull();
  });

  it("silently ignores a localStorage write failure", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => writeModulePayload("en_IN", "rainmaker-common", { A: "b" })).not.toThrow();
  });

  it("returns an empty array (not throw) when the stored modules-list JSON is corrupt", () => {
    window.localStorage.setItem("livelihood-i18n.en_IN.__modules", "not-json-at-all");
    expect(getLoadedModulesForLocale("en_IN")).toEqual([]);
  });

  it("returns an empty array when the stored JSON is valid but not an array", () => {
    window.localStorage.setItem("livelihood-i18n.en_IN.__modules", JSON.stringify({ not: "an array" }));
    expect(getLoadedModulesForLocale("en_IN")).toEqual([]);
  });

  it("filters out non-string entries from a stored array", () => {
    window.localStorage.setItem(
      "livelihood-i18n.en_IN.__modules",
      JSON.stringify(["valid-module", 42, null]),
    );
    expect(getLoadedModulesForLocale("en_IN")).toEqual(["valid-module"]);
  });
});
