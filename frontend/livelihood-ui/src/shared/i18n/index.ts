import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { fetchLocalization } from "../api/localization";
import { tenantId as resolveTenantId } from "../config/global-config";
import { getViteEnv } from "../env";
import { useAuthStore } from "../stores/auth-store";
import { useLocaleStore } from "../stores/locale-store";
import {
  getDefaultLanguage,
  getDefaultLocalizationModules,
  normalizeLocale,
} from "./locale-utils";

const TRANSLATIONS_NS = "translations";

function getActiveTenantId(explicitTenantId?: string): string {
  if (explicitTenantId) {
    return explicitTenantId;
  }

  const employeeTenant = useAuthStore.getState().employeeTenantId;
  return employeeTenant ?? resolveTenantId(getViteEnv("VITE_STATE_LEVEL_TENANT_ID"));
}

function persistLocaleChoice(locale: string): void {
  useLocaleStore.getState().setLocale(locale);
  if (typeof window !== "undefined") {
    window.localStorage.setItem("Employee.locale", locale);
    window.localStorage.setItem("Citizen.locale", locale);
    window.sessionStorage.setItem("locale", locale);
  }
}

function readStoredLocale(): string {
  if (typeof window === "undefined") {
    return getDefaultLanguage();
  }

  const persisted = useLocaleStore.getState().locale;
  if (persisted) {
    return persisted;
  }

  return (
    window.sessionStorage.getItem("locale") ??
    window.localStorage.getItem("Employee.locale") ??
    window.localStorage.getItem("Citizen.locale") ??
    getDefaultLanguage()
  );
}

function modulesCacheKey(locale: string, module: string): string {
  return `livelihood-i18n.${locale}.${module}`;
}

function readModuleCache(locale: string, module: string): Record<string, string> | null {
  try {
    const raw = window.localStorage.getItem(modulesCacheKey(locale, module));
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

function writeModuleCache(locale: string, module: string, resources: Record<string, string>): void {
  try {
    window.localStorage.setItem(modulesCacheKey(locale, module), JSON.stringify(resources));
  } catch {
    // localStorage write failures (e.g. private mode quota) are non-fatal
  }
}

async function fetchAndApplyModules(
  modules: string[],
  locale: string,
  tenant: string,
): Promise<void> {
  const normalizedLocale = normalizeLocale(locale);

  for (const module of modules) {
    const alreadyLoaded = useLocaleStore.getState().getUnloadedModules([module]).length === 0;

    if (alreadyLoaded) {
      // Module is recorded in livelihood-locale.loadedModules — restore translations
      // from the per-module localStorage cache into i18next (handles page refresh).
      const cached = readModuleCache(normalizedLocale, module);
      if (cached) {
        i18n.addResources(normalizedLocale, TRANSLATIONS_NS, cached);
      }
      continue;
    }

    // Module not in loadedModules — fetch fresh from API, cache, and mark as loaded.
    const resources = await fetchLocalization({
      locale: normalizedLocale,
      tenantId: tenant,
      modules: [module],
    });

    writeModuleCache(normalizedLocale, module, resources);
    i18n.addResources(normalizedLocale, TRANSLATIONS_NS, resources);
    useLocaleStore.getState().markModulesLoaded([module]);
  }
}

let instanceReady = false;

export interface InitI18nOptions {
  locale?: string;
  tenantId?: string;
  modules?: string[];
}

async function ensureI18nInstance(locale: string): Promise<void> {
  if (instanceReady) {
    return;
  }

  await i18n.use(initReactI18next).init({
    lng: locale,
    fallbackLng: getDefaultLanguage(),
    debug: false,
    ns: [TRANSLATIONS_NS],
    defaultNS: TRANSLATIONS_NS,
    keySeparator: false,
    interpolation: {
      escapeValue: false,
      formatSeparator: ",",
    },
    react: {
      useSuspense: false,
      bindI18n: "loaded",
      bindI18nStore: "added",
    },
    resources: {
      [locale]: {
        [TRANSLATIONS_NS]: {},
      },
    },
  });

  instanceReady = true;
}

export async function initI18n(options: InitI18nOptions = {}): Promise<typeof i18n> {
  const locale = normalizeLocale(options.locale ?? readStoredLocale());
  const tenant = getActiveTenantId(options.tenantId);
  const modules = options.modules ?? getDefaultLocalizationModules(tenant);

  persistLocaleChoice(locale);
  await ensureI18nInstance(locale);
  await loadModules(modules, locale, tenant);
  await i18n.changeLanguage(locale);
  return i18n;
}

export async function loadModules(
  modules: string[],
  locale?: string,
  tenantId?: string,
): Promise<void> {
  const activeLocale = normalizeLocale(locale ?? readStoredLocale());
  const tenant = getActiveTenantId(tenantId);
  await fetchAndApplyModules(modules, activeLocale, tenant);
}

/**
 * Forces a fresh re-fetch of a module's translations from the API.
 *
 * Steps:
 *   1. Removes the module from livelihood-locale.loadedModules (Zustand persist).
 *      This makes fetchAndApplyModules treat it as unloaded on the next call.
 *   2. Calls loadModules() for that module — because it is no longer in loadedModules,
 *      the full fetch + cache-write + mark-loaded cycle runs again with fresh API data.
 *
 * Use this when you need to invalidate and refresh a module's translations at runtime,
 * e.g. after an admin updates localization keys.
 *
 * @param moduleCode  Short module name, e.g. "im" → resolves to "rainmaker-im"
 */
export async function reloadModule(
  moduleCode: string,
  locale?: string,
  tenantId?: string,
): Promise<void> {
  const fullModuleName = `rainmaker-${moduleCode.toLowerCase()}`;

  // Step 1: Remove from livelihood-locale so the next loadModules call treats it as fresh.
  useLocaleStore.getState().removeModule(fullModuleName);

  // Step 2: Re-run the full localization cycle for this module.
  await loadModules([fullModuleName], locale, tenantId);
}

export async function setLocale(
  locale: string,
  tenantId?: string,
): Promise<void> {
  const normalizedLocale = normalizeLocale(locale);
  const tenant = getActiveTenantId(tenantId);
  const modules = getDefaultLocalizationModules(tenant);

  persistLocaleChoice(normalizedLocale);
  await loadModules(modules, normalizedLocale, tenant);
  await i18n.changeLanguage(normalizedLocale);
}

export { i18n };
export { useModuleI18n } from "./useModuleI18n";
