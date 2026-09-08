import 'package:flutter/material.dart';

import '../../blocs/localization/app_localization.dart';
import '../../data/network_manager.dart';
import '../../utils/error_i18n.dart';
import '../../utils/i18_key_constants.dart' as i18;

/// Single, uniform place to surface an error to the user as a SnackBar,
/// instead of every page/bloc/interceptor rolling its own
/// `ScaffoldMessenger.of(context)` call with its own styling and wording.
///
/// Resolution goes through `AppLocalizations.translateCached(...)`, which
/// works without a `BuildContext` — required for [showSessionExpired], the
/// one caller (the Dio session-expiry hook) that has no context at all.
abstract final class AppErrorNotifier {
  static final messengerKey = GlobalKey<ScaffoldMessengerState>();

  static void show(String translatedMessage) {
    messengerKey.currentState
      ?..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(translatedMessage)));
  }

  static void showByCode(LoginErrorCode code) {
    show(AppLocalizations.translateCached(
      i18KeyForNetworkError(AppNetworkException(code)),
    ));
  }

  static void showSessionExpired() {
    show(AppLocalizations.translateCached(i18.common.sessionExpired));
  }
}
