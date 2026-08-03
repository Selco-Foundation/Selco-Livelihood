/**
 * Unit tests for i18n initialization and localization module loading.
 *
 * Covers: initI18n(), loadModules(), reloadModule(), setLocale()
 * Testing approach: Mocks i18next instance methods (init, use, changeLanguage, addResources)
 * and the localization API to test module caching, fallback behavior on cache misses, and error handling.
 * No provider wrapper needed as these are pure functions operating on a global i18n singleton.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "i18next";
import * as localizationApi from "../api/localization";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { initI18n, loadModules, reloadModule, setLocale } from "./index";
import * as moduleCache from "./module-cache";

beforeEach(() => {
  vi.spyOn(i18n, "use").mockReturnValue(i18n);
  vi.spyOn(i18n, "init").mockResolvedValue(i18n as never);
  vi.spyOn(i18n, "changeLanguage").mockResolvedValue(undefined as never);
  // addResources is only attached to the instance inside the real i18next
  // init() (as a chained proxy onto the internal resource store), so it
  // doesn't exist pre-init and vi.spyOn would reject it as undefined —
  // assign it directly instead since we're mocking i18n.init itself.
  i18n.addResources = vi.fn();
  window.localStorage.clear();
  resetAuthStore();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  resetAuthStore();
});

/**
 * loadModules: Fetches and applies localization modules for a given locale and tenant.
 * Wraps the internal fetchAndApplyModules function. Inputs: array of module names, locale (optional,
 * defaults to persisted locale), tenantId (optional, defaults to auth store or global config).
 * Manages module cache to avoid re-fetching; falls back to API if cache is missing.
 */
describe("loadModules (fetchAndApplyModules)", () => {
  it("fetches and applies a module that hasn't been loaded yet", async () => {
    const fetchSpy = vi
      .spyOn(localizationApi, "fetchLocalization")
      .mockResolvedValue({ GREETING: "Hello" });

    await loadModules(["rainmaker-common"], "en_IN", "livelihood");

    expect(fetchSpy).toHaveBeenCalledWith({
      locale: "en_IN",
      tenantId: "livelihood",
      modules: ["rainmaker-common"],
    });
    expect(i18n.addResources).toHaveBeenCalledWith("en_IN", "translations", { GREETING: "Hello" });
  });

  it("uses the cached payload instead of refetching when the module is marked loaded and cached", async () => {
    moduleCache.markModuleLoaded("en_IN", "rainmaker-common");
    moduleCache.writeModulePayload("en_IN", "rainmaker-common", { CACHED: "Value" });
    const fetchSpy = vi.spyOn(localizationApi, "fetchLocalization");

    await loadModules(["rainmaker-common"], "en_IN", "livelihood");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(i18n.addResources).toHaveBeenCalledWith("en_IN", "translations", { CACHED: "Value" });
  });

  it("falls through to refetch when a module is marked loaded but its cached payload is missing", async () => {
    moduleCache.markModuleLoaded("en_IN", "rainmaker-common");
    // No writeModulePayload call — simulates a prior write failure.
    const fetchSpy = vi
      .spyOn(localizationApi, "fetchLocalization")
      .mockResolvedValue({ FRESH: "Value" });

    await loadModules(["rainmaker-common"], "en_IN", "livelihood");

    expect(fetchSpy).toHaveBeenCalled();
    expect(i18n.addResources).toHaveBeenCalledWith("en_IN", "translations", { FRESH: "Value" });
  });

  it("continues loading other modules when one module's fetch fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(localizationApi, "fetchLocalization").mockImplementation(async ({ modules }) => {
      if (modules[0] === "rainmaker-broken") {
        throw new Error("network error");
      }
      return { OK: "value" };
    });

    await loadModules(["rainmaker-broken", "rainmaker-common"], "en_IN", "livelihood");

    expect(i18n.addResources).toHaveBeenCalledWith("en_IN", "translations", { OK: "value" });
  });

  it("logs (rather than throws) when a module fetch fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(localizationApi, "fetchLocalization").mockRejectedValue(new Error("network error"));

    await expect(loadModules(["rainmaker-broken"], "en_IN", "livelihood")).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});

