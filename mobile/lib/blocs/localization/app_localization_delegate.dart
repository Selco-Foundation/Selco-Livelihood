import 'package:flutter/material.dart';
import 'package:isar/isar.dart';

import '../../model/appconfig/mdmsResponse.dart';
import 'app_localization.dart';

//the aim here is to override methods that are defined by default in the localizations delegate file
class AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  final AppConfig? appConfig;
  final Isar isar;

  const AppLocalizationsDelegate(this.appConfig, this.isar);

  //check from configuration if the language is supported in the app
  @override
  bool isSupported(Locale locale) {
    return (appConfig!.appConfig?[0].languages)!.map((e) {
      final results = e.value.split('_');
      if (results.isNotEmpty) return results.first;
      return null;
    }).contains(locale.languageCode);
  }

  @override
  bool shouldReload(covariant LocalizationsDelegate<AppLocalizations> old) =>
      true;

  //load localizations from storage
  @override
  Future<AppLocalizations> load(Locale locale) async {
    AppLocalizations appLocalizations = AppLocalizations(locale, isar);
    await appLocalizations.load();
    return appLocalizations;
  }
}

/// Test-only counterpart to [AppLocalizationsDelegate] — needs no
/// [AppConfig]/[Isar], since widget tests seed translations directly via
/// `AppLocalizations.debugSeedLocalizations` rather than fetching/caching
/// them. Lets `LivelihoodApp`'s lightweight (no-`isar`) shell still register
/// a working `AppLocalizations` delegate so `context.translate()` resolves
/// real text instead of falling back to the raw key.
class DebugAppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const DebugAppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => true;

  @override
  bool shouldReload(covariant LocalizationsDelegate<AppLocalizations> old) =>
      true;

  @override
  Future<AppLocalizations> load(Locale locale) async {
    return AppLocalizations(locale, null);
  }
}
