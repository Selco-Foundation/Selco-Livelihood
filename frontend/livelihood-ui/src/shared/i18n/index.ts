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

async function fetchAndApplyModules(
  modules: string[],
  locale: string,
  tenant: string,
): Promise<void> {
  const normalizedLocale = normalizeLocale(locale);
  const unloadedModules = useLocaleStore.getState().getUnloadedModules(modules);

  if (unloadedModules.length === 0) {
    return;
  }

  const resources = await fetchLocalization({
    locale: normalizedLocale,
    tenantId: tenant,
    modules: unloadedModules,
  });

  i18n.addResources(normalizedLocale, TRANSLATIONS_NS, resources);
  useLocaleStore.getState().markModulesLoaded(unloadedModules);
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
