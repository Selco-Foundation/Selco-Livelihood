/**
 * Unit tests for src/shared/index.ts
 *
 * `shared/index.ts` is a pure barrel: it has no logic of its own, it just
 * re-exports ~77 runtime values (functions, React components, Zustand store
 * hooks, singleton client/store instances) plus a handful of type-only
 * exports (erased at compile time, so they have no runtime presence to test)
 * from ~30 files across `shared/`. The regression this file guards against
 * is the barrel silently drifting from what it's supposed to expose: a typo'd
 * re-export name, a forgotten addition when a new module is wired in, or a
 * re-export accidentally pointing at the wrong module/instance.
 *
 * Testing approach:
 *  - No provider wrapper or component rendering is used — nothing in this
 *    file renders JSX or invokes hooks inside React, so no
 *    renderWithProviders/RouterProvider/i18n-test-instance is needed. Each
 *    source module already has its own colocated *.test.ts(x) file that
 *    exercises its actual business logic (branches, API calls, hook
 *    behavior); re-testing that logic here would be redundant.
 *  - The barrel is imported with `import * as Shared` and compared, name by
 *    name, against a direct `import * as <Module>` of the file it came from.
 *    Reference equality (`toBe`) is the strongest possible check for a
 *    re-export: it fails if the barrel exports a different value (wrong
 *    module, a copy, a stale re-export) even when the value happens to have
 *    the right `typeof`.
 *  - A single exhaustive name-list assertion additionally guards against the
 *    barrel's public surface silently gaining or losing exports.
 */
import { describe, expect, it } from "vitest";
import * as Shared from "./index";

import * as ApiClientModule from "./api/client";
import * as LocalizationModule from "./api/localization";
import * as AuthApiModule from "./api/auth";
import * as ErrorsModule from "./api/errors";
import * as UserProfileModule from "./api/user-profile";
import * as QrLoginModule from "./api/qr-login";
import * as HrmsModule from "./api/hrms";
import * as BoundaryApiModule from "./api/boundary";
import * as FacilityApiModule from "./api/facility";
import * as MdmsModule from "./api/mdms";
import * as GlobalConfigModule from "./config/global-config";
import * as RoutesModule from "./config/routes";
import * as QueryClientModule from "./query/query-client";
import * as QueryProviderModule from "./query/provider";
import * as UseBoundaryModule from "./hooks/use-boundary";
import * as UseFacilityModule from "./hooks/use-facility";
import * as UseLanguagesModule from "./hooks/use-languages";
import * as UseLoginBannerImagesModule from "./hooks/use-login-banner-images";
import * as AuthStoreModule from "./stores/auth-store";
import * as JurisdictionStoreModule from "./stores/jurisdiction-store";
import * as LocaleStoreModule from "./stores/locale-store";
import * as UiStoreModule from "./stores/ui-store";
import * as I18nProviderModule from "./i18n/provider";
import * as I18nIndexModule from "./i18n";
import * as UseTranslateModule from "./i18n/useTranslate";
import * as UseModuleI18nModule from "./i18n/useModuleI18n";
import * as TranslateOrModule from "./i18n/translate-or";
import * as LocalePersistenceModule from "./i18n/locale-persistence";
import * as ModuleCacheModule from "./i18n/module-cache";
import * as LocaleUtilsModule from "./i18n/locale-utils";
import * as BoundaryUtilModule from "./utils/boundary-util";
import * as EmployeeSessionModule from "./utils/employee-session";

