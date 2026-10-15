export { apiClient } from "./api/client";
export { postSearch, searchUrlParams } from "./api/search";
export {
  fetchLocalization,
  messagesToResourceMap,
  upsertLocalization,
  type FetchLocalizationParams,
  type LocalizationMessage,
  type LocalizationResponse,
} from "./api/localization";
export {
  loginUser,
  logoutUser,
  sendPasswordResetOtp,
  resetPasswordWithOtp,
  type LoginPayload,
  type LoginResponse,
  type SendPasswordResetOtpPayload,
  type ResetPasswordWithOtpPayload,
} from "./api/auth";
export { extractApiErrorMessage } from "./api/errors";
export {
  searchCurrentUser,
  updateUserProfile,
  changePasswordInSession,
  type EmployeeProfile,
  type ChangePasswordInSessionPayload,
} from "./api/user-profile";
export {
  resolveQrLogin,
  type QrLoginResolveParams,
  type QrLoginResolveResponse,
} from "./api/qr-login";
export {
  searchHrmsEmployees,
  type HrmsEmployee,
  type HrmsEmployeeSearchCriteria,
  type HrmsEmployeeUser,
} from "./api/hrms";
export {
  fetchBoundaryRelations,
  type BoundaryHierarchy,
  type BoundaryNode,
} from "./api/boundary";
export { fetchFacilities, type FacilitySummary } from "./api/facility";
export {
  fetchFileUrls,
  type FileStoreUrlEntry,
  type FileStoreUrlResponse,
} from "./api/filestore";
export {
  fetchWorkflowBusinessService,
  type WorkflowBusinessServiceResponse,
  type WorkflowBusinessServiceState,
} from "./api/workflow";
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
export {
  employeeHomePath,
  employeeLoginPath,
  employeeForgotPasswordPath,
  employeeChangePasswordPath,
  employeeProfilePath,
  employeeProfileChangePasswordPath,
} from "./config/routes";
export { queryClient } from "./query/query-client";
export { QueryProvider } from "./query/provider";
export { useBoundary, useBoundaryHierarchy } from "./hooks/use-boundary";
export { useDebouncedValue } from "./hooks/use-debounced-value";
export { useFacility } from "./hooks/use-facility";
export { useLanguages } from "./hooks/use-languages";
export { useLoginBannerImages } from "./hooks/use-login-banner-images";
export {
  fetchInstallationImageCriteriaQuery,
  installationImageCriteriaQueryKey,
  useInstallationImageCriteria,
} from "./hooks/use-installation-image-criteria";
export {
  fetchRejectionReasonOptionsQuery,
  rejectionReasonOptionsQueryKey,
  useRejectionReasonOptions,
} from "./hooks/use-rejection-reason-options";
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
  filterRolesForEmployeeTenant,
  hydrateEmployeeJurisdictions,
} from "./utils/employee-session";
export {
  hasRole,
  hasAnyRole,
  isProjectManager,
  PROJECT_MANAGER_ROLE,
  type RoleLike,
} from "./utils/roles";
export {
  ACTIVITY_STATUS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_ORDER,
  activityStatusBadgeVariant,
  FACILITY_INSTALLATION_BUSINESS_SERVICE,
  type ActivityStatus,
  type ActivityStatusBadgeVariant,
} from "./utils/activity-review/activity-status";
export { componentTypeLabel } from "./utils/activity-review/component-type";
export {
  mapInstallationImageCriteria,
  type InstallationImageCriterion,
  type RawInstallationImageCriterion,
} from "./utils/activity-review/installation-image-mapping";
export {
  isOtherReason,
  mapRejectionReasonOptions,
  type RawRejectionReasonOption,
  type RejectionReasonOption,
} from "./utils/activity-review/rejection-reason-mapping";
export { formatEpochDate } from "./utils/activity-review/date-format";
export {
  classifyDocument,
  groupDocumentsByKey,
  INSTALLATION_IMAGE_PREFIX,
  REPORT_DOCUMENT_TYPES,
  type ClassifiedDocument,
} from "./utils/activity-review/facility-documents";
export {
  buildAssetSectionMedia,
  buildImageChecklistMedia,
  buildReportSectionMedia,
} from "./utils/activity-review/facility-media";
export {
  MACHINE_MEDIA_GROUPS,
  MACHINE_SECTION_IDS,
  REVIEW_SECTION_LABELS,
  SOLAR_SECTION_IDS,
  type MachineSectionId,
  type SolarSectionId,
} from "./utils/activity-review/review-sections";
export {
  ASSET_PHOTO_DOCUMENT_TYPE,
  buildMachineAssetData,
  buildSolarAssetSections,
  flattenAssetHierarchy,
  isResolvableAssetDocument,
  type AssetMappingDocument,
  type AssetMappingRow,
  type MachineAssetData,
} from "./utils/activity-review/asset-mapping";
export {
  buildAuditTrail,
  buildImageChecklistSections,
  buildMachineSection,
  buildReportSection,
  buildReviewSections,
  buildSectionDocuments,
  humanize,
  type ActivityBillOfMaterial,
  type ActivityBomComponent,
  type ActivityTransaction,
  type ActivityTransactionComment,
  type ActivityWorkflowEntry,
} from "./utils/activity-review/activity-workflow-mapping";
export type { ModuleDefinition, ModuleOverview, NavItem } from "./modules/types";
