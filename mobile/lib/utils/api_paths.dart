/// Central home for every backend endpoint path this app calls, relative to
/// `envConfig.variables.baseUrl`. Unlike E4H (which scatters endpoint path
/// literals across individual repository files), this app keeps them here so
/// there is exactly one place to look when an endpoint changes.
abstract final class ApiPaths {
  static const oauthToken = 'user/oauth/token';
  static const reportLogin = 'im-services/user/login/_report';
  static const localizationSearch = 'localization/messages/v1/_search';
}