// The complete list of runtime (non type-only) names the barrel is expected
// to expose, in the order they appear in index.ts. `ModuleDefinition` and
// `NavItem` (from ./modules/types) are deliberately absent: they're exported
// via `export type { ... }`, which is erased by the compiler and has no
// runtime binding to assert on.
const expectedExportNames = [
  "apiClient",
  "fetchLocalization",
  "messagesToResourceMap",
  "loginUser",
  "logoutUser",
  "sendPasswordResetOtp",
  "resetPasswordWithOtp",
  "extractApiErrorMessage",
  "searchCurrentUser",
  "updateUserProfile",
  "changePasswordInSession",
  "resolveQrLogin",
  "searchHrmsEmployee",
  "fetchBoundaryRelations",
  "fetchFacilities",
  "fetchMdmsMasters",
  "fetchLanguages",
  "fetchLoginBannerImages",
  "contextPath",
  "getConfig",
  "getConfigString",
  "isGlobalConfigLoaded",
  "tenantId",
  "employeeHomePath",
  "employeeLoginPath",
  "employeeForgotPasswordPath",
  "employeeChangePasswordPath",
  "employeeProfilePath",
  "employeeProfileChangePasswordPath",
  "queryClient",
  "QueryProvider",
  "useBoundary",
  "useFacility",
  "useLanguages",
  "useLoginBannerImages",
  "useAuthStore",
  "useJurisdictionStore",
  "useLocaleStore",
  "useUiStore",
  "I18nProvider",
  "initI18n",
  "loadModules",
  "reloadModule",
  "setLocale",
  "i18n",
  "useTranslate",
  "useModuleI18n",
  "translateOr",
  "persistActiveLocale",
  "readActiveLocale",
  "getAllKnownModules",
  "getLoadedModulesForLocale",
  "markModuleLoaded",
  "readModulePayload",
  "removeModuleFromLocale",
  "writeModulePayload",
  "convertToLocale",
  "convertToLocaleData",
  "getCityLocale",
  "getDefaultLanguage",
  "getDefaultLocalizationModules",
  "getLocalityCode",
  "getLocaleDefault",
  "getLocaleRegion",
  "getMohallaLocale",
  "getRevenueLocalityCode",
  "getTransformedLocale",
  "normalizeLocale",
  "namespaceToDigitModule",
  "sortDropdownNames",
  "toTenantLocale",
  "aggregateBoundaryCodes",
  "aggregateBoundaryTypes",
  "buildJurisdictionBoundaries",
  "assertEmployeeRolesAllowed",
  "filterRolesForEmployeeTenant",
  "hydrateEmployeeJurisdictions",
];

// The barrel's full public surface: every value it re-exports, with the
// expected `typeof` for each. This drives both the exhaustive name-list
// check and the per-group reference-equality checks below.
describe("shared barrel export surface (src/shared/index.ts)", () => {
  it("exposes exactly the expected 77 named runtime exports, no more and no fewer", () => {
    // This is the single check that would fail if a future edit to index.ts
    // forgets to re-export a newly added module member, or accidentally
    // removes/renames one that consumers (`@/shared`) depend on.
    expect(Object.keys(Shared).sort()).toEqual([...expectedExportNames].sort());
  });
});

// ./api/client re-exports the shared axios instance every API module posts
// through; it attaches an auth/tenant request interceptor at module-load
// time. Consumers rely on `Shared.apiClient` being the exact same instance
// api/*.ts modules call, not a separate axios.create() copy.
describe("api/client re-export", () => {
  it("re-exports the same axios instance the client module creates", () => {
    expect(Shared.apiClient).toBe(ApiClientModule.apiClient);
    expect(typeof Shared.apiClient).toBe("function");
  });
});

// ./api/localization exposes the localization-fetch function and the
// messages->resource-map reducer used to prime i18next resources.
describe("api/localization re-exports", () => {
  it("re-exports fetchLocalization and messagesToResourceMap unchanged", () => {
    expect(Shared.fetchLocalization).toBe(LocalizationModule.fetchLocalization);
    expect(Shared.messagesToResourceMap).toBe(LocalizationModule.messagesToResourceMap);
    expect(typeof Shared.fetchLocalization).toBe("function");
    expect(typeof Shared.messagesToResourceMap).toBe("function");
  });
});

