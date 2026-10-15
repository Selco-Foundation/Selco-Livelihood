import { beforeEach, describe, expect, it, vi } from "vitest";

const mockI18n = vi.hoisted(() => ({
  use: vi.fn(),
  init: vi.fn(),
  addResources: vi.fn(),
  changeLanguage: vi.fn(),
}));
mockI18n.use.mockReturnValue(mockI18n);
mockI18n.init.mockResolvedValue(undefined);
mockI18n.changeLanguage.mockResolvedValue(undefined);

vi.mock("i18next", () => ({ default: mockI18n }));

vi.mock("../api/localization", () => ({
  fetchLocalization: vi.fn(),
}));

vi.mock("./module-cache", () => ({
  getLoadedModulesForLocale: vi.fn(() => []),
  getAllKnownModules: vi.fn(() => []),
  markModuleLoaded: vi.fn(),
  removeModuleFromLocale: vi.fn(),
  readModulePayload: vi.fn(() => null),
  writeModulePayload: vi.fn(),
}));

vi.mock("./locale-persistence", () => ({
  persistActiveLocale: vi.fn(),
  readActiveLocale: vi.fn(() => "en_IN"),
}));

import { fetchLocalization } from "../api/localization";
import { useAuthStore } from "../stores/auth-store";
import {
  getAllKnownModules,
  getLoadedModulesForLocale,
  markModuleLoaded,
  readModulePayload,
  removeModuleFromLocale,
  writeModulePayload,
} from "./module-cache";
import { persistActiveLocale } from "./locale-persistence";
import { initI18n, loadModules, reloadModule, setLocale } from "./index";

const mockedFetchLocalization = vi.mocked(fetchLocalization);
const mockedGetLoadedModulesForLocale = vi.mocked(getLoadedModulesForLocale);
const mockedGetAllKnownModules = vi.mocked(getAllKnownModules);
const mockedReadModulePayload = vi.mocked(readModulePayload);
const mockedMarkModuleLoaded = vi.mocked(markModuleLoaded);
const mockedWriteModulePayload = vi.mocked(writeModulePayload);
const mockedRemoveModuleFromLocale = vi.mocked(removeModuleFromLocale);
const mockedPersistActiveLocale = vi.mocked(persistActiveLocale);