/**
 * initI18n: Initializes the i18next instance (once per app lifecycle) and loads default modules for the locale/tenant.
 * Inputs: options with optional locale, tenantId, modules. Persists the normalized locale to localStorage,
 * then calls ensureI18nInstance (idempotent via instanceReady flag) and loadModules.
 */
describe("initI18n", () => {
  // NOTE: instanceReady is a module-level singleton flag (not reset between
  // tests), so this must run first — it's the only test in this block that
  // depends on i18n.init not having been gated shut by a prior call.
  it("only runs i18n.init once even across repeated initI18n calls", async () => {
    vi.spyOn(localizationApi, "fetchLocalization").mockResolvedValue({});

    await initI18n({ locale: "en_IN", tenantId: "livelihood" });
    await initI18n({ locale: "en_IN", tenantId: "livelihood" });

    expect(i18n.init).toHaveBeenCalledTimes(1);
  });

  it("persists the normalized locale", async () => {
    vi.spyOn(localizationApi, "fetchLocalization").mockResolvedValue({});
    await initI18n({ locale: "en", tenantId: "livelihood" });
    expect(window.localStorage.getItem("livelihood.locale")).toBe("en_IN");
  });

  it("resolves the tenant from the authenticated session when not explicitly given", async () => {
    seedAuthenticatedSession({ tenantId: "livelihood.sub" });
    const fetchSpy = vi.spyOn(localizationApi, "fetchLocalization").mockResolvedValue({});

    await initI18n({ locale: "en_IN" });

    expect(fetchSpy.mock.calls[0][0].tenantId).toBe("livelihood.sub");
  });

  it("changes the active language after loading modules", async () => {
    vi.spyOn(localizationApi, "fetchLocalization").mockResolvedValue({});
    await initI18n({ locale: "en_IN", tenantId: "livelihood" });
    expect(i18n.changeLanguage).toHaveBeenCalledWith("en_IN");
  });
});

/**
 * reloadModule: Forces a fresh re-fetch of a module's translations from the API for one locale,
 * invalidating any cached copy. Inputs: moduleCode (short name like "im"), locale (optional),
 * tenantId (optional). Resolves moduleCode to full "rainmaker-{code}" name and removes it from cache
 * before re-loading via loadModules.
 */
describe("reloadModule", () => {
  it("removes the module from the cache and reloads it", async () => {
    moduleCache.markModuleLoaded("en_IN", "rainmaker-im");
    moduleCache.writeModulePayload("en_IN", "rainmaker-im", { OLD: "value" });
    const fetchSpy = vi
      .spyOn(localizationApi, "fetchLocalization")
      .mockResolvedValue({ NEW: "value" });

    await reloadModule("im", "en_IN", "livelihood");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ modules: ["rainmaker-im"] }),
    );
    expect(i18n.addResources).toHaveBeenCalledWith("en_IN", "translations", { NEW: "value" });
  });

  it("lower-cases the module code and prefixes it with rainmaker-", async () => {
    const fetchSpy = vi.spyOn(localizationApi, "fetchLocalization").mockResolvedValue({});
    await reloadModule("IM", "en_IN", "livelihood");
    expect(fetchSpy).toHaveBeenCalledWith(expect.objectContaining({ modules: ["rainmaker-im"] }));
  });
});

/**
 * setLocale: Changes the active language and persists the choice. Inputs: locale (e.g. "kn_IN"), tenantId (optional).
 * Loads default modules for the tenant, calls i18n.changeLanguage, then persists to localStorage.
 */
describe("setLocale", () => {
  it("loads the default modules for the tenant, changes language, and persists the locale", async () => {
    const fetchSpy = vi.spyOn(localizationApi, "fetchLocalization").mockResolvedValue({});

    await setLocale("kn_IN", "livelihood");

    expect(fetchSpy).toHaveBeenCalled();
    expect(i18n.changeLanguage).toHaveBeenCalledWith("kn_IN");
    expect(window.localStorage.getItem("livelihood.locale")).toBe("kn_IN");
  });
});