// ./api/auth exposes the four employee-session lifecycle calls: login,
// logout, and the two password-reset-OTP steps.
describe("api/auth re-exports", () => {
  it("re-exports loginUser, logoutUser, sendPasswordResetOtp, resetPasswordWithOtp unchanged", () => {
    expect(Shared.loginUser).toBe(AuthApiModule.loginUser);
    expect(Shared.logoutUser).toBe(AuthApiModule.logoutUser);
    expect(Shared.sendPasswordResetOtp).toBe(AuthApiModule.sendPasswordResetOtp);
    expect(Shared.resetPasswordWithOtp).toBe(AuthApiModule.resetPasswordWithOtp);
    for (const fn of [
      Shared.loginUser,
      Shared.logoutUser,
      Shared.sendPasswordResetOtp,
      Shared.resetPasswordWithOtp,
    ]) {
      expect(typeof fn).toBe("function");
    }
  });
});

// ./api/errors exposes the single helper that pulls a human-readable message
// out of the several incompatible error-body shapes the backend can return.
describe("api/errors re-export", () => {
  it("re-exports extractApiErrorMessage unchanged", () => {
    expect(Shared.extractApiErrorMessage).toBe(ErrorsModule.extractApiErrorMessage);
    expect(typeof Shared.extractApiErrorMessage).toBe("function");
  });
});

// ./api/user-profile exposes the current-user search/update/change-password
// calls used by the profile screens.
describe("api/user-profile re-exports", () => {
  it("re-exports searchCurrentUser, updateUserProfile, changePasswordInSession unchanged", () => {
    expect(Shared.searchCurrentUser).toBe(UserProfileModule.searchCurrentUser);
    expect(Shared.updateUserProfile).toBe(UserProfileModule.updateUserProfile);
    expect(Shared.changePasswordInSession).toBe(UserProfileModule.changePasswordInSession);
  });
});

// ./api/qr-login exposes the QR-scan-to-employee resolver used by the QR
// login flow.
describe("api/qr-login re-export", () => {
  it("re-exports resolveQrLogin unchanged", () => {
    expect(Shared.resolveQrLogin).toBe(QrLoginModule.resolveQrLogin);
    expect(typeof Shared.resolveQrLogin).toBe("function");
  });
});

// ./api/hrms exposes the HRMS employee-by-code search used to hydrate
// jurisdiction data after login.
describe("api/hrms re-export", () => {
  it("re-exports searchHrmsEmployee unchanged", () => {
    expect(Shared.searchHrmsEmployee).toBe(HrmsModule.searchHrmsEmployee);
    expect(typeof Shared.searchHrmsEmployee).toBe("function");
  });
});

// ./api/boundary exposes the boundary-relations fetch used to resolve
// state/district/block/facility hierarchies.
describe("api/boundary re-export", () => {
  it("re-exports fetchBoundaryRelations unchanged", () => {
    expect(Shared.fetchBoundaryRelations).toBe(BoundaryApiModule.fetchBoundaryRelations);
    expect(typeof Shared.fetchBoundaryRelations).toBe("function");
  });
});

// ./api/facility exposes the facility bulk-search used by the facility hook.
describe("api/facility re-export", () => {
  it("re-exports fetchFacilities unchanged", () => {
    expect(Shared.fetchFacilities).toBe(FacilityApiModule.fetchFacilities);
    expect(typeof Shared.fetchFacilities).toBe("function");
  });
});

// ./api/mdms exposes the three MDMS master-data fetchers: generic masters,
// supported languages, and login banner images.
describe("api/mdms re-exports", () => {
  it("re-exports fetchMdmsMasters, fetchLanguages, fetchLoginBannerImages unchanged", () => {
    expect(Shared.fetchMdmsMasters).toBe(MdmsModule.fetchMdmsMasters);
    expect(Shared.fetchLanguages).toBe(MdmsModule.fetchLanguages);
    expect(Shared.fetchLoginBannerImages).toBe(MdmsModule.fetchLoginBannerImages);
  });
});

