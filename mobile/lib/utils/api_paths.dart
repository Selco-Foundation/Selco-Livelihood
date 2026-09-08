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
  static const assetSearch = 'asset-registry/v1/asset/_search';
  static const fileStoreFile = 'filestore/v1/files/file';
}