describe("shared/i18n/index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockI18n.use.mockReturnValue(mockI18n);
    mockI18n.init.mockResolvedValue(undefined);
    mockI18n.changeLanguage.mockResolvedValue(undefined);
    mockedGetLoadedModulesForLocale.mockReturnValue([]);
    mockedGetAllKnownModules.mockReturnValue([]);
    mockedReadModulePayload.mockReturnValue(null);
    mockedFetchLocalization.mockResolvedValue({ ES_HELLO: "Hello" });
    useAuthStore.getState().clearSession();
  });

  describe("loadModules", () => {
    it("fetches, caches, and applies a module that hasn't been loaded yet", async () => {
      await loadModules(["rainmaker-im"], "en_IN", "pb.amritsar");

      expect(mockedFetchLocalization).toHaveBeenCalledWith({
        locale: "en_IN",
        tenantId: "pb.amritsar",
        modules: ["rainmaker-im"],
      });
      expect(mockedWriteModulePayload).toHaveBeenCalledWith("en_IN", "rainmaker-im", {
        ES_HELLO: "Hello",
      });
      expect(mockI18n.addResources).toHaveBeenCalledWith("en_IN", "translations", {
        ES_HELLO: "Hello",
      });
      expect(mockedMarkModuleLoaded).toHaveBeenCalledWith("en_IN", "rainmaker-im");
    });

    it("applies the cached payload without refetching when the module is already loaded", async () => {
      mockedGetLoadedModulesForLocale.mockReturnValue(["rainmaker-im"]);
      mockedReadModulePayload.mockReturnValue({ ES_HELLO: "Cached hello" });

      await loadModules(["rainmaker-im"], "en_IN", "pb.amritsar");

      expect(mockedFetchLocalization).not.toHaveBeenCalled();
      expect(mockI18n.addResources).toHaveBeenCalledWith("en_IN", "translations", {
        ES_HELLO: "Cached hello",
      });
    });

    it("refetches when the module is marked loaded but its cached payload is missing", async () => {
      mockedGetLoadedModulesForLocale.mockReturnValue(["rainmaker-im"]);
      mockedReadModulePayload.mockReturnValue(null);

      await loadModules(["rainmaker-im"], "en_IN", "pb.amritsar");

      expect(mockedFetchLocalization).toHaveBeenCalledWith({
        locale: "en_IN",
        tenantId: "pb.amritsar",
        modules: ["rainmaker-im"],
      });
      expect(mockedMarkModuleLoaded).toHaveBeenCalledWith("en_IN", "rainmaker-im");
    });

    it("also re-applies/reloads every already-known module alongside the requested ones", async () => {
      mockedGetAllKnownModules.mockReturnValue(["rainmaker-common"]);
      mockedGetLoadedModulesForLocale.mockReturnValue([]);

      await loadModules(["rainmaker-im"], "en_IN", "pb.amritsar");

      expect(mockedFetchLocalization).toHaveBeenCalledWith(
        expect.objectContaining({ modules: ["rainmaker-im"] }),
      );
      expect(mockedFetchLocalization).toHaveBeenCalledWith(
        expect.objectContaining({ modules: ["rainmaker-common"] }),
      );
    });

    it("logs and continues instead of throwing when fetching a module fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockedFetchLocalization.mockRejectedValue(new Error("network down"));

      await expect(loadModules(["rainmaker-im"], "en_IN", "pb.amritsar")).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("rainmaker-im"),
        expect.any(Error),
      );
      expect(mockedMarkModuleLoaded).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("falls back to the signed-in user's tenant when no tenantId is given", async () => {
      useAuthStore.getState().setSession({ accessToken: "token", employeeTenantId: "pb.amritsar" });

      await loadModules(["rainmaker-im"], "en_IN");

      expect(mockedFetchLocalization).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "pb.amritsar" }),
      );
    });
  });

  describe("initI18n", () => {
    // This must run before any other test in the file calls initI18n: the
    // underlying "only call i18n.init() once" behavior is driven by a
    // module-level flag in ./index that isn't reset between tests, so this
    // is the one place that can reliably observe it starting unset.
    it("initializes the underlying i18next instance only once across repeated calls, but still loads modules and changes language every time", async () => {
      await initI18n({ locale: "en_IN", tenantId: "pb" });
      await initI18n({ locale: "en_IN", tenantId: "pb" });

      expect(mockI18n.init).toHaveBeenCalledTimes(1);
      expect(mockI18n.changeLanguage).toHaveBeenCalledTimes(2);
      expect(mockedFetchLocalization).toHaveBeenCalledWith(
        expect.objectContaining({ modules: ["rainmaker-common"] }),
      );
      expect(mockedFetchLocalization).toHaveBeenCalledWith(
        expect.objectContaining({ modules: ["rainmaker-pb"] }),
      );
    });

    it("persists the locale and changes the active language", async () => {
      await initI18n({ locale: "en_IN", tenantId: "pb" });

      expect(mockedPersistActiveLocale).toHaveBeenCalledWith("en_IN");
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith("en_IN");
    });

    it("uses explicitly given modules instead of the tenant defaults when provided", async () => {
      await initI18n({ locale: "en_IN", tenantId: "pb", modules: ["rainmaker-im"] });

      expect(mockedFetchLocalization).toHaveBeenCalledWith(
        expect.objectContaining({ modules: ["rainmaker-im"] }),
      );
    });
  });

  describe("reloadModule", () => {
    it("removes the cached module then reloads it", async () => {
      await reloadModule("im", "en_IN", "pb.amritsar");

      expect(mockedRemoveModuleFromLocale).toHaveBeenCalledWith("en_IN", "rainmaker-im");
      expect(mockedFetchLocalization).toHaveBeenCalledWith(
        expect.objectContaining({ modules: ["rainmaker-im"] }),
      );
    });
  });

  describe("setLocale", () => {
    it("loads the default modules for the new locale, changes language, then persists it", async () => {
      await setLocale("hi_IN", "pb");

      expect(mockedFetchLocalization).toHaveBeenCalledWith(
        expect.objectContaining({ locale: "hi_IN", modules: ["rainmaker-common"] }),
      );
      expect(mockedFetchLocalization).toHaveBeenCalledWith(
        expect.objectContaining({ locale: "hi_IN", modules: ["rainmaker-pb"] }),
      );
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith("hi_IN");
      expect(mockedPersistActiveLocale).toHaveBeenCalledWith("hi_IN");
    });
  });
});