// ./config/global-config exposes the window.globalConfigs reader and the
// tenant/context-path helpers derived from it; these expect
// `window.globalConfigs` to be set (src/test/setup.ts stubs a default so
// they don't crash when unset).
describe("config/global-config re-exports", () => {
  it("re-exports contextPath, getConfig, getConfigString, isGlobalConfigLoaded, tenantId unchanged", () => {
    expect(Shared.contextPath).toBe(GlobalConfigModule.contextPath);
    expect(Shared.getConfig).toBe(GlobalConfigModule.getConfig);
    expect(Shared.getConfigString).toBe(GlobalConfigModule.getConfigString);
    expect(Shared.isGlobalConfigLoaded).toBe(GlobalConfigModule.isGlobalConfigLoaded);
    expect(Shared.tenantId).toBe(GlobalConfigModule.tenantId);
  });

  it("still behaves correctly when invoked through the barrel path (contextPath falls back to the CONTEXT_PATH default)", () => {
    // window.globalConfigs.getConfig() returns undefined by default (per
    // src/test/setup.ts), so contextPath() should fall through to its
    // hard-coded "livelihood-ui" fallback. This confirms the barrel alias
    // isn't just reference-equal but actually wired to a working function.
    expect(Shared.contextPath()).toBe("livelihood-ui");
  });
});

// ./config/routes exposes the six employee-area path builders, all derived
// from contextPath().
describe("config/routes re-exports", () => {
  it("re-exports all six employee path builders unchanged", () => {
    expect(Shared.employeeHomePath).toBe(RoutesModule.employeeHomePath);
    expect(Shared.employeeLoginPath).toBe(RoutesModule.employeeLoginPath);
    expect(Shared.employeeForgotPasswordPath).toBe(RoutesModule.employeeForgotPasswordPath);
    expect(Shared.employeeChangePasswordPath).toBe(RoutesModule.employeeChangePasswordPath);
    expect(Shared.employeeProfilePath).toBe(RoutesModule.employeeProfilePath);
    expect(Shared.employeeProfileChangePasswordPath).toBe(
      RoutesModule.employeeProfileChangePasswordPath,
    );
  });
});

// ./query/query-client exposes the singleton QueryClient every part of the
// app shares; ./query/provider exposes the provider component that wraps
// children with it.
describe("query re-exports", () => {
  it("re-exports the same QueryClient singleton and QueryProvider component", () => {
    expect(Shared.queryClient).toBe(QueryClientModule.queryClient);
    expect(Shared.QueryProvider).toBe(QueryProviderModule.QueryProvider);
    expect(typeof Shared.queryClient).toBe("object");
    expect(typeof Shared.QueryProvider).toBe("function");
  });
});

// ./hooks/* expose the four data-fetching hooks (boundary, facility,
// languages, login-banner-images), each backed by useQuery + an auth-store
// read.
describe("hooks re-exports", () => {
  it("re-exports useBoundary, useFacility, useLanguages, useLoginBannerImages unchanged", () => {
    expect(Shared.useBoundary).toBe(UseBoundaryModule.useBoundary);
    expect(Shared.useFacility).toBe(UseFacilityModule.useFacility);
    expect(Shared.useLanguages).toBe(UseLanguagesModule.useLanguages);
    expect(Shared.useLoginBannerImages).toBe(UseLoginBannerImagesModule.useLoginBannerImages);
    for (const hook of [
      Shared.useBoundary,
      Shared.useFacility,
      Shared.useLanguages,
      Shared.useLoginBannerImages,
    ]) {
      expect(typeof hook).toBe("function");
    }
  });
});

