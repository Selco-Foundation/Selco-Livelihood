import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAllKnownModules,
  getLoadedModulesForLocale,
  markModuleLoaded,
  readModulePayload,
  removeModuleFromLocale,
  writeModulePayload,
} from "./module-cache";

describe("module-cache", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("getLoadedModulesForLocale / getAllKnownModules", () => {
    it("return an empty array when nothing has been stored", () => {
      expect(getLoadedModulesForLocale("en_IN")).toEqual([]);
      expect(getAllKnownModules()).toEqual([]);
    });

    it("return an empty array for malformed JSON in localStorage", () => {
      window.localStorage.setItem("livelihood-i18n.en_IN.__modules", "not-json{");
      expect(getLoadedModulesForLocale("en_IN")).toEqual([]);
    });

    it("return an empty array when the stored value isn't a JSON array", () => {
      window.localStorage.setItem("livelihood-i18n.__all-modules", JSON.stringify({ foo: "bar" }));
      expect(getAllKnownModules()).toEqual([]);
    });

    it("filters out non-string entries from a stored array", () => {
      window.localStorage.setItem(
        "livelihood-i18n.en_IN.__modules",
        JSON.stringify(["rainmaker-im", 42, null, "rainmaker-ir"]),
      );
      expect(getLoadedModulesForLocale("en_IN")).toEqual(["rainmaker-im", "rainmaker-ir"]);
    });
  });

  describe("markModuleLoaded", () => {
    it("adds the module to both the per-locale list and the all-known-modules list", () => {
      markModuleLoaded("en_IN", "rainmaker-im");
      expect(getLoadedModulesForLocale("en_IN")).toEqual(["rainmaker-im"]);
      expect(getAllKnownModules()).toEqual(["rainmaker-im"]);
    });

    it("does not add duplicate entries when called twice for the same module", () => {
      markModuleLoaded("en_IN", "rainmaker-im");
      markModuleLoaded("en_IN", "rainmaker-im");
      expect(getLoadedModulesForLocale("en_IN")).toEqual(["rainmaker-im"]);
      expect(getAllKnownModules()).toEqual(["rainmaker-im"]);
    });

    it("keeps per-locale lists independent across locales while sharing the all-known-modules list", () => {
      markModuleLoaded("en_IN", "rainmaker-im");
      markModuleLoaded("hi_IN", "rainmaker-ir");
      expect(getLoadedModulesForLocale("en_IN")).toEqual(["rainmaker-im"]);
      expect(getLoadedModulesForLocale("hi_IN")).toEqual(["rainmaker-ir"]);
      expect(getAllKnownModules().sort()).toEqual(["rainmaker-im", "rainmaker-ir"]);
    });
  });

  describe("removeModuleFromLocale", () => {
    it("removes the module from the per-locale list but leaves the all-known-modules list untouched", () => {
      markModuleLoaded("en_IN", "rainmaker-im");
      markModuleLoaded("en_IN", "rainmaker-ir");

      removeModuleFromLocale("en_IN", "rainmaker-im");

      expect(getLoadedModulesForLocale("en_IN")).toEqual(["rainmaker-ir"]);
      expect(getAllKnownModules().sort()).toEqual(["rainmaker-im", "rainmaker-ir"]);
    });

    it("deletes the cached payload for that locale/module pair", () => {
      writeModulePayload("en_IN", "rainmaker-im", { ES_HELLO: "Hello" });
      removeModuleFromLocale("en_IN", "rainmaker-im");
      expect(readModulePayload("en_IN", "rainmaker-im")).toBeNull();
    });
  });

  describe("readModulePayload / writeModulePayload", () => {
    it("round-trips a resource map through localStorage", () => {
      writeModulePayload("en_IN", "rainmaker-im", { ES_HELLO: "Hello" });
      expect(readModulePayload("en_IN", "rainmaker-im")).toEqual({ ES_HELLO: "Hello" });
    });

    it("returns null when nothing is cached for that locale/module pair", () => {
      expect(readModulePayload("en_IN", "rainmaker-missing")).toBeNull();
    });

    it("returns null for malformed cached JSON", () => {
      window.localStorage.setItem("livelihood-i18n.en_IN.rainmaker-im", "not-json{");
      expect(readModulePayload("en_IN", "rainmaker-im")).toBeNull();
    });

    it("swallows write failures instead of throwing", () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota exceeded");
      });

      expect(() => writeModulePayload("en_IN", "rainmaker-im", { ES_HELLO: "Hello" })).not.toThrow();

      setItemSpy.mockRestore();
    });
  });
});
