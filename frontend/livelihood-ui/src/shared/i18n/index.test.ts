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

describe("setLocale", () => {
  it("loads the default modules for the tenant, changes language, and persists the locale", async () => {
    const fetchSpy = vi.spyOn(localizationApi, "fetchLocalization").mockResolvedValue({});

    await setLocale("kn_IN", "livelihood");

    expect(fetchSpy).toHaveBeenCalled();
    expect(i18n.changeLanguage).toHaveBeenCalledWith("kn_IN");
    expect(window.localStorage.getItem("livelihood.locale")).toBe("kn_IN");
  });
});