// ./stores/* expose the four Zustand store hooks: auth (persisted session),
// jurisdiction (persisted boundaries/HRMS user), locale (current UI
// language), and UI (sidebar open state).
describe("stores re-exports", () => {
  it("re-exports useAuthStore, useJurisdictionStore, useLocaleStore, useUiStore unchanged", () => {
    expect(Shared.useAuthStore).toBe(AuthStoreModule.useAuthStore);
    expect(Shared.useJurisdictionStore).toBe(JurisdictionStoreModule.useJurisdictionStore);
    expect(Shared.useLocaleStore).toBe(LocaleStoreModule.useLocaleStore);
    expect(Shared.useUiStore).toBe(UiStoreModule.useUiStore);
  });

  it("still behaves correctly when invoked through the barrel path (getState reads the live store)", () => {
    // A Zustand store hook doubles as an object with getState/setState
    // attached to the function itself; calling through the barrel alias
    // should read/write the exact same underlying store as the direct
    // import, proving this isn't a disconnected copy.
    const initialOpen = UiStoreModule.useUiStore.getState().sidebarOpen;
    Shared.useUiStore.getState().toggleSidebar();
    expect(UiStoreModule.useUiStore.getState().sidebarOpen).toBe(!initialOpen);
    // restore, since useUiStore isn't reset between test files
    Shared.useUiStore.getState().setSidebarOpen(initialOpen);
  });
});

// ./i18n/provider exposes the top-level I18nProvider component; ./i18n
// exposes the init/module-loading/locale-switching functions plus the
// shared i18next singleton instance itself.
describe("i18n core re-exports", () => {
  it("re-exports I18nProvider, initI18n, loadModules, reloadModule, setLocale, i18n unchanged", () => {
    expect(Shared.I18nProvider).toBe(I18nProviderModule.I18nProvider);
    expect(Shared.initI18n).toBe(I18nIndexModule.initI18n);
    expect(Shared.loadModules).toBe(I18nIndexModule.loadModules);
    expect(Shared.reloadModule).toBe(I18nIndexModule.reloadModule);
    expect(Shared.setLocale).toBe(I18nIndexModule.setLocale);
    expect(Shared.i18n).toBe(I18nIndexModule.i18n);
    expect(typeof Shared.I18nProvider).toBe("function");
    expect(typeof Shared.i18n).toBe("object");
  });
});

// ./i18n/useTranslate wraps react-i18next's useTranslation with locale-aware
// helpers; ./i18n/useModuleI18n lazily loads one module's translations on
// mount; ./i18n/translate-or falls back to a default when a key is missing.
describe("i18n hook/helper re-exports", () => {
  it("re-exports useTranslate, useModuleI18n, translateOr unchanged", () => {
    expect(Shared.useTranslate).toBe(UseTranslateModule.useTranslate);
    expect(Shared.useModuleI18n).toBe(UseModuleI18nModule.useModuleI18n);
    expect(Shared.translateOr).toBe(TranslateOrModule.translateOr);
  });
});

// ./i18n/locale-persistence exposes the localStorage read/write pair backing
// the "which locale is active" setting.
describe("i18n locale-persistence re-exports", () => {
  it("re-exports persistActiveLocale, readActiveLocale unchanged", () => {
    expect(Shared.persistActiveLocale).toBe(LocalePersistenceModule.persistActiveLocale);
    expect(Shared.readActiveLocale).toBe(LocalePersistenceModule.readActiveLocale);
  });
});

// ./i18n/module-cache exposes the localStorage-backed bookkeeping for which
// translation modules have been loaded per locale, and their raw payloads.
describe("i18n module-cache re-exports", () => {
  it("re-exports all six module-cache functions unchanged", () => {
    expect(Shared.getAllKnownModules).toBe(ModuleCacheModule.getAllKnownModules);
    expect(Shared.getLoadedModulesForLocale).toBe(ModuleCacheModule.getLoadedModulesForLocale);
    expect(Shared.markModuleLoaded).toBe(ModuleCacheModule.markModuleLoaded);
    expect(Shared.readModulePayload).toBe(ModuleCacheModule.readModulePayload);
    expect(Shared.removeModuleFromLocale).toBe(ModuleCacheModule.removeModuleFromLocale);
    expect(Shared.writeModulePayload).toBe(ModuleCacheModule.writeModulePayload);
  });
});

