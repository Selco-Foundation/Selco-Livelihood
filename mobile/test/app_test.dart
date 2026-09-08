import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:badges/badges.dart' as badges;
import 'package:digit_forms_engine/blocs/app_localization.dart'
    as forms_localization;
import 'package:digit_scanner/blocs/scanner.dart';
import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:digit_ui_components/widgets/molecules/panel_cards.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:livelihood/blocs/activity_facility_counts/activity_facility_counts.dart';
import 'package:livelihood/blocs/app_init/app_init.dart';
import 'package:livelihood/blocs/localization/app_localization.dart';
import 'package:livelihood/data/api_interceptors.dart';
import 'package:livelihood/data/network_manager.dart';
import 'package:livelihood/model/activity_facility/activity_facility.dart';
import 'package:livelihood/model/activity_facility_workflow/activity_facility_workflow.dart';
import 'package:livelihood/model/appconfig/mdmsResponse.dart';
import 'package:livelihood/model/mdms/asset_registry_response.dart';
import 'package:livelihood/model/mdms/common_masters.dart';
import 'package:livelihood/repositories/activity_facility_repo.dart';
import 'package:livelihood/repositories/app_init_repo.dart';
import 'package:livelihood/utils/workflow_status.dart';
import 'package:livelihood/utils/i18_key_constants.dart' as i18;
import 'package:livelihood/main.dart';
import 'package:livelihood/model/solar_installation_draft.dart';
import 'package:livelihood/pages/installation_report_home_page.dart';
import 'package:livelihood/pages/installation_report_list_pages.dart';
import 'package:livelihood/pages/home_page.dart';
import 'package:livelihood/pages/login_page.dart';
import 'package:livelihood/pages/machine_form.dart';
import 'package:livelihood/pages/machine_report_success_page.dart';
import 'package:livelihood/pages/add_new_asset.dart';
import 'package:livelihood/pages/asset_summary.dart';
import 'package:livelihood/pages/digit_scanner_page.dart';
import 'package:livelihood/pages/installation_images.dart';
import 'package:livelihood/pages/media_upload.dart';
import 'package:livelihood/pages/overall_asset_summary.dart'
    show OverallAssetSummaryPage;
import 'package:livelihood/model/login/loginModel.dart';
import 'package:livelihood/model/response/responsemodel.dart';
import 'package:livelihood/repositories/auth_repo.dart';
import 'package:livelihood/router/app_router.dart';
import 'package:livelihood/utils/envConfig.dart';
import 'package:livelihood/widgets/image_uploader.dart';
import 'package:livelihood/widgets/file_upload_widget.dart';
import 'package:livelihood/widgets/video_uploader.dart';
import 'package:livelihood/widgets/facility_report_card.dart';
import 'package:livelihood/widgets/facility_search_sort_card.dart';
import 'package:livelihood/widgets/home_help_header.dart';
import 'package:livelihood/widgets/home_item_card.dart';
import 'package:livelihood/widgets/livelihood_app_bar.dart';
import 'package:livelihood/widgets/machine_media_picker.dart';
import 'package:livelihood/widgets/navigation/drawer.dart';
import 'package:livelihood/widgets/otp_verification_widget.dart';
import 'package:livelihood/widgets/privacy_policy/policy_webview_dialog.dart';

class _StubAuthRepository implements AuthRepository {
  _StubAuthRepository(this._respond, {this.onLogout});

  final Future<ResponseModel> Function(LoginModel body) _respond;
  final VoidCallback? onLogout;

  @override
  Future<ResponseModel> validateLogin(LoginModel body) => _respond(body);

  @override
  Future<String> refreshToken() async => 'stub-access-token';

  @override
  Future<void> logout() async => onLogout?.call();

  @override
  Future<void> reportLogin(UserRequest user) async {}
}

ResponseModel _cannedLoginResponse({required bool approved}) {
  return ResponseModel(
    access_token: 'stub-access-token',
    token_type: 'bearer',
    refresh_token: 'stub-refresh-token',
    scope: 'read',
    userRequest: UserRequest(
      id: 183,
      uuid: '9e8934d3-a52e-4ac5-be8b-aab5011f851a',
      userName: 'demo.user',
      name: 'Field Staff',
      mobileNumber: '9900223344',
      emailId: 'field.staff@testvendor.example',
      type: 'EMPLOYEE',
      active: true,
      roles: approved
          ? const [
              Roles(
                name: 'Installation Report Part A Editor',
                code: 'INSTALLATION_REPORT_PART_A_EDITOR',
                tenantId: 'livelihood',
              ),
            ]
          : const [
              Roles(
                name: 'Employee',
                code: 'EMPLOYEE',
                tenantId: 'livelihood',
              ),
            ],
      tenantId: 'livelihood',
    ),
  );
}

class _StubAppInitRepo extends AppInitRepo {
  _StubAppInitRepo({required this.fetchAssetRegistry});

  final Future<AssetRegistryMdmsResponse> Function() fetchAssetRegistry;

  @override
  Future<MdmsResponseModel> searchAppConfiguration() async =>
      const MdmsResponseModel(appConfig: null);

  @override
  Future<AssetRegistryMdmsResponse> searchAssetRegistry() =>
      fetchAssetRegistry();
}

/// Deterministic, in-memory stand-in for the real `_search` endpoint — no
/// test exercises live Dio here (and never should: a real HTTP attempt
/// leaves a pending connect-timeout Timer that makes `pumpAndSettle` hang).
/// Supplies deterministic activity-facility responses and badge counts while
/// keeping widget tests independent of live network services.
class _StubActivityFacilityRemoteRepository
    extends ActivityFacilityRemoteRepository {
  _StubActivityFacilityRemoteRepository({
    List<ActivityFacilityWorkflow>? items,
    Map<String, int>? countsByStatus,
  })  : _items = items ?? _defaultItems,
        _countsByStatus = countsByStatus ?? _defaultCounts;

  final List<ActivityFacilityWorkflow> _items;
  final Map<String, int> _countsByStatus;

  static final _defaultItems = <ActivityFacilityWorkflow>[
    ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'activity-facility-solar-1',
        facilityId: 'facility-solar-1',
        status: FacilityInstallationStatus.assignedToFieldStaff,
        scheduledAt: DateTime(2026, 2, 23).millisecondsSinceEpoch,
        facility: const Facility(
          facilityName: 'Rajesh Kumar - Solar',
          boundaryCode: 'INDIA_MEGHALAYA_WESTKHASIHILLS_MAWTHADRAISHAN',
        ),
        additionalDetails: const ActivityFacilityAdditionalDetails(
          componentType: 'SOLAR',
        ),
      ),
    ),
    ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'activity-facility-machine-1',
        facilityId: 'facility-machine-1',
        status: FacilityInstallationStatus.assignedToFieldStaff,
        scheduledAt: DateTime(2026, 2, 12).millisecondsSinceEpoch,
        facility: const Facility(
          facilityName: 'Sunita Sharma - Sewing Machine',
          boundaryCode: 'INDIA_MEGHALAYA_WESTKHASIHILLS_MAWTHADRAISHAN',
        ),
        additionalDetails: const ActivityFacilityAdditionalDetails(
          componentType: 'MACHINE',
        ),
      ),
    ),
  ];

  static const _defaultCounts = <String, int>{
    FacilityInstallationStatus.assignedToFieldStaff: 48,
    FacilityInstallationStatus.submittedByFieldStaff: 12,
    FacilityInstallationStatus.rejectedByQcSpoc: 6,
    FacilityInstallationStatus.approvedByQcSpoc: 35,
  };

  @override
  Future<PaginatedActivityFacilities> searchByWorkflow({
    required ActivityFacilitySearchModel body,
    required List<String> workflowStatuses,
    int limit = 10,
    int offset = 0,
    String sortDirection = defaultSortDirection,
  }) async {
    final page = _items.skip(offset).take(limit).toList();
    return PaginatedActivityFacilities(items: page, totalCount: _items.length);
  }

  @override
  Future<int> searchByWorkflowCount({
    required ActivityFacilitySearchModel body,
    required List<String> workflowStatuses,
  }) async {
    return workflowStatuses.fold<int>(
      0,
      (sum, status) => sum + (_countsByStatus[status] ?? 0),
    );
  }
}

SolarInstallationDraft _filledSolarDraft(SolarWorkflowMode mode) {
  final draft = SolarInstallationDraft(
    workflow: _StubActivityFacilityRemoteRepository._defaultItems.first,
    mode: mode,
  )
    ..applicableTypes = List.of(SolarAssetType.values)
    ..bomFormNames.addAll(const [
      'RMS_ACC_OFF_GRID_SINGLE_PHASE_BOM_system',
      'RMS_COMMON_BOM_solar',
      'RMS_COMMON_BOM_rms',
      'RMS_COMMON_BOM_wiring',
      'RMS_COMMON_BOM_luminaries',
    ])
    ..installationRequirements = const [
      InstallationImageRequirement(
        code: 'SOLAR_ARRAY',
        description: 'Solar array',
        requiredCount: 1,
      ),
    ];
  for (final type in SolarAssetType.values) {
    draft.minimumCounts[type] = 1;
    draft.maximumCounts[type] = 10;
    draft.setCount(type, 1);
    final asset = draft.assets[type]!;
    asset.warrantyDuration = '5 Years';
    asset.assets.first
      ..serialNumber = '${type.name.toUpperCase()}-1'
      ..capacity = '1'
      ..supportingPhoto = SolarFileRef(
        name: '${type.name}.jpg',
        path: '/tmp/${type.name}.jpg',
        kind: SolarFileKind.image,
      );
    asset.images.add(SolarFileRef(
      name: '${type.name}-installation.jpg',
      path: '/tmp/${type.name}-installation.jpg',
      kind: SolarFileKind.image,
    ));
  }
  return draft;
}

const _secureStorageChannel =
    MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
final Map<String, String> _secureStorageValues = {};
String? _secureStorageReadFailureKey;
String? _secureStorageWriteFailureKey;

// General widget tests use the same compact missing-message fallback as the
// app. Translated messages are backend-owned; no bundled JSON fixture exists.
String tr(String code) => AppLocalizations.fallbackLabel(code);

