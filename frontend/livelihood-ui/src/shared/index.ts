export { apiClient } from "./api/client";
export {
  fetchLocalization,
  messagesToResourceMap,
  type FetchLocalizationParams,
  type LocalizationMessage,
  type LocalizationResponse,
} from "./api/localization";
export { loginUser, type LoginPayload, type LoginResponse } from "./api/auth";
export { searchHrmsEmployee, type HrmsEmployee } from "./api/hrms";
export {
  fetchBoundaryRelations,
  type BoundaryHierarchy,
  type BoundaryNode,
} from "./api/boundary";
export { fetchFacilities, type FacilitySummary } from "./api/facility";
export {
  fetchMdmsMasters,
  fetchLanguages,
  fetchLoginBannerImages,
  type SupportedLanguage,
  type LoginBannerImage,
} from "./api/mdms";
export {
  contextPath,
  getConfig,
  getConfigString,
  isGlobalConfigLoaded,
  tenantId,
} from "./config/global-config";
export { employeeHomePath, employeeLoginPath } from "./config/routes";
export { queryClient } from "./query/query-client";
export { QueryProvider } from "./query/provider";
export { useBoundary } from "./hooks/use-boundary";
export { useFacility } from "./hooks/use-facility";
export { useLanguages } from "./hooks/use-languages";
export { useLoginBannerImages } from "./hooks/use-login-banner-images";
export { useAuthStore, type AuthUser } from "./stores/auth-store";
export { useJurisdictionStore } from "./stores/jurisdiction-store";
export { useLocaleStore } from "./stores/locale-store";
export { useUiStore } from "./stores/ui-store";
export { I18nProvider } from "./i18n/provider";
export { initI18n, loadModules, reloadModule, setLocale, i18n } from "./i18n";
export { useTranslate } from "./i18n/useTranslate";
export { useModuleI18n } from "./i18n/useModuleI18n";
export { translateOr } from "./i18n/translate-or";
export { persistActiveLocale, readActiveLocale } from "./i18n/locale-persistence";
export {
  getAllKnownModules,
  getLoadedModulesForLocale,
  markModuleLoaded,
  readModulePayload,
  removeModuleFromLocale,
  writeModulePayload,
} from "./i18n/module-cache";
export {
  convertToLocale,
  convertToLocaleData,
  getCityLocale,
  getDefaultLanguage,
  getDefaultLocalizationModules,
  getLocalityCode,
  getLocaleDefault,
  getLocaleRegion,
  getMohallaLocale,
  getRevenueLocalityCode,
  getTransformedLocale,
  normalizeLocale,
  namespaceToDigitModule,
  sortDropdownNames,
  toTenantLocale,
} from "./i18n/locale-utils";
export {
  aggregateBoundaryCodes,
  aggregateBoundaryTypes,
  buildJurisdictionBoundaries,
  type JurisdictionBoundaries,
} from "./utils/boundary-util";
export {
  assertEmployeeRolesAllowed,
  filterRolesForEmployeeTenant,
  hydrateEmployeeJurisdictions,
} from "./utils/employee-session";
export type { ModuleDefinition, NavItem } from "./modules/types";
