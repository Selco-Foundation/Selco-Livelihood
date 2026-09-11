/// Central home for every backend endpoint path this app calls, relative to
/// `envConfig.variables.baseUrl`. Unlike E4H (which scatters endpoint path
/// literals across individual repository files), this app keeps them here so
/// there is exactly one place to look when an endpoint changes.
abstract final class ApiPaths {
  static const oauthToken = 'user/oauth/token';
  static const reportLogin = 'im-services/user/login/_report';
  static const localizationSearch = 'localization/messages/v1/_search';
  static const mdmsV1Search = 'egov-mdms-service/v1/_search';
  static const activitySearch = 'activity/v1/activities/_search';
  static const bomSearch = 'activity/v1/bom/_search';
  static const bomCreate = 'activity/v1/bom/_create';
  static const bomUpdate = 'activity/v1/bom/_update';
  static const assetSearch = 'asset-registry/v1/asset/_search';
  static const assetCreate = 'asset-registry/v1/asset/_create';
  static const assetUpdate = 'asset-registry/v1/asset/_update';
  static const fileStoreFile = 'filestore/v1/files/file';
  static const fileStoreUpload = 'filestore/v1/files';
  static const workflowUpdate = 'activity/v1/activities/workflow/update';
  static const otpGenerate = 'activity/v1/activities/_generate-otp';
  static const otpValidate = 'activity/v1/activities/_validate-otp';
  static const otpResend = 'activity/v1/activities/_resend-otp';
  static const vendorOrgUserSearch = 'vendor/organisation/v1/user/_search';
}