void main() {
  setUp(() {
    _secureStorageValues.clear();
    _secureStorageReadFailureKey = null;
    _secureStorageWriteFailureKey = null;
    activityFacilityRepository = ActivityFacilityRepository(
      remote: _StubActivityFacilityRemoteRepository(),
    );
  });

  setUpAll(() async {
    await envConfig.initialize();

    // flutter_secure_storage has no platform implementation under
    // `flutter test` — SecureStore's token/accessInfo calls would otherwise
    // throw MissingPluginException. Fake it with an in-memory store.
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_secureStorageChannel, (call) async {
      final key = call.arguments['key'] as String?;
      switch (call.method) {
        case 'write':
          if (key == _secureStorageWriteFailureKey) {
            throw PlatformException(code: 'write-failed');
          }
          _secureStorageValues[key!] = call.arguments['value'] as String;
          return null;
        case 'read':
          if (key == _secureStorageReadFailureKey) {
            throw PlatformException(code: 'read-failed');
          }
          return _secureStorageValues[key];
        case 'delete':
          _secureStorageValues.remove(key);
          return null;
        case 'containsKey':
          return _secureStorageValues.containsKey(key);
        case 'readAll':
          return _secureStorageValues;
        case 'deleteAll':
          _secureStorageValues.clear();
          return null;
        default:
          return null;
      }
    });

    // path_provider has no platform implementation under `flutter test`
    // either — `Constants().isar`'s `getApplicationDocumentsDirectory()`
    // call would otherwise hang waiting on a channel response that never
    // arrives (rather than throwing), which is what made `pumpAndSettle`
    // time out before this was added. A plain temp directory is enough:
    // Isar itself still isn't initialized under the test VM, so every
    // Isar.open() call fails fast afterwards and callers fall back to their
    // "nothing cached" path — this mock only needs to stop the hang.
    final tempDir = Directory.systemTemp.createTempSync('isar_test');
    addTearDown(() => tempDir.deleteSync(recursive: true));
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (call) async => tempDir.path,
    );
  });

  TextSpan findTextSpan(TextSpan root, String text) {
    if (root.text == text) return root;
    for (final child in root.children ?? const <InlineSpan>[]) {
      if (child is TextSpan) {
        try {
          return findTextSpan(child, text);
        } on StateError {
          // Continue through sibling spans.
        }
      }
    }
    throw StateError('Text span not found: $text');
  }

  void setMobileViewport(WidgetTester tester, Size size) {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  Future<void> pumpLogin(
    WidgetTester tester, {
    Size size = const Size(390, 844),
  }) async {
    setMobileViewport(tester, size);
    final router = AppRouter();
    await tester.pumpWidget(LivelihoodApp(router: router));
    await tester.pumpAndSettle();
    await router.replaceAll(
      const [
        UnauthenticatedRouteWrapper(children: [LoginRoute()])
      ],
    );
    await tester.pumpAndSettle();
  }

  Future<AppRouter> pumpAuthenticatedRoute(
    WidgetTester tester,
    PageRouteInfo route,
  ) async {
    final router = AppRouter();
    await tester.pumpWidget(
      LivelihoodApp(key: UniqueKey(), router: router),
    );
    await tester.pumpAndSettle();
    final children = route.routeName == HomeRoute.name
        ? <PageRouteInfo>[route]
        : <PageRouteInfo>[const HomeRoute(), route];
    await router.replaceAll([
      AuthenticatedRouteWrapper(children: children),
    ]);
    await tester.pumpAndSettle();
    return router;
  }

  test('screen navigation uses typed AppRouter routes exclusively', () {
    final screenSources = Directory('lib')
        .listSync(recursive: true)
        .whereType<File>()
        .where((file) => file.path.endsWith('.dart'))
        .map((file) => file.readAsStringSync())
        .join('\n');

    expect(screenSources, isNot(contains('MaterialPageRoute')));
    expect(screenSources, isNot(contains('pushReplacement(')));
    expect(screenSources, isNot(contains('pushAndRemoveUntil(')));
  });

  testWidgets(
      'stored authenticated session shows Welcome, proceeding opens Home directly',
      (tester) async {
    setMobileViewport(tester, const Size(390, 844));
    final response = _cannedLoginResponse(approved: true);
    _secureStorageValues['accessToken'] = response.access_token;
    _secureStorageValues['accessInfo'] = jsonEncode(response.toJson());

    final router = AppRouter();
    await tester.pumpWidget(LivelihoodApp(router: router));
    await tester.pumpAndSettle();

    // Welcome is always the entry screen, even with a valid stored session —
    // it must not auto-redirect to Home.
    expect(find.byKey(const ValueKey('proceed-button')), findsOneWidget);
    expect(find.byType(HomePage), findsNothing);

    await tester.tap(find.byKey(const ValueKey('proceed-button')));
    await tester.pumpAndSettle();

    // Tapping Proceed with an existing session skips Login entirely.
    expect(find.byType(HomePage), findsOneWidget);
    expect(find.byKey(const ValueKey('home-menu-button')), findsOneWidget);
    expect(find.byType(LoginPage), findsNothing);
  });

  testWidgets('incomplete stored session remains on Welcome', (tester) async {
    final response = _cannedLoginResponse(approved: true).copyWith(
      refresh_token: null,
    );
    _secureStorageValues['accessToken'] = response.access_token;
    _secureStorageValues['accessInfo'] = jsonEncode(response.toJson());

    await tester.pumpWidget(const LivelihoodApp());
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('proceed-button')), findsOneWidget);
    expect(find.byType(HomePage), findsNothing);
  });

  testWidgets('welcome uses E4H DIGIT components and navigates to login', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(const LivelihoodApp());
    await tester.pumpAndSettle();

    final appBar = tester.widget<AppBar>(find.byType(AppBar));
    expect(appBar.backgroundColor, const Color(0xFF0B4B66));
    expect(find.byType(ScrollableContent), findsOneWidget);
    expect(find.byType(DigitCard), findsNWidgets(2));

    final welcomeHeading = tester.widget<Text>(
      find.text(tr(i18.welcome.welcomeTitle)),
    );
    expect(welcomeHeading.style?.fontFamily, 'Roboto Condensed');
    expect(welcomeHeading.style?.fontSize, 32);
    expect(welcomeHeading.style?.fontWeight, FontWeight.w700);

    for (var i = 1; i <= 5; i++) {
      final imagePath = 'assets/images/welcome_$i.png';
      final image = tester.widget<Image>(find.byKey(ValueKey(imagePath)));
      expect(image.width, spacer12 * 2);
      expect(image.height, spacer12 * 2);
    }

    final proceedButton = tester.widget<DigitButton>(
      find.byKey(const ValueKey('proceed-button')),
    );
    expect(proceedButton.type, DigitButtonType.primary);
    expect(proceedButton.size, DigitButtonSize.large);
    expect(proceedButton.suffixIcon, Icons.arrow_forward_outlined);

    await tester.tap(find.byKey(const ValueKey('proceed-button')));
    await tester.pumpAndSettle();

    expect(find.byType(LoginPage), findsOneWidget);
    expect(find.text(tr(i18.login.login)), findsNWidgets(2));
  });

  testWidgets('login uses DIGIT controls and validates fields locally', (
    tester,
  ) async {
    await pumpLogin(tester);

    expect(find.byType(DigitCard), findsOneWidget);
    expect(find.byType(DigitTextFormInput), findsOneWidget);
    expect(find.byType(DigitPasswordFormInput), findsOneWidget);
    expect(find.byType(PoweredByDigit), findsOneWidget);

    final loginButtonFinder = find.byKey(const ValueKey('login-button'));
    var loginButton = tester.widget<DigitButton>(loginButtonFinder);
    expect(loginButton.type, DigitButtonType.primary);
    expect(loginButton.size, DigitButtonSize.large);
    expect(loginButton.isDisabled, isTrue);

    final passwordField = find.byKey(const ValueKey('password-field'));
    final passwordInput = find.descendant(
      of: passwordField,
      matching: find.byType(EditableText),
    );
    expect(tester.widget<EditableText>(passwordInput).obscureText, isTrue);
    await tester.tap(find.byIcon(Icons.visibility));
    await tester.pump();
    expect(tester.widget<EditableText>(passwordInput).obscureText, isFalse);

    await tester.tap(find.byKey(const ValueKey('consent-checkbox')));
    await tester.pump();
    loginButton = tester.widget<DigitButton>(loginButtonFinder);
    expect(loginButton.isDisabled, isFalse);

    await tester.tap(loginButtonFinder);
    await tester.pump();
    expect(find.text(tr(i18.common.requiredMessage)), findsNWidgets(2));

    expect(find.byKey(const ValueKey('forgot-password-button')), findsNothing);
  });

  testWidgets('authenticated drawer retains profile and logs out', (
    tester,
  ) async {
    var logoutCalled = false;
    loginAuthRepository = _StubAuthRepository(
      (body) async => _cannedLoginResponse(approved: true),
      onLogout: () => logoutCalled = true,
    );
    addTearDown(() => loginAuthRepository = HttpAuthRepository());

    await pumpLogin(tester);

    final loginButtonFinder = find.byKey(const ValueKey('login-button'));
    await tester.tap(find.byKey(const ValueKey('consent-checkbox')));
    await tester.pump();

    final userIdInput = find.descendant(
      of: find.byKey(const ValueKey('user-id-field')),
      matching: find.byType(EditableText),
    );
    final passwordInput = find.descendant(
      of: find.byKey(const ValueKey('password-field')),
      matching: find.byType(EditableText),
    );
    await tester.enterText(userIdInput, 'demo.user');
    await tester.enterText(passwordInput, 'password');
    await tester.tap(loginButtonFinder);
    await tester.pumpAndSettle();

    expect(find.byType(HomePage), findsOneWidget);
    expect(find.byType(LoginPage), findsNothing);
    expect(_secureStorageValues['loginConsentAccepted'], 'true');

    await tester.tap(find.byKey(const ValueKey('home-menu-button')));
    await tester.pumpAndSettle();

    expect(find.byType(CustomDrawer), findsOneWidget);
    expect(find.text('Field Staff'), findsOneWidget);
    expect(find.text('9900223344'), findsOneWidget);
    expect(find.byType(QrImageView), findsOneWidget);
    expect(
      find.byKey(const ValueKey(
        'drawer-profile-qr-9e8934d3-a52e-4ac5-be8b-aab5011f851a',
      )),
      findsOneWidget,
    );
    expect(find.text(tr(i18.common.home)), findsOneWidget);
    expect(find.text(tr(i18.login.privacyPolicy)), findsOneWidget);
    expect(find.text(tr(i18.login.termsOfUse)), findsOneWidget);
    expect(find.text(tr(i18.common.logout)), findsOneWidget);

    await tester.tap(find.text(tr(i18.common.logout)));
    await tester.pumpAndSettle();

    expect(logoutCalled, isTrue);
    expect(_secureStorageValues['loginConsentAccepted'], 'true');
    expect(find.byType(HomePage), findsNothing);
    expect(find.byKey(const ValueKey('proceed-button')), findsOneWidget);
  });

  testWidgets(
      'session expiry logs out, notifies, and returns to Welcome — '
      'repeatably across the app lifetime', (tester) async {
    addTearDown(AuthTokenInterceptor.resetLogoutGuard);

    loginAuthRepository = _StubAuthRepository(
      (body) async => _cannedLoginResponse(approved: true),
    );
    addTearDown(() => loginAuthRepository = HttpAuthRepository());

    await pumpLogin(tester);

    Future<void> login() async {
      final consentCheckbox = find.byKey(const ValueKey('consent-checkbox'));
      if (tester.any(consentCheckbox)) {
        await tester.tap(consentCheckbox);
        await tester.pump();
      }
      final userIdInput = find.descendant(
        of: find.byKey(const ValueKey('user-id-field')),
        matching: find.byType(EditableText),
      );
      final passwordInput = find.descendant(
        of: find.byKey(const ValueKey('password-field')),
        matching: find.byType(EditableText),
      );
      await tester.enterText(userIdInput, 'demo.user');
      await tester.enterText(passwordInput, 'password');
      await tester.tap(find.byKey(const ValueKey('login-button')));
      await tester.pumpAndSettle();
    }

    // `_triggerLogoutOnce()` (private, exhausted-retries path) always clears
    // tokens via a hardcoded `HttpAuthRepository()` *before* calling the
    // `onSessionExpired` hook — replicate that exact sequence here rather
    // than faking a real 401 round trip just to reach it.
    await login();
    expect(find.byType(HomePage), findsOneWidget);

    await HttpAuthRepository().logout();
    await AuthTokenInterceptor.onSessionExpired!();
    await tester.pumpAndSettle();

    expect(find.byType(HomePage), findsNothing);
    expect(find.byKey(const ValueKey('proceed-button')), findsOneWidget);
    expect(find.text(tr(i18.common.sessionExpired)), findsOneWidget);
    expect(_secureStorageValues.containsKey('accessToken'), isFalse);
    expect(_secureStorageValues.containsKey('accessInfo'), isFalse);

    // Let the session-expired SnackBar auto-dismiss — it overlaps the fixed
    // footer button and would otherwise intercept the next tap.
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();

    // Log back in and trigger it a second time — the hook itself must stay
    // correctly wired across repeated logout/login cycles in one app
    // lifetime, not just fire once. (The private `_logoutTriggered` guard
    // inside `_triggerLogoutOnce` — reset via `resetLogoutGuard()` on a
    // fresh login — protects the *real* exhausted-retries 401 path; that
    // guard itself needs a mocked HTTP round trip to exercise directly and
    // isn't covered by this test.)
    await tester.tap(find.byKey(const ValueKey('proceed-button')));
    await tester.pumpAndSettle();
    await login();
    expect(find.byType(HomePage), findsOneWidget);

    await HttpAuthRepository().logout();
    await AuthTokenInterceptor.onSessionExpired!();
    await tester.pumpAndSettle();

    expect(find.byType(HomePage), findsNothing);
    expect(find.byKey(const ValueKey('proceed-button')), findsOneWidget);
    expect(find.text(tr(i18.common.sessionExpired)), findsOneWidget);
  });

  testWidgets(
      'login with a user missing the required role is rejected with an error',
      (tester) async {
    loginAuthRepository = _StubAuthRepository(
      (body) async => _cannedLoginResponse(approved: false),
    );
    addTearDown(() => loginAuthRepository = HttpAuthRepository());

    await pumpLogin(tester);

    final loginButtonFinder = find.byKey(const ValueKey('login-button'));
    await tester.tap(find.byKey(const ValueKey('consent-checkbox')));
    await tester.pump();

    final userIdInput = find.descendant(
      of: find.byKey(const ValueKey('user-id-field')),
      matching: find.byType(EditableText),
    );
    final passwordInput = find.descendant(
      of: find.byKey(const ValueKey('password-field')),
      matching: find.byType(EditableText),
    );
    await tester.enterText(userIdInput, 'demo.user');
    await tester.enterText(passwordInput, 'password');
    await tester.tap(loginButtonFinder);
    await tester.pumpAndSettle();

    expect(find.text(tr(i18.login.accessRoleRequired)), findsOneWidget);
    expect(find.byType(LoginPage), findsOneWidget);
    expect(find.byType(HomePage), findsNothing);
    expect(_secureStorageValues, isNot(contains('loginConsentAccepted')));
  });

  testWidgets('cached login consent is not requested again', (tester) async {
    _secureStorageValues['loginConsentAccepted'] = 'true';

    await pumpLogin(tester);

    expect(find.byKey(const ValueKey('consent-checkbox')), findsNothing);
    final loginButton = tester.widget<DigitButton>(
      find.byKey(const ValueKey('login-button')),
    );
    expect(loginButton.isDisabled, isFalse);
  });

  testWidgets('consent read failure falls back to requiring consent', (
    tester,
  ) async {
    _secureStorageReadFailureKey = 'loginConsentAccepted';

    await pumpLogin(tester);

    expect(find.byKey(const ValueKey('consent-checkbox')), findsOneWidget);
    final loginButton = tester.widget<DigitButton>(
      find.byKey(const ValueKey('login-button')),
    );
    expect(loginButton.isDisabled, isTrue);
  });

  testWidgets('consent write failure does not block successful login', (
    tester,
  ) async {
    _secureStorageWriteFailureKey = 'loginConsentAccepted';
    loginAuthRepository = _StubAuthRepository(
      (body) async => _cannedLoginResponse(approved: true),
    );
    addTearDown(() => loginAuthRepository = HttpAuthRepository());

    await pumpLogin(tester);
    await tester.tap(find.byKey(const ValueKey('consent-checkbox')));
    await tester.pump();
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('user-id-field')),
        matching: find.byType(EditableText),
      ),
      'demo.user',
    );
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('password-field')),
        matching: find.byType(EditableText),
      ),
      'password',
    );
    await tester.tap(find.byKey(const ValueKey('login-button')));
    await tester.pumpAndSettle();

    expect(find.byType(HomePage), findsOneWidget);
    expect(_secureStorageValues, isNot(contains('loginConsentAccepted')));
  });

  testWidgets('policy link opens an in-app WebView dialog', (tester) async {
    debugPolicyWebViewBodyBuilder = (context) => const SizedBox();
    addTearDown(() => debugPolicyWebViewBodyBuilder = null);

    await pumpLogin(tester);

    final consentTextFinder = find.byWidgetPredicate(
      (widget) =>
          widget is RichText &&
          widget.text.toPlainText().contains(tr(i18.login.privacyPolicy)),
    );
    final consentText = tester.widget<RichText>(consentTextFinder);
    final rootSpan = consentText.text as TextSpan;
    final privacySpan = findTextSpan(rootSpan, tr(i18.login.privacyPolicy));
    (privacySpan.recognizer! as TapGestureRecognizer).onTap!();
    await tester.pumpAndSettle();

    expect(find.byType(PolicyWebViewDialog), findsOneWidget);
    expect(find.text(tr(i18.login.privacyPolicy)), findsOneWidget);
    expect(find.byType(DigitButton), findsNWidgets(1));
  });

  testWidgets('home follows the requested section order and DIGIT styling', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await pumpAuthenticatedRoute(tester, const HomeRoute());

    expect(find.byKey(const ValueKey('home-menu-button')), findsOneWidget);
    expect(find.byKey(const ValueKey('home-help-button')), findsOneWidget);
    expect(find.byType(HomeHelpHeader), findsOneWidget);
    expect(find.text(tr(i18.common.appDescriptor)), findsOneWidget);
    expect(find.byType(PoweredByDigit), findsOneWidget);
    expect(find.byType(InfoCard), findsOneWidget);
    expect(find.byType(HomeItemCard), findsNWidgets(6));

    final homeCards = tester.widgetList<DigitCard>(
      find.descendant(
        of: find.byType(HomeItemCard),
        matching: find.byType(DigitCard),
      ),
    );
    expect(homeCards, hasLength(6));
    for (final card in homeCards) {
      expect(card.padding, const EdgeInsets.all(spacer1));
      expect(card.margin, const EdgeInsets.all(spacer2));
      expect(card.inline, isTrue);
    }

    final homeCardIcons = tester.widgetList<Icon>(
      find.byKey(const ValueKey('home-card-icon')),
    );
    expect(homeCardIcons, hasLength(2));
    expect(homeCardIcons.every((icon) => icon.size == 50), isTrue);
    expect(
      find.byKey(const ValueKey('home-card-count-position')),
      findsNWidgets(4),
    );
    expect(
      find.byKey(const ValueKey('home-card-label-padding')),
      findsNWidgets(6),
    );
    final resubmissionCard = find.byKey(
      const ValueKey('resubmission-report-card'),
    );
    final resubmissionLabelPadding = tester.widget<Padding>(
      find.descendant(
        of: resubmissionCard,
        matching: find.byKey(const ValueKey('home-card-label-padding')),
      ),
    );
    expect(
      resubmissionLabelPadding.padding,
      const EdgeInsets.symmetric(horizontal: spacer2),
    );

    final installationLabelPadding = tester.widget<Padding>(
      find.descendant(
        of: find.byKey(const ValueKey('installation-report-card')),
        matching: find.byKey(const ValueKey('home-card-label-padding')),
      ),
    );
    expect(
      installationLabelPadding.padding,
      const EdgeInsets.symmetric(horizontal: spacer10),
    );

    final resubmissionLabel = find.descendant(
      of: resubmissionCard,
      matching: find.text(tr(i18.home.resubmissionNeeded)),
    );
    expect(resubmissionLabel, findsOneWidget);
    final labelSize = tester.getSize(resubmissionLabel);
    expect(labelSize.height, greaterThan(0));

    final statusLines = find.byKey(
      const ValueKey('home-card-status-line'),
    );
    expect(statusLines, findsNWidgets(2));
    for (final line in statusLines.evaluate()) {
      expect(tester.getSize(find.byWidget(line.widget)).width, 2);
    }

    expect(
      find.byKey(const ValueKey('e4h-home-card-grid')),
      findsNWidgets(2),
    );
    for (final key in <String>[
      'installation-report-card',
      'assigned-report-card',
    ]) {
      final cardSize = tester.getSize(find.byKey(ValueKey(key)));
      expect(cardSize.width / cardSize.height, closeTo(375 / 340, 0.0001));
    }

    final quickCard = tester.getTopLeft(
      find.byKey(const ValueKey('installation-report-card')),
    );
    final reportsHeading = tester.getTopLeft(
      find.byKey(const ValueKey('my-reports-heading')),
    );
    final warning = tester.getTopLeft(
      find.byKey(const ValueKey('sync-warning-card')),
    );
    expect(quickCard.dy, lessThan(reportsHeading.dy));
    expect(reportsHeading.dy, lessThan(warning.dy));

    for (final key in <String>[
      'installation-report-card',
      'sync-pending-card',
      'assigned-report-card',
      'pending-approval-report-card',
      'approved-report-card',
      'resubmission-report-card',
    ]) {
      expect(find.byKey(ValueKey(key)), findsOneWidget);
    }

    for (final text in <String>[
      '48',
      '12',
      '35',
      '6',
      tr(i18.home.syncPendingWarning),
      tr(i18.home.pendingSyncDescription),
    ]) {
      expect(find.text(text), findsOneWidget);
    }
  });

  testWidgets('home navbar and help header match E4H placement and spacing', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await pumpAuthenticatedRoute(tester, const HomeRoute());

    final livelihoodBar = tester.widget<LivelihoodAppBar>(
      find.byType(LivelihoodAppBar),
    );
    expect(livelihoodBar.preferredSize.height, spacer12);
    expect(livelihoodBar.showMenu, isTrue);

    final appBarFinder = find.byType(AppBar);
    final appBar = tester.widget<AppBar>(appBarFinder);
    expect(appBar.toolbarHeight, spacer12);
    expect(appBar.actions, isNull);

    final menuButton = tester.widget<IconButton>(
      find.byKey(const ValueKey('home-menu-button')),
    );
    final menuIcon = menuButton.icon as Icon;
    expect(menuIcon.icon, Icons.menu);
    expect(menuIcon.size, spacer6);
    expect(menuIcon.color, Colors.white);

    final titleRow = appBar.title! as Row;
    expect(titleRow.mainAxisAlignment, MainAxisAlignment.start);
    expect((titleRow.children[1] as SizedBox).width, spacer2);
    expect(
      tester.getSize(find.byKey(const ValueKey('navbar-title-divider'))),
      const Size(1, spacer6),
    );
    expect((titleRow.children[3] as SizedBox).width, spacer2);

    final helpFinder = find.byKey(const ValueKey('home-help-button'));
    expect(
      find.descendant(of: appBarFinder, matching: helpFinder),
      findsNothing,
    );
    final helpButton = tester.widget<DigitButton>(helpFinder);
    expect(helpButton.type, DigitButtonType.tertiary);
    expect(helpButton.size, DigitButtonSize.medium);
    expect(helpButton.suffixIcon, Icons.help_outline_outlined);
    expect(helpButton.textColor, const DigitColors().light.primary1);
    expect(helpButton.iconColor, const DigitColors().light.primary1);

    final helpPadding = tester.widget<Padding>(
      find.byKey(const ValueKey('home-help-header-padding')),
    );
    expect(
      helpPadding.padding,
      const EdgeInsets.fromLTRB(spacer2, spacer2, spacer2, 0),
    );
    expect(
      tester.getTopLeft(helpFinder).dy,
      greaterThanOrEqualTo(tester.getBottomLeft(appBarFinder).dy),
    );
  });

  testWidgets('authenticated shell provides dynamic-form localization', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await pumpAuthenticatedRoute(tester, const HomeRoute());

    final homeContext = tester.element(find.byType(HomePage));
    expect(forms_localization.FormLocalization.of(homeContext), isNotNull);
  });

  testWidgets('home menu opens drawer and local controls show feedback', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await pumpAuthenticatedRoute(tester, const HomeRoute());

    await tester.tap(find.byKey(const ValueKey('home-menu-button')));
    await tester.pumpAndSettle();
    expect(find.byType(CustomDrawer), findsOneWidget);
    expect(find.text(tr(i18.common.home)), findsOneWidget);

    await tester.tapAt(const Offset(360, 400));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('home-help-button')));
    await tester.pump();
    expect(find.text(tr(i18.home.homeActionNotConnected)), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('sync-pending-card')));
    await tester.pump();
    expect(find.text(tr(i18.home.homeActionNotConnected)), findsOneWidget);
    expect(find.byType(HomePage), findsOneWidget);
  });

  testWidgets('drawer is shared by nested routes and Home resets navigation', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await pumpAuthenticatedRoute(
      tester,
      const InstallationReportHomeRoute(),
    );

    expect(find.byType(InstallationReportHomePage), findsOneWidget);
    expect(find.byKey(const ValueKey('home-menu-button')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('home-menu-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.text(tr(i18.common.home)));
    await tester.pumpAndSettle();

    expect(find.byType(HomePage), findsOneWidget);
    expect(find.byType(InstallationReportHomePage), findsNothing);
  });

  testWidgets('drawer opens privacy and terms dialogs', (tester) async {
    debugPolicyWebViewBodyBuilder = (context) => const SizedBox();
    addTearDown(() => debugPolicyWebViewBodyBuilder = null);
    setMobileViewport(tester, const Size(390, 844));
    await pumpAuthenticatedRoute(tester, const HomeRoute());

    for (final label in <String>[
      tr(i18.login.privacyPolicy),
      tr(i18.login.termsOfUse),
    ]) {
      await tester.tap(find.byKey(const ValueKey('home-menu-button')));
      await tester.pumpAndSettle();
      await tester.tap(find.text(label));
      await tester.pumpAndSettle();

      expect(find.byType(PolicyWebViewDialog), findsOneWidget);
      expect(find.text(label), findsWidgets);

      await tester.tap(find.byIcon(Icons.close));
      await tester.pumpAndSettle();
    }
  });

  testWidgets('home opens Installation Report and renders four menu cards', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await pumpAuthenticatedRoute(tester, const HomeRoute());

    await tester.tap(find.byKey(const ValueKey('installation-report-card')));
    await tester.pumpAndSettle();

    expect(find.byType(InstallationReportHomePage), findsOneWidget);
    expect(find.text(tr(i18.installationReportHome.installationReportHome)),
        findsOneWidget);
    expect(find.byKey(const ValueKey('report-back-button')), findsOneWidget);
    expect(find.byKey(const ValueKey('report-help-button')), findsOneWidget);
    expect(find.byType(PoweredByDigit), findsOneWidget);

    for (final key in <String>[
      'new-report-menu-card',
      'pending-approval-menu-card',
      'resubmission-menu-card',
      'approved-menu-card',
    ]) {
      expect(find.byKey(ValueKey(key)), findsOneWidget);
    }
    for (final count in <String>['48', '12', '6', '35']) {
      expect(find.text(count), findsOneWidget);
    }

    final countBadges = tester.widgetList<badges.Badge>(
      find.byKey(const ValueKey('report-menu-count-badge')),
    );
    expect(countBadges, hasLength(4));
    for (final badge in countBadges) {
      expect(badge.badgeStyle.shape, badges.BadgeShape.square);
      expect(
        badge.badgeStyle.badgeColor,
        const DigitColors().light.alertError,
      );
      expect(
        badge.badgeStyle.padding,
        const EdgeInsets.symmetric(
          horizontal: spacer3,
          vertical: spacer1,
        ),
      );
      expect(badge.badgeStyle.borderRadius, BorderRadius.circular(20));
      expect((badge.badgeContent as Text).style?.color, Colors.white);
    }

    await tester.tap(find.byKey(const ValueKey('report-help-button')));
    await tester.pump();
    expect(find.text(tr(i18.installationReportHome.reportActionNotConnected)),
        findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('report-back-button')));
    await tester.pumpAndSettle();
    expect(find.byType(HomePage), findsOneWidget);
  });

  testWidgets('report menu cards open their separated facility pages', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));

    Future<void> expectDestination(String key, Type pageType) async {
      await pumpAuthenticatedRoute(
        tester,
        const InstallationReportHomeRoute(),
      );
      final card = find.byKey(ValueKey(key));
      final cardCenter = tester.getCenter(card);
      if (cardCenter.dy > 700) {
        await tester.drag(
          find.byType(CustomScrollView),
          Offset(0, 650 - cardCenter.dy),
        );
        await tester.pumpAndSettle();
      }
      await tester.tap(card);
      await tester.pumpAndSettle();
      expect(find.byType(pageType), findsOneWidget);
    }

    await expectDestination('new-report-menu-card', NewReportFacilitiesPage);
    await expectDestination('pending-approval-menu-card', PendingApprovalPage);
    await expectDestination(
      'resubmission-menu-card',
      ResubmissionNeededPage,
    );
    await expectDestination('approved-menu-card', ApprovedReportsPage);
  });

  testWidgets('facility pages use the correct search and progress variants', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));

    Future<void> pumpPage(Widget page) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: DigitTheme.instance.mobileTheme,
          home: page,
        ),
      );
      // Lets the page's initState-dispatched fetch (against the stubbed
      // repository) resolve and the list rebuild before assertions run.
      await tester.pumpAndSettle();
    }

    await pumpPage(const NewReportFacilitiesPage());
    expect(find.byType(FacilitySearchSortCard), findsOneWidget);
    expect(find.byType(FacilityReportCard), findsNWidgets(2));
    expect(find.byType(LinearProgressIndicator), findsNWidgets(2));
    expect(find.byKey(const ValueKey('start-resume-report-button')),
        findsNWidgets(2));
    expect(
        find.byKey(const ValueKey('submit-approval-button')), findsNWidgets(2));

    await pumpPage(const PendingApprovalPage());
    expect(find.byType(FacilitySearchSortCard), findsNothing);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.byKey(const ValueKey('view-summary-button')), findsNWidgets(2));

    await pumpPage(const ResubmissionNeededPage());
    expect(find.byType(FacilitySearchSortCard), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.byKey(const ValueKey('view-details-button')), findsNWidgets(2));
    expect(find.byKey(const ValueKey('resubmit-button')), findsNWidgets(2));

    await pumpPage(const ApprovedReportsPage());
    expect(find.byType(FacilitySearchSortCard), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.byKey(const ValueKey('view-summary-button')), findsNWidgets(2));
  });

  testWidgets('search pages expose the E4H sort popup without filtering', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: const ApprovedReportsPage(),
      ),
    );

    expect(find.byKey(const ValueKey('facility-search-field')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('facility-sort-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('facility-sort-popup')), findsOneWidget);
    expect(find.text('Newest first'), findsOneWidget);
    expect(find.text('Oldest first'), findsOneWidget);
    expect(find.byType(FacilityReportCard), findsNWidgets(2));
  });

  testWidgets('pending solar opens its read-only overall summary', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await pumpAuthenticatedRoute(tester, const PendingApprovalRoute());

    final summaryButton =
        find.byKey(const ValueKey('view-summary-button')).first;
    await tester.ensureVisible(summaryButton);
    await tester.tap(summaryButton);
    await tester.pump();

    await tester.pumpAndSettle();
    expect(find.byType(OverallAssetSummaryPage), findsOneWidget);
    expect(
      find.byKey(const ValueKey('solar-overall-summary-pending')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsNothing);
  });

  testWidgets('solar and machine facilities open their separate flows', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));

    Future<void> pumpNewReports() async {
      await pumpAuthenticatedRoute(tester, const NewReportFacilitiesRoute());
    }

    await pumpNewReports();
    final solarAction =
        find.byKey(const ValueKey('start-resume-report-button')).first;
    await tester.ensureVisible(solarAction);
    await tester.tap(solarAction);
    await tester.pumpAndSettle();
    expect(find.byType(OverallAssetSummaryPage), findsOneWidget);
    expect(
      find.byKey(const ValueKey('solar-overall-summary-newReport')),
      findsOneWidget,
    );

    await pumpNewReports();
    final machineAction =
        find.byKey(const ValueKey('start-resume-report-button')).last;
    await tester.drag(
      find.byType(CustomScrollView),
      const Offset(0, -900),
    );
    await tester.pumpAndSettle();
    await tester.tap(machineAction);
    await tester.pumpAndSettle();
    expect(find.byType(MachineFormPage), findsOneWidget);
    expect(find.text(tr(i18.machineForm.machineReportTitle)), findsOneWidget);
  });

  testWidgets('overall summary shows all E4H BOM buttons in order', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 3000));
    final draft = _filledSolarDraft(SolarWorkflowMode.newReport);
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: OverallAssetSummaryPage(draft: draft),
      ),
    );

    const formKeys = [
      'solar-dynamic-rms_acc_off_grid_single_phase_bom_system',
      'solar-dynamic-rms_common_bom_solar',
      'solar-dynamic-rms_common_bom_rms',
      'solar-dynamic-rms_common_bom_wiring',
      'solar-dynamic-rms_common_bom_luminaries',
    ];
    for (final key in formKeys) {
      expect(find.byKey(ValueKey(key)), findsOneWidget);
    }
    final firstButton = tester.getRect(
      find.byKey(const ValueKey(
          'solar-dynamic-rms_acc_off_grid_single_phase_bom_system')),
    );
    final secondButton = tester.getRect(
      find.byKey(const ValueKey('solar-dynamic-rms_common_bom_solar')),
    );
    expect(secondButton.top - firstButton.bottom, spacer4);
  });

  testWidgets('solar status variants use view and edit actions', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 3000));

    Future<void> pumpMode(SolarWorkflowMode mode) => tester.pumpWidget(
          MaterialApp(
            key: UniqueKey(),
            theme: DigitTheme.instance.mobileTheme,
            home: OverallAssetSummaryPage(
              draft: _filledSolarDraft(mode),
            ),
          ),
        );

    await pumpMode(SolarWorkflowMode.pending);
    expect(
      find.byKey(const ValueKey(
          'solar-dynamic-rms_acc_off_grid_single_phase_bom_system')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsNothing);
    expect(
      find.byKey(const ValueKey('solar-rejection-reasons-panel')),
      findsNothing,
    );

    await pumpMode(SolarWorkflowMode.approved);
    expect(
      find.byKey(const ValueKey('solar-dynamic-rms_common_bom_luminaries')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsNothing);
    expect(
      find.byKey(const ValueKey('solar-rejection-reasons-panel')),
      findsNothing,
    );

    await pumpMode(SolarWorkflowMode.resubmission);
    expect(
      find.byKey(const ValueKey(
          'solar-dynamic-rms_acc_off_grid_single_phase_bom_system')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('solar-rejection-card')), findsNothing);
    expect(
      find.byKey(const ValueKey('solar-rejection-reasons-panel')),
      findsOneWidget,
    );
    expect(find.byIcon(Icons.error_outline), findsNothing);
    expect(
        find.text(tr(i18.installationReport.rejectionReasons)), findsOneWidget);
    expect(
      find.text(tr(i18.installationReport.incorrectInstallationDetails)),
      findsOneWidget,
    );
    expect(find.text(tr(i18.installationReport.rejectedSerialReason)),
        findsOneWidget);
    expect(find.text(tr(i18.installationReport.resubmit)), findsOneWidget);

    final uploader = find.byKey(
      const ValueKey('solar-overall-file-uploader'),
    );
    final rejectionPanel = find.byKey(
      const ValueKey('solar-rejection-reasons-panel'),
    );
    expect(
      tester.getTopLeft(rejectionPanel).dy,
      greaterThan(tester.getTopLeft(uploader).dy),
    );

    final rejectionSurface = tester.widget<Container>(
      find.byKey(const ValueKey('solar-rejection-reasons-surface')),
    );
    expect(
      rejectionSurface.padding,
      const EdgeInsets.symmetric(
        horizontal: spacer3,
        vertical: spacer4,
      ),
    );
    final decoration = rejectionSurface.decoration! as BoxDecoration;
    expect(decoration.borderRadius, BorderRadius.circular(spacer1));
  });

  testWidgets('solar completion controls and submit gate reflect draft data', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final incomplete = _filledSolarDraft(SolarWorkflowMode.newReport);
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: OverallAssetSummaryPage(draft: incomplete),
      ),
    );
    var submit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-submit')),
    );
    expect(incomplete.countFor(SolarAssetType.battery), 1);
    expect(incomplete.countFor(SolarAssetType.inverter), 1);
    expect(incomplete.countFor(SolarAssetType.panel), 1);
    expect(submit.isDisabled, isTrue);
    expect(find.byKey(const ValueKey('solar-installation-completion-card')),
        findsOneWidget);
    expect(find.byType(FileUploadWidget), findsOneWidget);
    expect(find.byKey(const ValueKey('solar-completion-certificate')),
        findsNothing);
    expect(find.byKey(const ValueKey('solar-handover-document')), findsNothing);
    expect(find.byKey(const ValueKey('solar-installation-images')),
        findsOneWidget);
    expect(find.byKey(const ValueKey('solar-otp-widget')), findsOneWidget);

    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('solar-otp-field')),
        matching: find.byType(EditableText),
      ),
      '1234',
    );
    final verifyButton = find.byKey(const ValueKey('solar-verify-otp-button'));
    final verifyCenter = tester.getCenter(verifyButton);
    await tester.drag(
      find.byType(CustomScrollView),
      Offset(0, 600 - verifyCenter.dy),
    );
    await tester.pumpAndSettle();
    await tester.tap(verifyButton);
    await tester.pump();
    submit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-submit')),
    );
    expect(submit.isDisabled, isFalse);

    final readOnly = _filledSolarDraft(SolarWorkflowMode.pending);
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: OverallAssetSummaryPage(draft: readOnly),
      ),
    );
    expect(find.byKey(const ValueKey('solar-otp-widget')), findsNothing);
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsNothing);
  });

  testWidgets('scanner uses the integrated E4H control hierarchy', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: BlocProvider<DigitScannerBloc>(
          create: (_) => DigitScannerBloc(const DigitScannerState()),
          child: DigitScannerPage(galleryPicker: () async => null),
        ),
      ),
    );
    await tester.pump();

    expect(find.byKey(const ValueKey('scanner-camera-stack')), findsOneWidget);
    expect(find.byKey(const ValueKey('scanner-flash-control')), findsOneWidget);
    expect(find.byKey(const ValueKey('scanner-top-label')), findsOneWidget);
    expect(find.byKey(const ValueKey('scanner-manual-link')), findsOneWidget);
    expect(find.byKey(const ValueKey('scanner-gallery-link')), findsOneWidget);
    expect(find.byKey(const ValueKey('scanner-submit-button')), findsOneWidget);
    expect(find.byKey(const ValueKey('scanner-gallery-button')), findsNothing);
    expect(find.text(tr(i18.common.submit)), findsOneWidget);

    final manual = tester.getRect(
      find.byKey(const ValueKey('scanner-manual-link')),
    );
    final gallery = tester.getRect(
      find.byKey(const ValueKey('scanner-gallery-link')),
    );
    expect(gallery.top, greaterThan(manual.bottom));
    expect(gallery.center.dx, closeTo(manual.center.dx, 1));
  });

  testWidgets('scanner gallery ignores duplicate launches and cancellation', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(360, 800));
    final result = Completer<XFile?>();
    var calls = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: BlocProvider<DigitScannerBloc>(
          create: (_) => DigitScannerBloc(const DigitScannerState()),
          child: DigitScannerPage(
            galleryPicker: () {
              calls++;
              return result.future;
            },
          ),
        ),
      ),
    );
    await tester.pump();

    final gallery = find.byKey(const ValueKey('scanner-gallery-link'));
    await tester.tap(gallery);
    await tester.tap(gallery);
    await tester.pump();
    expect(calls, 1);
    result.complete(null);
    await tester.pump();
    expect(find.byKey(const ValueKey('scanner-camera-stack')), findsOneWidget);
    expect(find.byKey(const ValueKey('scanner-result-panel')), findsOneWidget);
  });

  testWidgets('scanner manual entry replaces camera controls cleanly', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: BlocProvider<DigitScannerBloc>(
          create: (_) => DigitScannerBloc(const DigitScannerState()),
          child: const DigitScannerPage(),
        ),
      ),
    );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('scanner-manual-link')));
    await tester.pump();

    expect(find.byKey(const ValueKey('scanner-manual-page')), findsOneWidget);
    expect(find.byKey(const ValueKey('scanner-manual-submit')), findsOneWidget);
    expect(find.byKey(const ValueKey('scanner-gallery-link')), findsNothing);
    expect(find.byKey(const ValueKey('scanner-submit-button')), findsNothing);
    tester
        .widget<GestureDetector>(
          find.byKey(const ValueKey('scanner-manual-close')),
        )
        .onTap!();
    await tester.pump();
    expect(find.byKey(const ValueKey('scanner-camera-stack')), findsOneWidget);
  });

  testWidgets(
      'manual scan returns its trimmed value through the nested scanner route',
      (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final router = await pumpAuthenticatedRoute(tester, const HomeRoute());
    final scannerRouter =
        router.innerRouterOf<StackRouter>(AuthenticatedRouteWrapper.name)!;
    final resultFuture = scannerRouter.push<dynamic>(
      DigitScannerRoute(quantity: 10, isGS1code: false, singleValue: true),
    );
    var routeCompleted = false;
    resultFuture.then((_) => routeCompleted = true);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump(const Duration(milliseconds: 500));
    expect(
      scannerRouter.stack.map((route) => route.name),
      contains(DigitScannerRoute.name),
    );

    await tester.tap(find.byKey(const ValueKey('scanner-manual-link')));
    await tester.pump();
    final input = find.descendant(
      of: find.byKey(const ValueKey('scanner-manual-input')),
      matching: find.byType(EditableText),
    );
    await tester.enterText(input, '  MANUAL-SERIAL-001  ');
    await tester.tap(find.byKey(const ValueKey('scanner-manual-submit')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Confirm Selection'), findsOneWidget);
    await tester.tap(find.text('Keep Scanning'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(routeCompleted, isFalse);
    expect(find.byKey(const ValueKey('scanner-camera-stack')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('scanner-manual-link')));
    await tester.pump();
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('scanner-manual-input')),
        matching: find.byType(EditableText),
      ),
      '  MANUAL-SERIAL-002  ',
    );
    await tester.tap(find.byKey(const ValueKey('scanner-manual-submit')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    await tester.tap(find.text(tr(i18.common.submit)).last);
    await tester.pumpAndSettle();

    expect(await resultFuture, 'MANUAL-SERIAL-002');
    expect(find.byType(HomePage), findsOneWidget);
  });

  testWidgets('scanner final submit returns the selected Bloc value', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final router = await pumpAuthenticatedRoute(tester, const HomeRoute());
    final homeContext = tester.element(find.byType(HomePage));
    final scannerRouter =
        router.innerRouterOf<StackRouter>(AuthenticatedRouteWrapper.name)!;
    final resultFuture = scannerRouter.push<dynamic>(
      DigitScannerRoute(quantity: 10, isGS1code: false, singleValue: true),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump(const Duration(milliseconds: 500));

    homeContext.read<DigitScannerBloc>().add(
          const DigitScannerEvent.handleScanner(
            qrCode: ['GALLERY-OR-CAMERA-001'],
            barCode: [],
            overwrite: true,
            isGS1: false,
            quantity: 10,
          ),
        );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('scanner-submit-button')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    await tester.tap(find.text(tr(i18.common.submit)).last);
    await tester.pumpAndSettle();

    expect(await resultFuture, 'GALLERY-OR-CAMERA-001');
  });

  testWidgets('add new asset assigns injected scanner result directly', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final draft = SolarInstallationDraft(
      workflow: _StubActivityFacilityRemoteRepository._defaultItems.first,
      mode: SolarWorkflowMode.newReport,
    )..setCount(SolarAssetType.panel, 2);
    draft.assets[SolarAssetType.panel]!.warrantyDuration = '5 Years';
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AddNewAssetPage(
          draft: draft,
          assetType: SolarAssetType.panel,
          scanSerial: (_) async => 'SOLAR-QR-001',
        ),
      ),
    );

    expect(find.text('1/2'), findsOneWidget);
    expect(find.text('2/2'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('solar-scan-0')));
    await tester.pump();

    expect(draft.assets[SolarAssetType.panel]!.assets.first.serialNumber,
        'SOLAR-QR-001');
    final secondSerial = find.byKey(const ValueKey('asset-serial-scanner-1'));
    await tester.ensureVisible(secondSerial);
    await tester.pumpAndSettle();
    await tester.tap(secondSerial);
    await tester.pump();
    expect(draft.assets[SolarAssetType.panel]!.assets.last.serialNumber,
        'SOLAR-QR-001');
    expect(find.text('SOLAR-QR-001'), findsNWidgets(2));
    expect(find.byType(ImageUploader), findsNWidgets(2));
  });

  testWidgets('scanner result rebuilds the disabled field and enables Next', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final draft = SolarInstallationDraft(
      workflow: _StubActivityFacilityRemoteRepository._defaultItems.first,
      mode: SolarWorkflowMode.newReport,
    )..setCount(SolarAssetType.panel, 1);
    draft.assets[SolarAssetType.panel]!.assets.single.supportingPhoto =
        const SolarFileRef(
      name: 'panel.jpg',
      path: '/tmp/panel.jpg',
      kind: SolarFileKind.image,
    );
    draft.assets[SolarAssetType.panel]!.assets.single.capacity = '550';
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AddNewAssetPage(
          draft: draft,
          assetType: SolarAssetType.panel,
          scanSerial: (_) async => 'MANUAL-SERIAL-003',
        ),
      ),
    );

    var nextButton = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-next')),
    );
    expect(nextButton.isDisabled, isTrue);
    expect(
      tester
          .widget<DigitTextFormInput>(
            find.byKey(const ValueKey('solar-serial-0')),
          )
          .isDisabled,
      isTrue,
    );

    await tester.tap(find.byKey(const ValueKey('solar-scan-0')));
    await tester.pump();

    expect(find.text('MANUAL-SERIAL-003'), findsOneWidget);
    nextButton = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-next')),
    );
    expect(nextButton.isDisabled, isFalse);
  });

  testWidgets('shared image uploader matches E4H single-file states', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    SolarFileRef? selected;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: ImageUploader(
            label: 'Click to add photo',
            initialImage: selected,
            pickMedia: (_, __) async => XFile('/tmp/supporting-photo.jpg'),
            onImageSelected: (file) => selected = file,
          ),
        ),
      ),
    );

    final empty = tester.widget<Container>(
      find.byKey(const ValueKey('image-uploader-empty')),
    );
    expect(empty.constraints?.maxHeight, 120);
    final decoration = empty.decoration! as BoxDecoration;
    expect((decoration.border! as Border).top.width, 1);

    await tester.tap(find.byKey(const ValueKey('image-uploader-empty')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('image-uploader-camera')), findsOneWidget);
    expect(find.byKey(const ValueKey('image-uploader-files')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('image-uploader-files')));
    await tester.pumpAndSettle();

    expect(
        find.byKey(const ValueKey('image-uploader-preview')), findsOneWidget);
    final closeInk = tester.widget<InkWell>(
      find.byKey(const ValueKey('image-uploader-remove')),
    );
    final closeContainer = closeInk.child! as Container;
    expect(closeContainer.constraints?.maxWidth, spacer6);
    expect(closeContainer.constraints?.maxHeight, spacer6);

    await tester.tap(find.byKey(const ValueKey('image-uploader-remove')));
    await tester.pump();
    expect(selected, isNull);
    expect(find.byKey(const ValueKey('image-uploader-empty')), findsOneWidget);
  });

  testWidgets('solar media page uses E4H multiple image and video uploaders', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 1200));
    final draft = SolarInstallationDraft(
      workflow: _StubActivityFacilityRemoteRepository._defaultItems.first,
      mode: SolarWorkflowMode.newReport,
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: MediaUploadPage(
          draft: draft,
          assetType: SolarAssetType.battery,
        ),
      ),
    );

    expect(find.byType(ImageUploader), findsOneWidget);
    expect(find.byType(VideoUploader), findsOneWidget);
    expect(find.byKey(const ValueKey('image-uploader-empty')), findsOneWidget);
    expect(find.byKey(const ValueKey('video-uploader-empty')), findsOneWidget);
    expect(find.text('Cancel'), findsNothing);
  });

  testWidgets('E4H file uploader shows selection count and preview tile', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    List<SolarFileRef> selected = [];
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: FileUploadWidget(
            label: tr(i18.installationReport.uploadPdf),
            allowMultiples: true,
            showPreview: true,
            pickFiles: () async => [
              PlatformFile(
                name: 'certificate.pdf',
                size: 10,
                path: '/tmp/certificate.pdf',
              ),
            ],
            onFilesSelected: (files) => selected = files,
          ),
        ),
      ),
    );

    expect(find.text('No File Selected'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('file-uploader-button')));
    await tester.pumpAndSettle();
    expect(find.text('1 Selected'), findsOneWidget);
    expect(find.text('certificate.pdf'), findsOneWidget);
    expect(
        find.byKey(const ValueKey('file-uploader-preview-0')), findsOneWidget);
    expect(selected.single.kind, SolarFileKind.pdf);
  });

  testWidgets('shared OTP widget verifies, resets on edit, and resends', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final verificationChanges = <bool>[];
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: OtpVerificationWidget(
            label: tr(i18.machineForm.validateTrainingOtp),
            keyPrefix: 'test',
            onVerificationChanged: verificationChanges.add,
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('test-verify-otp-button')));
    await tester.pump();
    expect(find.text(tr(i18.machineForm.otpRequired)), findsOneWidget);
    expect(verificationChanges, isEmpty);

    final input = find.descendant(
      of: find.byKey(const ValueKey('test-otp-field')),
      matching: find.byType(EditableText),
    );
    await tester.enterText(input, '1234');
    await tester.tap(find.byKey(const ValueKey('test-verify-otp-button')));
    await tester.pump();
    expect(verificationChanges, [isTrue]);
    expect(
      find.byKey(const ValueKey('test-otp-verified-message')),
      findsOneWidget,
    );

    await tester.enterText(input, '5678');
    await tester.pump();
    expect(verificationChanges, [isTrue, isFalse]);
    expect(
      find.byKey(const ValueKey('test-otp-verified-message')),
      findsNothing,
    );

    await tester.tap(find.byKey(const ValueKey('test-verify-otp-button')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('test-resend-otp-button')));
    await tester.pump();
    expect(verificationChanges, [isTrue, isFalse, isTrue, isFalse]);
    expect(tester.widget<EditableText>(input).controller.text, isEmpty);
    expect(find.text(tr(i18.machineForm.otpResent)), findsOneWidget);
  });

  testWidgets('solar asset summary has edit controls only when editable', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 3000));
    final draft = _filledSolarDraft(SolarWorkflowMode.newReport);
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AssetSummaryPage(
          draft: draft,
          assetType: SolarAssetType.inverter,
        ),
      ),
    );
    expect(find.text(tr(i18.common.edit)), findsWidgets);
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsOneWidget);

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AssetSummaryPage(
          draft: draft,
          assetType: SolarAssetType.inverter,
          readOnly: true,
        ),
      ),
    );
    expect(find.text(tr(i18.common.edit)), findsNothing);
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsNothing);
  });

  testWidgets('installation images page enforces its local requirements', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final draft = SolarInstallationDraft(
      workflow: _StubActivityFacilityRemoteRepository._defaultItems.first,
      mode: SolarWorkflowMode.newReport,
    )..installationRequirements = const [
        InstallationImageRequirement(
          code: 'ARRAY',
          description: 'A',
          requiredCount: 1,
        ),
        InstallationImageRequirement(
          code: 'INVERTER',
          description: 'Inverter',
          requiredCount: 1,
        ),
        InstallationImageRequirement(
          code: 'HANDOVER',
          description: 'A much longer handover installation image description',
          requiredCount: 1,
        ),
      ];
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: InstallationImagesPage(
          draft: draft,
          readOnly: false,
          hydrateDraft: (_) async {},
        ),
      ),
    );
    var submit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-submit')),
    );
    expect(submit.isDisabled, isTrue);
    expect(find.byType(ImageUploader), findsNWidgets(3));
    final shortCard = tester.getSize(
      find.byKey(const ValueKey('solar-installation-image-ARRAY')),
    );
    final longCard = tester.getSize(
      find.byKey(const ValueKey('solar-installation-image-HANDOVER')),
    );
    expect(shortCard.width, longCard.width);
    expect(shortCard.width, greaterThan(300));
    for (final requirement in draft.installationRequirements) {
      draft.installationMedia[requirement.code] = [
        SolarFileRef(
          name: '${requirement.code}.jpg',
          path: '/tmp/${requirement.code}.jpg',
          kind: SolarFileKind.image,
        ),
      ];
    }
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: InstallationImagesPage(
          draft: draft,
          readOnly: false,
          hydrateDraft: (_) async {},
        ),
      ),
    );
    submit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-submit')),
    );
    expect(submit.isDisabled, isFalse);
  });

  testWidgets('machine form renders its DIGIT fields and fixed actions', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: MachineFormPage(
          workflow: _StubActivityFacilityRemoteRepository._defaultItems[1],
        ),
      ),
    );

    expect(find.byKey(const ValueKey('machine-form-card')), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-form-footer')), findsOneWidget);
    expect(find.byKey(const ValueKey('po-number-field')), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-serial-field')), findsOneWidget);
    expect(find.byKey(const ValueKey('invoice-number-field')), findsOneWidget);
    expect(
        find.byKey(const ValueKey('machine-capacity-field')), findsOneWidget);
    expect(find.byKey(const ValueKey('warranty-years-field')), findsOneWidget);
    expect(find.byKey(const ValueKey('electric-board-picker')), findsOneWidget);
    expect(find.byKey(const ValueKey('demo-video-picker')), findsOneWidget);
    expect(find.byKey(const ValueKey('end-user-photo-picker')), findsOneWidget);
    expect(find.byKey(const ValueKey('trained-yes')), findsOneWidget);
    expect(find.byKey(const ValueKey('trained-no')), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-otp-field')), findsOneWidget);

    final submit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('submit-machine-report-button')),
    );
    expect(submit.isDisabled, isTrue);
  });

  testWidgets('machine image picker matches E4H states and handles errors', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    var callCount = 0;
    XFile? selected;

    Future<XFile?> picker(MachineMediaKind kind, ImageSource source) async {
      callCount++;
      if (callCount == 1) return null;
      if (callCount == 3) throw Exception('picker failed');
      return XFile('/tmp/photo-$callCount.jpg', name: 'photo-$callCount.jpg');
    }

    Widget buildPicker() => MaterialApp(
          theme: DigitTheme.instance.mobileTheme,
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) => MachineMediaPicker(
                kind: MachineMediaKind.image,
                selectedFile: selected,
                pickMedia: picker,
                onChanged: (file) => setState(() => selected = file),
              ),
            ),
          ),
        );

    await tester.pumpWidget(buildPicker());
    final uploadControl = tester.widget<Container>(
      find.byKey(const ValueKey('machine-media-upload-control')),
    );
    expect(uploadControl.constraints?.maxHeight, 120);
    final uploadDecoration = uploadControl.decoration! as BoxDecoration;
    final uploadBorder = uploadDecoration.border! as Border;
    expect(uploadBorder.top.width, 1);
    expect(
      uploadBorder.top.color,
      const DigitColors().light.genericInputBorder,
    );
    final cameraIcon = tester.widget<Icon>(find.byIcon(Icons.camera_enhance));
    expect(cameraIcon.size, spacer10);
    expect(cameraIcon.color, const DigitColors().light.primary1);
    expect(find.text(tr(i18.machineForm.takePhoto)), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('machine-media-empty')));
    await tester.pumpAndSettle();
    final galleryIcon = tester.widget<Icon>(find.byIcon(Icons.perm_media));
    expect(galleryIcon.size, spacer10);
    expect(galleryIcon.color, const DigitColors().light.primary1);
    await tester.tap(find.byKey(const ValueKey('machine-picker-camera')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('machine-media-empty')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('machine-media-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('machine-picker-camera')));
    await tester.pumpAndSettle();
    final imagePreview = tester.widget<AspectRatio>(
      find.byKey(const ValueKey('machine-media-image-preview')),
    );
    expect(imagePreview.aspectRatio, 3 / 2);
    expect(find.text('photo-2.jpg'), findsNothing);
    expect(find.byKey(const ValueKey('machine-media-replace')), findsNothing);
    expect(
      tester.getSize(find.byKey(const ValueKey('machine-media-remove'))),
      const Size(spacer6, spacer6),
    );

    await tester.tap(find.byKey(const ValueKey('machine-media-remove')));
    await tester.pump();
    expect(find.byKey(const ValueKey('machine-media-empty')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('machine-media-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('machine-picker-camera')));
    await tester.pumpAndSettle();
    expect(find.text(tr(i18.machineForm.mediaPickerError)), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-media-error')), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-media-empty')), findsOneWidget);
  });

  testWidgets('machine video picker uses the E4H video tile', (tester) async {
    setMobileViewport(tester, const Size(390, 844));
    XFile? selected;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => MachineMediaPicker(
              kind: MachineMediaKind.video,
              selectedFile: selected,
              pickMedia: (_, __) async =>
                  XFile('/tmp/demo.mp4', name: 'demo.mp4'),
              onChanged: (file) => setState(() => selected = file),
            ),
          ),
        ),
      ),
    );

    expect(find.byIcon(Icons.videocam), findsOneWidget);
    expect(find.text(tr(i18.machineForm.takeVideo)), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('machine-media-empty')));
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.video_library), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('machine-picker-files')));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('machine-media-video-tile')),
      findsOneWidget,
    );
    expect(find.byIcon(Icons.video_file), findsOneWidget);
    expect(find.text('demo.mp4'), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-media-replace')), findsNothing);
    expect(
      tester.getSize(find.byKey(const ValueKey('machine-media-remove'))),
      const Size(spacer6, spacer6),
    );
  });

  testWidgets('machine picker shows opening state and ignores duplicate taps', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final pendingPick = Completer<XFile?>();
    var pickCount = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: MachineMediaPicker(
            kind: MachineMediaKind.image,
            selectedFile: null,
            pickMedia: (_, __) {
              pickCount++;
              return pendingPick.future;
            },
            onChanged: (_) {},
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('machine-media-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('machine-picker-camera')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const ValueKey('machine-media-opening')), findsOneWidget);
    expect(pickCount, 1);

    await tester.tap(find.byKey(const ValueKey('machine-media-empty')));
    await tester.pump();
    expect(pickCount, 1);
    expect(find.byKey(const ValueKey('machine-picker-camera')), findsNothing);

    pendingPick.complete(null);
    await tester.pump();
    expect(find.byKey(const ValueKey('machine-media-opening')), findsNothing);
  });

  testWidgets('machine draft and completed submit use success panels', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));

    Future<void> pumpForm() async {
      await pumpAuthenticatedRoute(
        tester,
        MachineFormRoute(
          workflow: _StubActivityFacilityRemoteRepository._defaultItems[1],
          pickMedia: (kind, source) async => XFile(
            kind == MachineMediaKind.image
                ? '/tmp/photo.jpg'
                : '/tmp/video.mp4',
            name: kind == MachineMediaKind.image ? 'photo.jpg' : 'video.mp4',
          ),
        ),
      );
    }

    await pumpForm();
    await tester.ensureVisible(
      find.byKey(const ValueKey('save-draft-button')),
    );
    await tester.tap(find.byKey(const ValueKey('save-draft-button')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.byType(MachineReportSuccessPage), findsOneWidget);
    expect(
        find.text(tr(i18.machineForm.dataSavedSuccessfully)), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget.runtimeType.toString() == 'Lottie',
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
    await tester.tap(
      find.byKey(const ValueKey('machine-success-home-button')),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.byType(HomePage), findsOneWidget);
    expect(find.byType(MachineFormPage), findsNothing);

    await pumpForm();
    Future<void> enter(String key, String value) async {
      await tester.enterText(
        find.descendant(
          of: find.byKey(ValueKey(key)),
          matching: find.byType(EditableText),
        ),
        value,
      );
      await tester.pump();
    }

    await enter('po-number-field', 'PO-100');
    await enter('machine-capacity-field', '500 W');
    await enter('warranty-years-field', '2');

    Future<void> scrollIntoView(Finder target) async {
      final center = tester.getCenter(target);
      if (center.dy > 650) {
        await tester.drag(
          find.byType(CustomScrollView),
          Offset(0, 600 - center.dy),
        );
        await tester.pumpAndSettle();
      }
    }

    Future<void> selectMedia(String key) async {
      final target = find.byKey(ValueKey(key));
      await scrollIntoView(target);
      await tester.tap(target);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('machine-picker-files')));
      await tester.pumpAndSettle();
    }

    await selectMedia('electric-board-picker');
    await selectMedia('demo-video-picker');
    await selectMedia('end-user-photo-picker');

    await scrollIntoView(find.byKey(const ValueKey('trained-no')));
    await tester.tap(find.byKey(const ValueKey('trained-no')));
    await tester.pump();
    expect(find.byKey(const ValueKey('machine-otp-field')), findsOneWidget);
    expect(
      tester
          .widget<DigitButton>(
            find.byKey(const ValueKey('submit-machine-report-button')),
          )
          .isDisabled,
      isTrue,
    );

    await enter('machine-otp-field', '1234');
    await scrollIntoView(
      find.byKey(const ValueKey('machine-verify-otp-button')),
    );
    await tester.tap(
      find.byKey(const ValueKey('machine-verify-otp-button')),
    );
    await tester.pump();
    expect(
      find.byKey(const ValueKey('machine-otp-verified-message')),
      findsOneWidget,
    );
    expect(
      tester
          .widget<DigitButton>(
            find.byKey(const ValueKey('submit-machine-report-button')),
          )
          .isDisabled,
      isFalse,
    );

    await enter('machine-otp-field', '12345');
    expect(
      find.byKey(const ValueKey('machine-otp-verified-message')),
      findsNothing,
    );
    await tester.tap(
      find.byKey(const ValueKey('machine-verify-otp-button')),
    );
    await tester.pump();
    await tester.tap(
      find.byKey(const ValueKey('submit-machine-report-button')),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));
    expect(
        find.text(tr(i18.machineForm.submittedSuccessfully)), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget.runtimeType.toString() == 'Lottie',
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('machine success screens match E4H panel and DIGIT footer', (
    tester,
  ) async {
    for (final mode in MachineReportSuccessMode.values) {
      setMobileViewport(tester, const Size(390, 844));
      await tester.pumpWidget(
        MaterialApp(
          key: ValueKey(mode),
          theme: DigitTheme.instance.mobileTheme,
          home: MachineReportSuccessPage(mode: mode),
        ),
      );
      await tester.pump(const Duration(milliseconds: 600));

      expect(find.byType(AppBar), findsNothing);
      expect(find.byType(PanelCard), findsOneWidget);
      expect(find.byType(PoweredByDigit), findsOneWidget);

      final panelCard = tester.widget<PanelCard>(find.byType(PanelCard));
      expect(panelCard.type, PanelType.success);
      expect(panelCard.animate, isTrue);
      expect(panelCard.repeat, isTrue);
      expect(panelCard.actions, hasLength(1));
      expect(panelCard.actions!.single.type, DigitButtonType.primary);
      expect(panelCard.actions!.single.size, DigitButtonSize.large);
      expect(panelCard.actions!.single.mainAxisSize, isNull);

      final panelPadding = tester.widget<Padding>(
        find.byKey(const ValueKey('machine-success-panel-padding')),
      );
      expect(panelPadding.padding, const EdgeInsets.all(spacer2));

      final footerPadding = tester.widget<Padding>(
        find.byKey(const ValueKey('machine-success-footer')),
      );
      expect(footerPadding.padding, const EdgeInsets.only(bottom: spacer2));

      final lottie = find.byWidgetPredicate(
        (widget) => widget.runtimeType.toString() == 'Lottie',
      );
      expect(lottie, findsOneWidget);
      expect(tester.getSize(lottie), const Size(80, 80));
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets('DIGIT layouts do not overflow at representative mobile sizes', (
    tester,
  ) async {
    for (final size in <Size>[const Size(360, 800), const Size(390, 844)]) {
      await pumpLogin(tester, size: size);
      expect(find.byKey(const ValueKey('login-scroll-view')), findsOneWidget);
      expect(tester.takeException(), isNull, reason: 'overflow at $size');

      await tester.pumpWidget(
        MaterialApp(
          theme: DigitTheme.instance.mobileTheme,
          home: BlocProvider<ActivityFacilityCountsBloc>(
            create: (_) => ActivityFacilityCountsBloc(),
            child: const HomePage(),
          ),
        ),
      );
      await tester.pump();
      expect(find.byKey(const ValueKey('home-scroll-view')), findsOneWidget);
      expect(tester.takeException(), isNull, reason: 'home overflow at $size');

      for (final page in <Widget>[
        const InstallationReportHomePage(),
        const NewReportFacilitiesPage(),
        const PendingApprovalPage(),
        const ResubmissionNeededPage(),
        const ApprovedReportsPage(),
        MachineFormPage(
          workflow: _StubActivityFacilityRemoteRepository._defaultItems[1],
        ),
        const MachineReportSuccessPage(
          mode: MachineReportSuccessMode.draft,
        ),
        const MachineReportSuccessPage(
          mode: MachineReportSuccessMode.submitted,
        ),
      ]) {
        await tester.pumpWidget(
          MaterialApp(
            key: UniqueKey(),
            theme: DigitTheme.instance.mobileTheme,
            home: BlocProvider<ActivityFacilityCountsBloc>(
              create: (_) => ActivityFacilityCountsBloc(),
              child: page,
            ),
          ),
        );
        await tester.pump();
        expect(
          tester.takeException(),
          isNull,
          reason: '${page.runtimeType} overflow at $size',
        );
      }
    }
  });

  testWidgets(
      "MdmsLoadingGate shows E4H's blocking dialog while MDMS loads, then "
      'reveals Home content', (tester) async {
    final completer = Completer<AssetRegistryMdmsResponse>();
    final repo = _StubAppInitRepo(fetchAssetRegistry: () => completer.future);
    final bloc = AppInitialization(repo: repo);
    addTearDown(bloc.close);

    bloc.add(const InitEvent.onLaunch());
    await bloc.stream.firstWhere((state) => state is Defaulted);

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: BlocProvider<AppInitialization>.value(
          value: bloc,
          child: BlocProvider<ActivityFacilityCountsBloc>(
            create: (_) => ActivityFacilityCountsBloc(),
            child: const HomePage(),
          ),
        ),
      ),
    );
    // Content is already built underneath (E4H's shape) — step through the
    // bloc emitting `loadingMdms`, the listener scheduling the dialog on the
    // next frame, and the dialog's own opening transition. Deliberately not
    // `pumpAndSettle`: the dialog's `CircularProgressIndicator` animates
    // indefinitely while shown, which would make `pumpAndSettle` hang.
    await tester.pump();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.byKey(const ValueKey('home-scroll-view')), findsOneWidget);
    expect(find.byKey(const ValueKey('mdms-loading-dialog')), findsOneWidget);
    expect(find.text(tr(i18.common.loading)), findsOneWidget);

    completer.complete(const AssetRegistryMdmsResponse());
    await tester.pump();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.byKey(const ValueKey('mdms-loading-dialog')), findsNothing);
    expect(find.byKey(const ValueKey('home-scroll-view')), findsOneWidget);
  });

  testWidgets(
      'MdmsLoadingGate blocks Home with a retry screen on hard failure, '
      'and retry recovers', (tester) async {
    var attempt = 0;
    final repo = _StubAppInitRepo(fetchAssetRegistry: () async {
      attempt++;
      if (attempt == 1) {
        throw const AppNetworkException(LoginErrorCode.serverError);
      }
      return const AssetRegistryMdmsResponse();
    });
    final bloc = AppInitialization(repo: repo);
    addTearDown(bloc.close);

    bloc.add(const InitEvent.onLaunch());
    await bloc.stream.firstWhere((state) => state is Defaulted);

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: BlocProvider<AppInitialization>.value(
          value: bloc,
          child: BlocProvider<ActivityFacilityCountsBloc>(
            create: (_) => ActivityFacilityCountsBloc(),
            child: const HomePage(),
          ),
        ),
      ),
    );

    // Bounded pumps rather than `pumpAndSettle`: the fetch fails fast enough
    // that the loading dialog's open/close can land in the same handful of
    // frames, and while it's shown its spinner animates indefinitely, which
    // `pumpAndSettle` can't wait out.
    await tester.pump();
    await tester.pump();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.byKey(const ValueKey('mdms-loading-dialog')), findsNothing);
    expect(find.byKey(const ValueKey('mdms-retry-button')), findsOneWidget);
    expect(find.text(tr(i18.login.errorServer)), findsOneWidget);
    expect(find.byKey(const ValueKey('home-scroll-view')), findsNothing);

    await tester.tap(find.byKey(const ValueKey('mdms-retry-button')));
    await tester.pump();
    await tester.pump();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.byKey(const ValueKey('mdms-loading-dialog')), findsNothing);
    expect(find.byKey(const ValueKey('mdms-retry-button')), findsNothing);
    expect(find.byKey(const ValueKey('home-scroll-view')), findsOneWidget);
  });
}