// ./i18n/locale-utils exposes locale-code formatting/parsing helpers used
// throughout translation and dropdown-sorting logic.
describe("i18n locale-utils re-exports", () => {
  it("re-exports all fifteen locale-utils functions unchanged", () => {
    expect(Shared.convertToLocale).toBe(LocaleUtilsModule.convertToLocale);
    expect(Shared.convertToLocaleData).toBe(LocaleUtilsModule.convertToLocaleData);
    expect(Shared.getCityLocale).toBe(LocaleUtilsModule.getCityLocale);
    expect(Shared.getDefaultLanguage).toBe(LocaleUtilsModule.getDefaultLanguage);
    expect(Shared.getDefaultLocalizationModules).toBe(
      LocaleUtilsModule.getDefaultLocalizationModules,
    );
    expect(Shared.getLocalityCode).toBe(LocaleUtilsModule.getLocalityCode);
    expect(Shared.getLocaleDefault).toBe(LocaleUtilsModule.getLocaleDefault);
    expect(Shared.getLocaleRegion).toBe(LocaleUtilsModule.getLocaleRegion);
    expect(Shared.getMohallaLocale).toBe(LocaleUtilsModule.getMohallaLocale);
    expect(Shared.getRevenueLocalityCode).toBe(LocaleUtilsModule.getRevenueLocalityCode);
    expect(Shared.getTransformedLocale).toBe(LocaleUtilsModule.getTransformedLocale);
    expect(Shared.normalizeLocale).toBe(LocaleUtilsModule.normalizeLocale);
    expect(Shared.namespaceToDigitModule).toBe(LocaleUtilsModule.namespaceToDigitModule);
    expect(Shared.sortDropdownNames).toBe(LocaleUtilsModule.sortDropdownNames);
    expect(Shared.toTenantLocale).toBe(LocaleUtilsModule.toTenantLocale);
  });

  it("still behaves correctly when invoked through the barrel path (toTenantLocale dot->underscore + uppercase)", () => {
    // toTenantLocale replaces "." with "_" and upper-cases — a well-known,
    // cheap-to-assert business rule that confirms the barrel alias resolves
    // to a live, correctly-behaving function rather than merely existing.
    expect(Shared.toTenantLocale("pb.amritsar")).toBe("PB_AMRITSAR");
  });
});

// ./utils/boundary-util exposes pure helpers for aggregating and building
// jurisdiction-boundary maps (boundaryType -> codes) from an HRMS employee's
// jurisdiction list.
describe("utils/boundary-util re-exports", () => {
  it("re-exports aggregateBoundaryCodes, aggregateBoundaryTypes, buildJurisdictionBoundaries unchanged", () => {
    expect(Shared.aggregateBoundaryCodes).toBe(BoundaryUtilModule.aggregateBoundaryCodes);
    expect(Shared.aggregateBoundaryTypes).toBe(BoundaryUtilModule.aggregateBoundaryTypes);
    expect(Shared.buildJurisdictionBoundaries).toBe(BoundaryUtilModule.buildJurisdictionBoundaries);
  });
});

// ./utils/employee-session exposes the post-login pipeline helpers: role
// filtering by tenant, a blocked-role guard that expects
// getConfig("INVALIDROLES") to be an array to have any effect, and the HRMS
// jurisdiction-hydration orchestrator.
describe("utils/employee-session re-exports", () => {
  it("re-exports assertEmployeeRolesAllowed, filterRolesForEmployeeTenant, hydrateEmployeeJurisdictions unchanged", () => {
    expect(Shared.assertEmployeeRolesAllowed).toBe(EmployeeSessionModule.assertEmployeeRolesAllowed);
    expect(Shared.filterRolesForEmployeeTenant).toBe(
      EmployeeSessionModule.filterRolesForEmployeeTenant,
    );
    expect(Shared.hydrateEmployeeJurisdictions).toBe(
      EmployeeSessionModule.hydrateEmployeeJurisdictions,
    );
  });
});
