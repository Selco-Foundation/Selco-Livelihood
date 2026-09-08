import '../data/network_manager.dart';
import 'i18_key_constants.dart' as i18;

/// Maps a caught error to an i18 key (not resolved text — callers translate
/// via `context.translate(...)` or `AppLocalizations.translateCached(...)`).
/// Shared by anything that surfaces a network/server failure to the user, so
/// the wording stays consistent instead of every call site inventing its own
/// message.
String i18KeyForNetworkError(Object err) {
  final code = err is AppNetworkException ? err.code : null;
  switch (code) {
    case LoginErrorCode.noNetwork:
      return i18.login.errorNoNetwork;
    case LoginErrorCode.noInternet:
      return i18.login.errorNoInternet;
    case LoginErrorCode.connectionFailed:
      return i18.login.errorConnectionFailed;
    case LoginErrorCode.requestTimeout:
      return i18.login.errorRequestTimeout;
    case LoginErrorCode.serverError:
      return i18.login.errorServer;
    case LoginErrorCode.invalidCredentials:
      return i18.login.errorInvalidCredentials;
    case LoginErrorCode.unknown:
    default:
      return i18.common.somethingWentWrong;
  }
}
