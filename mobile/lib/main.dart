import 'package:digit_ui_components/digit_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:isar/isar.dart';

import 'blocs/app_init/app_init.dart';
import 'blocs/localization/app_localization.dart';
import 'blocs/localization/app_localization_delegate.dart';
import 'blocs/localization/localization.dart';
import 'data/app_shared_preferences.dart';
import 'model/appconfig/mdmsResponse.dart';
import 'router/app_router.dart';
import 'utils/constants.dart';
import 'utils/envConfig.dart';
import 'utils/intl_locale.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await envConfig.initialize();
  final isar = await Constants().isar;

  await AppSharedPreferences().init();
  if (AppSharedPreferences().isFirstLaunch) {
    await AppSharedPreferences().appLaunchedFirstTime();
  }

  runApp(LivelihoodApp(isar: isar));
}

class LivelihoodApp extends StatefulWidget {
  const LivelihoodApp({super.key, this.router, this.isar});

  final AppRouter? router;

  /// When supplied (as [main] does), the app boots through the same
  /// app-config/localization gate E4H uses. Left null (as existing widget
  /// tests do), the app renders the router shell directly without that gate.
  final Isar? isar;

  @override
  State<LivelihoodApp> createState() => _LivelihoodAppState();
}

class _LivelihoodAppState extends State<LivelihoodApp> {
  late final AppRouter _router = widget.router ?? AppRouter();

  @override
  Widget build(BuildContext context) {
    final isar = widget.isar;
    if (isar == null) {
      return _buildShell(context);
    }

    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (context) =>
              AppInitialization()..add(const InitEvent.onLaunch()),
        ),
      ],
      child: BlocBuilder<AppInitialization, InitState>(
        builder: (context, state) {
          final cachedAppConfig =
              context.read<AppInitialization>().cachedAppConfig;

          return state.maybeWhen(
            orElse: () => const _LoadingApp(),
            defaulted: (appConfig) => _buildShell(
              context,
              isar: isar,
              appConfig: appConfig,
            ),
            error: (_) => cachedAppConfig != null
                ? _buildShell(context, isar: isar, appConfig: cachedAppConfig)
                : const _LoadingApp(),
          );
        },
      ),
    );
  }

  Widget _buildShell(
    BuildContext context, {
    Isar? isar,
    MdmsResponseModel? appConfig,
  }) {
    if (isar == null || appConfig == null) {
      return MaterialApp.router(
        title: 'Livelihood',
        debugShowCheckedModeBanner: false,
        theme: DigitTheme.instance.mobileTheme,
        routerConfig: _router.config(),
        localizationsDelegates: const [
          DebugAppLocalizationsDelegate(),
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
        ],
      );
    }

    final languages = appConfig.appConfig?.appConfig?.isNotEmpty == true
        ? appConfig.appConfig!.appConfig![0].languages
        : null;
    final initialModuleList = appConfig.appConfig?.appConfig?.isNotEmpty == true
        ? appConfig.appConfig!.appConfig![0].backendInterface
        : null;
    final firstLanguage = (languages != null && languages.isNotEmpty)
        ? languages.last.value
        : null;

    return BlocProvider(
      create: (context) => LocalizationBloc(isar)
        ..add(LocalizationEvent.onSelect(
          locale: firstLanguage,
          moduleList: initialModuleList,
        )),
      child: BlocBuilder<LocalizationBloc, LocalizationState>(
        builder: (context, state) {
          final selectedLocale =
              AppSharedPreferences().getSelectedLocale ?? firstLanguage;
          syncIntlDefaultLocale(selectedLocale);

          final resolvedLocale =
              (selectedLocale != null && selectedLocale.isNotEmpty)
                  ? Locale(
                      selectedLocale.split('_').first,
                      selectedLocale.split('_').last,
                    )
                  : const Locale('en');

          return MaterialApp.router(
            title: 'Livelihood',
            debugShowCheckedModeBanner: false,
            theme: DigitTheme.instance.mobileTheme,
            routerConfig: _router.config(),
            supportedLocales: (languages != null && languages.isNotEmpty)
                ? languages.map((e) {
                    final results = e.value.split('_');
                    return results.isNotEmpty
                        ? Locale(results.first, results.last)
                        : resolvedLocale;
                  })
                : [resolvedLocale],
            localizationsDelegates: [
              AppLocalizations.getDelegate(appConfig.appConfig!, isar),
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
            ],
            locale: resolvedLocale,
          );
        },
      ),
    );
  }
}

class _LoadingApp extends StatelessWidget {
  const _LoadingApp();

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(body: Center(child: Text('loading...'))),
    );
  }
}
