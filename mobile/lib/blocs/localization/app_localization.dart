import 'package:flutter/material.dart';
import 'package:isar/isar.dart';

import '../../data/nosql/localization.dart';
import '../../model/appconfig/mdmsResponse.dart';
import '../../model/localization/localizationModel.dart';
import 'app_localization_delegate.dart';

class AppLocalizations {
  final Locale locale;

  /// Null in the test-only path (`debugSeedLocalizations` populates
  /// `_localizedStrings` directly instead of via Isar) — `translate()` never
  /// touches this field, only `load()` does.
  final Isar? isar;

  AppLocalizations(this.locale, this.isar);

  /// Nullable on purpose: unlike E4H (where every screen is always reached
  /// through the fully-bootstrapped app shell), this app's widget tests pump
  /// pages directly without registering the localization delegate. Returning
  /// null there — rather than force-unwrapping — lets `context.translate()`
  /// fall back to the raw key instead of crashing every such test.
  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static LocalizationModel? localizationModel;

  static final List<Localization> _localizedStrings = <Localization>[];

  static LocalizationsDelegate<AppLocalizations> getDelegate(
          AppConfig config, Isar isar) =>
      AppLocalizationsDelegate(config, isar);

  Future<bool> load() async {
    final isar = this.isar;
    if (isar == null) return false;

    _localizedStrings.clear();
    final List<LocalizationWrapper> localizationList = await isar
        .localizationWrappers
        .filter()
        .localeEqualTo('${locale.languageCode}_${locale.countryCode}')
        .findAll();

    if (localizationList.isNotEmpty) {
      _localizedStrings.addAll(localizationList.first.localization!);
      return true;
    }

    return false;
  }

  /// Test-only seam: seeds the shared translation cache directly, bypassing
  /// Isar entirely, so widget tests can render real message text (matching
  /// production) instead of the raw-key fallback — without needing a real
  /// Isar instance or a network fetch. Tests should clear it again via
  /// `addTearDown`.
  @visibleForTesting
  static void debugSeedLocalizations(List<Localization> localizations) {
    _localizedStrings
      ..clear()
      ..addAll(localizations);
  }

  String translate(String localizedValues) => translateCached(localizedValues);

  /// The cache `_localizedStrings` is process-wide (not scoped to a locale
  /// or an `AppLocalizations` instance — an existing E4H design quirk this
  /// keeps rather than changes), so it can be read directly without an
  /// ambient `Localizations`/`AppLocalizations` delegate at all. Used as the
  /// fallback in `context.translate()` for widgets/tests reached outside the
  /// full app shell (e.g. a bare `MaterialApp` in a widget test).
  static String translateCached(String localizedValues) {
    if (_localizedStrings.isEmpty) {
      return localizedValues;
    } else {
      final index = _localizedStrings.indexWhere(
        (medium) => medium.code == localizedValues,
      );

      return index != -1 ? _localizedStrings[index].message : localizedValues;
    }
  }
}
