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
import 'package:livelihood/data/nosql/localization.dart' show Localization;
import 'package:livelihood/data/network_manager.dart';
import 'package:livelihood/model/activity_facility/activity_facility.dart';
import 'package:livelihood/model/activity_facility_workflow/activity_facility_workflow.dart';
import 'package:livelihood/model/bom/bom.dart';
import 'package:livelihood/model/appconfig/mdmsResponse.dart';
import 'package:livelihood/model/facility_report.dart';
import 'package:livelihood/model/mdms/asset_registry_response.dart';
import 'package:livelihood/model/mdms/common_masters.dart';
import 'package:livelihood/repositories/activity_facility_repo.dart';
import 'package:livelihood/repositories/app_init_repo.dart';
import 'package:livelihood/utils/workflow_status.dart';
import 'package:livelihood/utils/i18_key_constants.dart' as i18;
import 'package:livelihood/utils/operation_progress.dart';
import 'package:livelihood/main.dart';
import 'package:livelihood/model/solar_installation_draft.dart';
import 'package:livelihood/pages/installation_report_home_page.dart';
import 'package:livelihood/pages/installation_report_list_pages.dart';
import 'package:livelihood/pages/home_page.dart';
import 'package:livelihood/pages/login_page.dart';
import 'package:livelihood/pages/machine_form.dart';
import 'package:livelihood/pages/machine_report_success_page.dart';
import 'package:livelihood/pages/media_viewer.dart';
import 'package:livelihood/pages/add_new_asset.dart';
import 'package:livelihood/pages/asset_type_detail.dart';
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
import 'package:livelihood/repositories/otp_repository.dart';
import 'package:livelihood/repositories/pending_submission_repository.dart';
import 'package:livelihood/repositories/asset_mdms_repository.dart';
import 'package:livelihood/utils/document_metadata.dart';
import 'package:livelihood/widgets/otp_verification_widget.dart';
import 'package:livelihood/widgets/operation_progress_overlay.dart';
import 'package:livelihood/blocs/asset_submission/asset_submission.dart';
import 'package:livelihood/widgets/privacy_policy/policy_webview_dialog.dart';
import 'package:livelihood/widgets/workflow_report_documents.dart';

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
        componentType: 'SOLAR',
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
        componentType: 'MACHINE',
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

class _FakeOtpRepository extends OtpRepository {
  _FakeOtpRepository({
    this.generateSucceeds = true,
    this.resendSucceeds = true,
    this.validateSucceeds = true,
  });

  bool generateSucceeds;
  bool resendSucceeds;
  bool validateSucceeds;
  int generateCalls = 0;
  int resendCalls = 0;
  int validateCalls = 0;

  @override
  Future<OtpResult> generate(String activityFacilityId) async {
    generateCalls++;
    return OtpResult(success: generateSucceeds);
  }

  @override
  Future<OtpResult> resend(String activityFacilityId) async {
    resendCalls++;
    return OtpResult(success: resendSucceeds);
  }

  @override
  Future<OtpResult> validate(String activityFacilityId, String otp) async {
    validateCalls++;
    return OtpResult(
      success: validateSucceeds,
      message: validateSucceeds ? null : 'Incorrect OTP, please try again',
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
      'LIVELIHOOD_202526PASF0000141_BOM_solar',
      'LIVELIHOOD_202526PASF0000141_BOM_machines',
      'LIVELIHOOD_COMMON_BOM_system',
    ])
    ..installationRequirements = const [
      InstallationImageRequirement(
        code: 'SOLAR_ARRAY',
        description: 'Solar array',
        requiredCount: 1,
      ),
    ];
  for (final type in SolarAssetType.values) {
    draft.setCount(type, 1);
    final asset = draft.assets[type]!;
    asset
      ..warrantyDuration = '5 Years'
      ..selectedBrandCode = '${type.name.toUpperCase()} MAKE'
      ..totalCapacity = '1';
    asset.assets.first
      ..itemCode = '${type.name.toUpperCase()}-ITEM'
      ..serialNumber = '${type.name.toUpperCase()}-1'
      ..capacity = '1'
      ..supportingPhoto = SolarFileRef(
        name: '${type.name}.jpg',
        path: '/tmp/${type.name}.jpg',
        kind: SolarFileKind.image,
        documentUid: 'DOC-${type.name}-IMAGE-1',
        geoLocation: const {'latitude': '6.5', 'longitude': '3.6'},
      );
    if (type == SolarAssetType.battery) {
      asset.typeOptions.add('LITHIUM_ION');
      asset.assets.first.batteryType = 'LITHIUM_ION';
    }
    asset.images.add(SolarFileRef(
      name: '${type.name}-installation.jpg',
      path: '/tmp/${type.name}-installation.jpg',
      kind: SolarFileKind.image,
      documentUid: 'DOC-${type.name}-IMAGE-2',
      geoLocation: const {'latitude': '6.5', 'longitude': '3.6'},
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

const _machineMdms = AssetRegistryMdmsResponse(
  commonMasters: CommonMastersModule(
    installationImages: [
      {
        'code': 'SOLAR_ARRAY',
        'active': true,
        'description': 'Solar array installation image',
        'short_title': 'Solar Array',
        'required_count': 1,
      },
    ],
  ),
  installation: InstallationModule(
    rejectionReasons: [
      RejectionReason(code: 'IMAGE_NOT_CLEAR', name: 'Image Not Clear'),
      RejectionReason(code: 'INCORRECT_BRAND', name: 'Incorrect Brand'),
    ],
  ),
  livelihood: LivelihoodModule(machineFormSchema: [
    {
      'data': {
        'name': 'MACHINE_FORM',
        'title': 'Machine Report',
        'fields': [
          {
            'title': 'PO Number',
            'fieldName': 'poNumber',
            'type': 'text',
            'order': 1,
            'required': true,
            'active': true
          },
          {
            'title': 'Machine Serial Number',
            'fieldName': 'serialNumber',
            'type': 'text',
            'order': 2,
            'required': true,
            'active': true
          },
          {
            'title': 'Manufacturer Invoice Number',
            'fieldName': 'invoiceNumber',
            'type': 'text',
            'order': 3,
            'required': true,
            'active': true
          },
          {
            'title': 'Machine Capacity',
            'fieldName': 'capacity',
            'type': 'text',
            'order': 4,
            'required': true,
            'active': true
          },
          {
            'title': 'Warranty Years',
            'fieldName': 'warrantyDuration',
            'type': 'number',
            'order': 5,
            'required': true,
            'active': true
          },
          {
            'title': 'Electric Board',
            'fieldName': 'MACHINE_ELECTRIC_BOARD',
            'type': 'image',
            'order': 6,
            'required': true,
            'requiredCount': 1,
            'active': true
          },
          {
            'title': 'Raw Material Demo',
            'fieldName': 'MACHINE_DEMO_VIDEO',
            'type': 'video',
            'order': 7,
            'required': true,
            'requiredCount': 1,
            'active': true
          },
          {
            'title': 'Photo with End User',
            'fieldName': 'MACHINE_END_USER_PHOTO',
            'type': 'image',
            'order': 8,
            'required': true,
            'requiredCount': 1,
            'active': true
          },
          {
            'title': 'Civil Work (If any)',
            'fieldName': 'MACHINE_CIVIL_WORK',
            'type': 'image',
            'order': 9,
            'required': false,
            'requiredCount': 2,
            'active': true
          },
          {
            'title': 'Trained End User',
            'fieldName': 'trainedEndUser',
            'type': 'boolean',
            'order': 10,
            'required': true,
            'active': true,
            'defaultValue': true
          },
        ],
      },
    },
  ]),
);

void main() {
  setUp(() {
    _secureStorageValues.clear();
    _secureStorageReadFailureKey = null;
    _secureStorageWriteFailureKey = null;
    activityFacilityRepository = ActivityFacilityRepository(
      remote: _StubActivityFacilityRemoteRepository(),
    );
    pendingSubmissionRepository.clearForTests();
    documentLocationOverride = () => const {
          'latitude': '6.5108074',
          'longitude': '3.606173',
          'additionalDetails': null,
        };
    unawaited(assetMdmsRepository.store(_machineMdms));
  });

  tearDown(() => documentLocationOverride = null);

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

  /// `OverallAssetSummaryPage`/`MachineFormPage` now read `AssetSubmissionBloc`
  /// directly (submit renders an in-place `OperationProgressOverlay` instead
  /// of navigating away) — tests that pump these pages standalone (outside
  /// the full `LivelihoodApp`/`pumpAuthenticatedRoute` tree, which already
  /// provides this bloc) need it supplied explicitly.
  Widget withAssetSubmissionBloc(Widget child) =>
      BlocProvider<AssetSubmissionBloc>(
        create: (_) => AssetSubmissionBloc(),
        child: child,
      );

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
    await tester.pumpAndSettle();
    expect(find.byType(PendingApprovalPage), findsOneWidget);
    expect(find.byKey(const ValueKey('pending-approval-workspace')),
        findsOneWidget);
  });

  testWidgets('Home My Reports cards are silent no-ops', (tester) async {
    setMobileViewport(tester, const Size(390, 844));
    await pumpAuthenticatedRoute(tester, const HomeRoute());

    for (final key in <String>[
      'assigned-report-card',
      'pending-approval-report-card',
      'approved-report-card',
      'resubmission-report-card',
    ]) {
      final card = find.byKey(ValueKey(key));
      await tester.ensureVisible(card);
      await tester.tap(card);
      await tester.pump();

      expect(find.byType(HomePage), findsOneWidget);
      expect(find.byType(PendingApprovalPage), findsNothing);
      expect(find.byType(SnackBar), findsNothing);
      expect(find.text(tr(i18.home.homeActionNotConnected)), findsNothing);
    }
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

    void expectComponentTypes() {
      expect(find.byKey(const ValueKey('facility-component-type')),
          findsNWidgets(2));
      expect(find.text('Solar'), findsOneWidget);
      expect(find.text('Machine'), findsOneWidget);
    }

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
    expectComponentTypes();
    expect(
      tester
          .getTopLeft(
              find.byKey(const ValueKey('facility-component-type')).first)
          .dy,
      greaterThan(tester.getTopLeft(find.text('Block').first).dy),
    );

    await pumpPage(const PendingApprovalPage());
    expect(find.byType(FacilitySearchSortCard), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    await tester
        .tap(find.text(tr(i18.installationReportHome.pendingApprovalTab)).last);
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('view-summary-button')), findsNWidgets(2));
    expectComponentTypes();
    await tester.pump(const Duration(seconds: 6));

    await pumpPage(const ResubmissionNeededPage());
    expect(find.byType(FacilitySearchSortCard), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.byKey(const ValueKey('view-details-button')), findsNWidgets(2));
    expect(find.byKey(const ValueKey('resubmit-button')), findsNWidgets(2));
    expectComponentTypes();

    await pumpPage(const ApprovedReportsPage());
    expect(find.byType(FacilitySearchSortCard), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.byKey(const ValueKey('view-summary-button')), findsNWidgets(2));
    expectComponentTypes();
  });

  testWidgets('facility card displays a dash for a missing component type', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'activity-facility-without-type',
        facility: Facility(
          facilityName: 'Facility without type',
          boundaryCode: 'INDIA_MEGHALAYA_WESTKHASIHILLS_MAWTHADRAISHAN',
        ),
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: FacilityReportCard(
            workflow: workflow,
            mode: FacilityReportMode.approved,
            onAction: () {},
          ),
        ),
      ),
    );

    expect(
      find.descendant(
        of: find.byKey(const ValueKey('facility-component-type')),
        matching: find.text('—'),
      ),
      findsOneWidget,
    );
  });

  testWidgets('facility cards use E4H date sources for every report mode', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'dated-facility',
        scheduledAt: DateTime(2026, 9, 14).millisecondsSinceEpoch,
        completedAt: 0,
        componentType: 'MACHINE',
        facility: const Facility(
          facilityName: 'Dated facility',
          boundaryCode: 'INDIA_ASSAM_BAKSA_DHAMDHAMA',
        ),
      ),
      workflow: Workflow(
        auditDetails: WorkflowAuditDetails(
          lastModifiedTime: DateTime(2026, 9, 15).millisecondsSinceEpoch,
        ),
      ),
    );

    for (final mode in FacilityReportMode.values) {
      await tester.pumpWidget(
        MaterialApp(
          theme: DigitTheme.instance.mobileTheme,
          home: Scaffold(
            body: FacilityReportCard(
              workflow: workflow,
              mode: mode,
              onAction: () {},
            ),
          ),
        ),
      );

      if (mode == FacilityReportMode.newReport) {
        expect(find.text('Start Date'), findsOneWidget);
        expect(find.text('End Date'), findsNothing);
        expect(find.text('14/09/26'), findsOneWidget);
        expect(find.text('15/09/26'), findsNothing);
      } else {
        expect(find.text('Submission Date'), findsOneWidget);
        expect(find.text('15/09/26'), findsOneWidget);
        expect(find.text('14/09/26'), findsNothing);
      }
      expect(find.text('01/01/70'), findsNothing);
    }
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

    await tester
        .tap(find.text(tr(i18.installationReportHome.pendingApprovalTab)).last);
    await tester.pumpAndSettle();

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

  testWidgets(
      'Pending Approval lists retryable local reports before backend reports',
      (tester) async {
    setMobileViewport(tester, const Size(390, 844));
    const localWorkflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'local-failed-machine',
        facilityId: 'local-facility',
        status: FacilityInstallationStatus.assignedToFieldStaff,
        componentType: 'MACHINE',
        facility: Facility(
          facilityName: 'Local Failed Machine',
          boundaryCode: 'INDIA_MEGHALAYA_WESTKHASIHILLS_MAWTHADRAISHAN',
        ),
      ),
    );
    await pendingSubmissionRepository.markOtpVerified(localWorkflow);

    await pumpAuthenticatedRoute(tester, const PendingApprovalRoute());
    await tester
        .tap(find.text(tr(i18.installationReportHome.pendingApprovalTab)).last);
    await tester.pumpAndSettle();

    expect(find.byType(FacilityReportCard), findsNWidgets(3));
    expect(
      tester.getTopLeft(find.text('Local Failed Machine')).dy,
      lessThan(tester.getTopLeft(find.text('Rajesh Kumar - Solar')).dy),
    );
    final sync = tester.widget<DigitButton>(
        find.byKey(const ValueKey('sync-pending-submissions-button')));
    expect(sync.isDisabled, isFalse);
    expect(sync.label, 'Sync');
  });

  testWidgets('Pending OTP drafts disappear from New and have no Sync action',
      (tester) async {
    setMobileViewport(tester, const Size(390, 844));
    await pendingSubmissionRepository.markOtpRequested(
      _StubActivityFacilityRemoteRepository._defaultItems.first,
    );

    await pumpAuthenticatedRoute(tester, const PendingApprovalRoute());
    await tester.pumpAndSettle();
    expect(find.text('Rajesh Kumar - Solar'), findsOneWidget);
    expect(find.byKey(const ValueKey('sync-pending-submissions-button')),
        findsNothing);

    await pumpAuthenticatedRoute(tester, const NewReportFacilitiesRoute());
    await tester.pumpAndSettle();
    expect(find.text('Rajesh Kumar - Solar'), findsNothing);
    expect(find.text('Sunita Sharma - Sewing Machine'), findsOneWidget);
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
    expect(find.text('Machine Report'), findsOneWidget);

    // Each `pumpNewReports()` call above renders facility cards whose
    // progress bar starts a real Isar `.timeout()` guard (now genuinely
    // exercised — see `test/flutter_test_config.dart`); navigating away
    // before those resolve leaves them "pending" at test end otherwise.
    await tester.pump(const Duration(seconds: 3));
  });

  testWidgets('overall summary shows solution BOM buttons in mapped order', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 3000));
    final draft = _filledSolarDraft(SolarWorkflowMode.newReport);
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: withAssetSubmissionBloc(OverallAssetSummaryPage(draft: draft)),
      ),
    );

    const formKeys = [
      'solar-dynamic-livelihood_202526pasf0000141_bom_solar',
      'solar-dynamic-livelihood_202526pasf0000141_bom_machines',
      'solar-dynamic-livelihood_common_bom_system',
    ];
    for (final key in formKeys) {
      expect(find.byKey(ValueKey(key)), findsOneWidget);
    }
    final firstButton = tester.getRect(
      find.byKey(const ValueKey(
          'solar-dynamic-livelihood_202526pasf0000141_bom_solar')),
    );
    final secondButton = tester.getRect(
      find.byKey(const ValueKey(
          'solar-dynamic-livelihood_202526pasf0000141_bom_machines')),
    );
    expect(secondButton.top - firstButton.bottom, spacer4);
    expect(find.text('View Associated Machines'), findsOneWidget);
  });

  testWidgets('Associated Machines is always labelled as view-only',
      (tester) async {
    setMobileViewport(tester, const Size(390, 3000));

    for (final mode in SolarWorkflowMode.values) {
      final draft = _filledSolarDraft(mode);
      await tester.pumpWidget(
        MaterialApp(
          key: UniqueKey(),
          theme: DigitTheme.instance.mobileTheme,
          home: withAssetSubmissionBloc(
            OverallAssetSummaryPage(draft: draft),
          ),
        ),
      );

      expect(find.text('View Associated Machines'), findsOneWidget);
    }

    final prefixed = _filledSolarDraft(SolarWorkflowMode.newReport);
    prefixed.bomFormNames
      ..clear()
      ..add('AssetForm.LIVELIHOOD_202526PASF0000141_BOM_machines');
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: withAssetSubmissionBloc(
          OverallAssetSummaryPage(draft: prefixed),
        ),
      ),
    );
    expect(find.text('View Associated Machines'), findsOneWidget);
  });

  testWidgets('overall asset counts activate from zero and stop at one',
      (tester) async {
    setMobileViewport(tester, const Size(390, 1200));
    final draft = SolarInstallationDraft(
      workflow: _StubActivityFacilityRemoteRepository._defaultItems.first,
      mode: SolarWorkflowMode.newReport,
    )..applicableTypes = const [SolarAssetType.battery];

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: withAssetSubmissionBloc(OverallAssetSummaryPage(draft: draft)),
      ),
    );

    expect(draft.countFor(SolarAssetType.battery), 0);
    var addDetails = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-add-details-battery')),
    );
    expect(addDetails.isDisabled, isTrue);

    await tester.tap(find.text('+').first);
    await tester.pump();
    expect(draft.countFor(SolarAssetType.battery), 1);
    addDetails = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-add-details-battery')),
    );
    expect(addDetails.isDisabled, isFalse);

    await tester.tap(find.text('-').first);
    await tester.pump();
    expect(draft.countFor(SolarAssetType.battery), 1);

    await tester.tap(find.text('+').first);
    await tester.pump();
    expect(draft.countFor(SolarAssetType.battery), 2);
    expect(draft.mergedBom['bom_battery_quantity'], 2);
    await tester.pump(const Duration(seconds: 3));
  });

  testWidgets('solar status variants use view and edit actions', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 3000));

    Future<void> pumpMode(SolarWorkflowMode mode) => tester.pumpWidget(
          MaterialApp(
            key: UniqueKey(),
            theme: DigitTheme.instance.mobileTheme,
            home: withAssetSubmissionBloc(OverallAssetSummaryPage(
              draft: _filledSolarDraft(mode),
            )),
          ),
        );

    await pumpMode(SolarWorkflowMode.pending);
    expect(
      find.byKey(const ValueKey(
          'solar-dynamic-livelihood_202526pasf0000141_bom_solar')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsNothing);
    expect(
      find.byKey(const ValueKey('solar-rejection-reasons-panel')),
      findsNothing,
    );

    await pumpMode(SolarWorkflowMode.approved);
    expect(
      find.byKey(const ValueKey(
          'solar-dynamic-livelihood_202526pasf0000141_bom_machines')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsNothing);
    expect(
      find.byKey(const ValueKey('solar-rejection-reasons-panel')),
      findsNothing,
    );

    await pumpMode(SolarWorkflowMode.resubmission);
    expect(
      find.byKey(const ValueKey('solar-dynamic-livelihood_common_bom_system')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('solar-rejection-card')), findsNothing);
    expect(
      find.byKey(const ValueKey('solar-rejection-reasons-panel')),
      findsNothing,
    );
    expect(find.byIcon(Icons.error_outline), findsNothing);
    expect(
      find.text(tr(i18.installationReport.incorrectInstallationDetails)),
      findsNothing,
    );
    expect(find.text(tr(i18.installationReport.rejectedSerialReason)),
        findsNothing);
    expect(find.text(tr(i18.installationReport.resubmit)), findsOneWidget);
    expect(
        find.byKey(const ValueKey('solar-footer-save-draft')), findsOneWidget);
    expect(
      tester
          .widget<DigitButton>(
            find.byKey(const ValueKey('solar-footer-submit')),
          )
          .isDisabled,
      isTrue,
    );
  });

  testWidgets('Solar rejection comments render in their E4H sections', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 3000));
    final draft = _filledSolarDraft(SolarWorkflowMode.resubmission);
    draft.rejectionComments.addAll(const [
      WorkflowComment(
        assetType: 'PANEL',
        commentMessage:
            '{"reasonCode":"IMAGE_NOT_CLEAR","comment":"Testing","sectionLabel":"PANEL"}',
      ),
      WorkflowComment(
        assetType: 'INSTALLATION_COMPLETION_REPORT',
        commentMessage:
            '{"reason":"Incorrect report","comment":"Replace it","sectionLabel":"Completion Report"}',
      ),
      WorkflowComment(
        assetType: 'INSTALLATION_IMAGE_SOLAR_ARRAY',
        commentMessage:
            '{"reasonCode":"INCORRECT_BRAND","comment":"Retake it","sectionLabel":"INSTALLATION_IMAGE_SOLAR_ARRAY"}',
      ),
    ]);

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: withAssetSubmissionBloc(OverallAssetSummaryPage(draft: draft)),
      ),
    );

    expect(find.byKey(const ValueKey('solar-rejection-panel')), findsOneWidget);
    expect(find.text('Image Not Clear'), findsOneWidget);
    expect(find.text('Testing'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('solar-rejection-reasons-panel')),
      findsOneWidget,
    );
    final bottomReasons = find.byKey(
      const ValueKey('solar-rejection-reasons-panel'),
    );
    final otp = find.byKey(const ValueKey('solar-otp-widget'));
    expect(tester.getTopLeft(bottomReasons).dy,
        lessThan(tester.getTopLeft(otp).dy));
    expect(
      find.text(tr(i18.machineForm.validateInstallationOtp)),
      findsNothing,
    );
    expect(
      find.descendant(
        of: bottomReasons,
        matching: find.text('Image Not Clear'),
      ),
      findsNothing,
    );
    expect(find.text('Completion Report'), findsOneWidget);
    expect(find.text('Incorrect report'), findsOneWidget);
    expect(find.text('Replace it'), findsOneWidget);
    expect(find.text('Solar Array'), findsOneWidget);
    expect(find.text('Incorrect Brand'), findsOneWidget);
    expect(find.text('Retake it'), findsOneWidget);
    expect(
      find.text(tr(i18.installationReport.incorrectInstallationDetails)),
      findsNothing,
    );
    expect(find.text(tr(i18.installationReport.rejectedSerialReason)),
        findsNothing);
  });

  testWidgets('Solar resubmission shows its missing Inverter fields', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 1600));
    final draft = _filledSolarDraft(SolarWorkflowMode.resubmission);
    draft.installationMedia['SOLAR_ARRAY'] = [
      const SolarFileRef(
        name: 'array.jpg',
        path: 'array-store',
        remoteId: 'array-store',
        kind: SolarFileKind.image,
      ),
    ];
    final inverter = draft.assets[SolarAssetType.inverter]!
      ..warrantyDuration = '';
    inverter.assets.single
      ..serialNumber = ''
      ..supportingPhoto = null;

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: withAssetSubmissionBloc(OverallAssetSummaryPage(draft: draft)),
      ),
    );
    await tester.pump();

    expect(
      find.text(tr(i18.installationReport.completeBeforeResubmitting)),
      findsOneWidget,
    );
    expect(
      find.text(
        'Inverter / PCU: Warranty Duration, Serial Number, Supporting Photo',
      ),
      findsOneWidget,
    );
  });

  testWidgets('solar completion controls and submit gate reflect draft data', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final originalOtpRepository = otpRepository;
    otpRepository = _FakeOtpRepository();
    addTearDown(() => otpRepository = originalOtpRepository);

    final incomplete = _filledSolarDraft(SolarWorkflowMode.newReport);
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home:
            withAssetSubmissionBloc(OverallAssetSummaryPage(draft: incomplete)),
      ),
    );
    expect(
        find.byKey(const ValueKey('solar-footer-save-draft')), findsOneWidget);
    final initialSubmit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-submit')),
    );
    expect(initialSubmit.isDisabled, isTrue);
    expect(incomplete.countFor(SolarAssetType.battery), 1);
    expect(incomplete.countFor(SolarAssetType.inverter), 1);
    expect(incomplete.countFor(SolarAssetType.panel), 1);
    // Counts and asset details alone are insufficient until the configured
    // installation images are also complete.
    expect(find.byKey(const ValueKey('solar-installation-completion-card')),
        findsOneWidget);
    expect(find.byType(FileUploadWidget), findsOneWidget);
    expect(find.byKey(const ValueKey('solar-completion-certificate')),
        findsNothing);
    expect(find.byKey(const ValueKey('solar-handover-document')), findsNothing);
    expect(find.byKey(const ValueKey('solar-installation-images')),
        findsOneWidget);
    expect(find.byKey(const ValueKey('solar-otp-widget')), findsOneWidget);

    final requestButton =
        find.byKey(const ValueKey('solar-otp-request-resend-button'));
    final requestCenter = tester.getCenter(requestButton);
    await tester.drag(
      find.byType(CustomScrollView),
      Offset(0, 600 - requestCenter.dy),
    );
    await tester.pumpAndSettle();
    await tester.tap(requestButton);
    await tester.pump();

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
    final submit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-submit')),
    );
    expect(submit.isDisabled, isTrue);

    final readOnly = _filledSolarDraft(SolarWorkflowMode.pending);
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: withAssetSubmissionBloc(OverallAssetSummaryPage(draft: readOnly)),
      ),
    );
    expect(find.byKey(const ValueKey('solar-otp-widget')), findsNothing);
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsNothing);
  });

  testWidgets('solar Save as Draft persists a Pending OTP Approval record',
      (tester) async {
    setMobileViewport(tester, const Size(390, 844));
    final draft = _filledSolarDraft(SolarWorkflowMode.newReport);
    final activityFacilityId = draft.workflow.activityFacility.id!;

    await pumpAuthenticatedRoute(
      tester,
      OverallAssetSummaryRoute(draft: draft),
    );
    await tester.tap(
      find.byKey(const ValueKey('solar-footer-save-draft')),
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 3));

    expect(
        find.byKey(const ValueKey('solar-data-saved-success')), findsOneWidget);
    final record = await pendingSubmissionRepository.read(activityFacilityId);
    expect(record?.state, PendingSubmissionState.pendingOtpApproval);
    expect(record?.otpRequested, isFalse);
    expect(record?.otpVerified, isFalse);
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

  testWidgets('asset details omits capacity while retaining make and warranty',
      (tester) async {
    setMobileViewport(tester, const Size(390, 844));
    final draft = _filledSolarDraft(SolarWorkflowMode.newReport);

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AssetTypeDetailPage(
          draft: draft,
          assetType: SolarAssetType.battery,
        ),
      ),
    );

    expect(find.byKey(const ValueKey('solar-details-make')), findsOneWidget);
    expect(
        find.byKey(const ValueKey('solar-warranty-dropdown')), findsOneWidget);
    expect(find.text(tr(i18.assetFlow.capacity)), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 1));
  });

  testWidgets('add new asset displays BOM capacity for every solar asset type',
      (tester) async {
    setMobileViewport(tester, const Size(390, 1600));
    final draft = _filledSolarDraft(SolarWorkflowMode.newReport);
    const cases = <SolarAssetType, (String, String)>{
      SolarAssetType.battery: ('solar-add-capacity-battery', '125 Ah'),
      SolarAssetType.inverter: ('solar-add-capacity-inverter', '5 kVA'),
      SolarAssetType.panel: ('solar-add-capacity-panel', '330 Wp'),
    };

    for (final entry in cases.entries) {
      final asset = draft.assets[entry.key]!;
      asset.totalCapacity = entry.value.$2;
      for (final item in asset.assets) {
        item.capacity = entry.value.$2;
      }

      await tester.pumpWidget(
        MaterialApp(
          key: UniqueKey(),
          theme: DigitTheme.instance.mobileTheme,
          home: AddNewAssetPage(
            draft: draft,
            assetType: entry.key,
            scanSerial: (_) async => null,
          ),
        ),
      );

      final capacityField = find.byKey(ValueKey<String>(entry.value.$1));
      expect(capacityField, findsOneWidget);
      expect(
        find.descendant(
          of: capacityField,
          matching: find.text(entry.value.$2),
        ),
        findsOneWidget,
      );
    }
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 1));
  });

  testWidgets('Battery Type uses MDMS options and is required for Next',
      (tester) async {
    setMobileViewport(tester, const Size(390, 1600));
    final draft = _filledSolarDraft(SolarWorkflowMode.newReport);
    final battery = draft.assets[SolarAssetType.battery]!;
    battery.typeOptions
      ..clear()
      ..addAll(['Lithium', 'Lead Acid', 'VRLA']);
    for (final entry in battery.assets) {
      entry.batteryType = '';
    }

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AddNewAssetPage(
          draft: draft,
          assetType: SolarAssetType.battery,
          scanSerial: (_) async => null,
        ),
      ),
    );

    var next = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-next')),
    );
    expect(next.isDisabled, isTrue);
    final dropdown = tester.widget<DigitDropdown>(
      find.byKey(const ValueKey('solar-battery-type-dropdown')),
    );
    expect(dropdown.items.map((item) => item.code),
        ['Lithium', 'Lead Acid', 'VRLA']);

    dropdown.onSelect!(
      const DropdownItem(name: 'Lead Acid', code: 'Lead Acid'),
    );
    await tester.pump();

    expect(battery.assets.every((entry) => entry.batteryType == 'Lead Acid'),
        isTrue);
    next = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-next')),
    );
    expect(next.isDisabled, isFalse);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 1));
  });

  testWidgets('Battery Next enables after completing an increased count',
      (tester) async {
    setMobileViewport(tester, const Size(390, 1600));
    final draft = _filledSolarDraft(SolarWorkflowMode.newReport)
      ..mergedBom['bom_battery_product'] = 'BATTERY-ITEM';
    final battery = draft.assets[SolarAssetType.battery]!;
    draft.setCount(SolarAssetType.battery, 2);
    final second = battery.assets.last
      ..serialNumber = 'BATTERY-2'
      ..supportingPhoto = const SolarFileRef(
        name: 'battery-2.jpg',
        path: '/tmp/battery-2.jpg',
        kind: SolarFileKind.image,
        documentUid: 'DOC-BATTERY-IMAGE-2',
        geoLocation: {'latitude': '6.5', 'longitude': '3.6'},
      );

    expect(second.itemCode, 'BATTERY-ITEM');
    expect(second.capacity, '1');
    expect(second.batteryType, 'LITHIUM_ION');

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AddNewAssetPage(
          draft: draft,
          assetType: SolarAssetType.battery,
          scanSerial: (_) async => null,
        ),
      ),
    );

    final next = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-next')),
    );
    expect(next.isDisabled, isFalse);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 1));
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

  testWidgets('inverter page repairs missing cached entry slots',
      (tester) async {
    setMobileViewport(tester, const Size(390, 1600));
    final draft = SolarInstallationDraft(
      workflow: _StubActivityFacilityRemoteRepository._defaultItems.first,
      mode: SolarWorkflowMode.newReport,
    )..setCount(SolarAssetType.inverter, 3);
    draft.assets[SolarAssetType.inverter]!.assets.clear();

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AddNewAssetPage(
          draft: draft,
          assetType: SolarAssetType.inverter,
          scanSerial: (_) async => null,
        ),
      ),
    );

    expect(find.byKey(const ValueKey('solar-no-assets-state')), findsNothing);
    expect(find.byKey(const ValueKey('solar-asset-card-0')), findsOneWidget);
    expect(find.byKey(const ValueKey('solar-asset-card-1')), findsOneWidget);
    expect(find.byKey(const ValueKey('solar-asset-card-2')), findsOneWidget);
    expect(find.text('1/3'), findsOneWidget);
    expect(find.text('3/3'), findsOneWidget);
  });

  testWidgets('zero-count asset route shows a controlled empty state',
      (tester) async {
    setMobileViewport(tester, const Size(390, 844));
    final draft = SolarInstallationDraft(
      workflow: _StubActivityFacilityRemoteRepository._defaultItems.first,
      mode: SolarWorkflowMode.newReport,
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AddNewAssetPage(
          draft: draft,
          assetType: SolarAssetType.inverter,
          scanSerial: (_) async => null,
        ),
      ),
    );

    expect(find.byKey(const ValueKey('solar-no-assets-state')), findsOneWidget);
    expect(find.byKey(const ValueKey('solar-no-assets-back')), findsOneWidget);
    expect(find.byKey(const ValueKey('solar-asset-card-0')), findsNothing);
    final next = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-next')),
    );
    expect(next.isDisabled, isTrue);
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
      documentUid: 'DOC-PANEL-IMAGE-1',
      geoLocation: {'latitude': '6.5', 'longitude': '3.6'},
    );
    draft.assets[SolarAssetType.panel]!.assets.single.capacity = '550';
    draft.assets[SolarAssetType.panel]!.assets.single.itemCode = 'PANEL-550';
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
    var selected = <SolarFileRef>[];

    Widget buildUploader() => MaterialApp(
          theme: DigitTheme.instance.mobileTheme,
          home: Scaffold(
            body: ImageUploader(
              label: 'Click to add photo',
              initialImages: selected,
              pickMedia: (_, __) async => XFile('/tmp/supporting-photo.jpg'),
              onImagesSelected: (files) => selected = files,
            ),
          ),
        );

    await tester.pumpWidget(buildUploader());

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
    expect(selected, hasLength(1));

    // Regression check: a real single-image caller (e.g.
    // `InstallationImagesPage` for a `requiredCount == 1` requirement)
    // rebuilds the uploader with the now-updated `initialImages` right
    // after the callback fires — this used to wipe the just-picked image
    // back to empty (see `image_uploader.dart` doc comment).
    await tester.pumpWidget(buildUploader());
    await tester.pump();
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
    expect(selected, isEmpty);
    expect(find.byKey(const ValueKey('image-uploader-empty')), findsOneWidget);
  });

  testWidgets(
      'multiple image uploader bulk-selects and clamps to remaining slots', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    var selected = <SolarFileRef>[];
    var bulkPickCalls = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: ImageUploader(
            initialImages: selected,
            allowMultiples: true,
            maxImages: 2,
            pickMedia: (_, __) async => XFile('/tmp/camera.jpg'),
            pickMultiple: () async {
              bulkPickCalls++;
              return [
                XFile('/tmp/civil-1.jpg'),
                XFile('/tmp/civil-2.jpg'),
              ];
            },
            onImagesSelected: (files) => selected = files,
          ),
        ),
      ),
    );

    // Camera remains a single capture even though the field supports two.
    await tester.tap(find.byKey(const ValueKey('image-uploader-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('image-uploader-camera')));
    await tester.pumpAndSettle();
    expect(selected, hasLength(1));

    // The gallery returns two files, but only the one remaining slot is used.
    await tester.tap(find.byKey(const ValueKey('image-uploader-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('image-uploader-files')));
    await tester.pumpAndSettle();
    expect(bulkPickCalls, 1);
    expect(selected.map((file) => file.path), [
      '/tmp/camera.jpg',
      '/tmp/civil-1.jpg',
    ]);
    expect(find.byKey(const ValueKey('image-uploader-empty')), findsNothing);
    expect(
        find.byKey(const ValueKey('image-uploader-preview-0')), findsOneWidget);
    expect(
        find.byKey(const ValueKey('image-uploader-preview-1')), findsOneWidget);
  });

  testWidgets('multiple image uploader selects the full count at once', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    var selected = <SolarFileRef>[];
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: ImageUploader(
            initialImages: selected,
            allowMultiples: true,
            maxImages: 2,
            pickMultiple: () async => [
              XFile('/tmp/civil-1.jpg'),
              XFile('/tmp/civil-2.jpg'),
            ],
            onImagesSelected: (files) => selected = files,
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('image-uploader-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('image-uploader-files')));
    await tester.pumpAndSettle();
    expect(selected.map((file) => file.path), [
      '/tmp/civil-1.jpg',
      '/tmp/civil-2.jpg',
    ]);
    expect(find.byKey(const ValueKey('image-uploader-empty')), findsNothing);
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

  testWidgets('shared video uploader enforces its configured count', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    var selected = <SolarFileRef>[];
    var picks = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: VideoUploader(
            initialVideos: selected,
            allowMultiples: true,
            maxVideos: 2,
            pickMedia: (_, __) async {
              picks++;
              return XFile('/tmp/video-$picks.mp4');
            },
            onVideosSelected: (files) => selected = files,
          ),
        ),
      ),
    );

    for (var index = 0; index < 2; index++) {
      await tester.tap(find.byKey(const ValueKey('video-uploader-empty')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('video-uploader-files')));
      await tester.pumpAndSettle();
    }

    expect(selected, hasLength(2));
    expect(find.byKey(const ValueKey('video-uploader-empty')), findsNothing);
    expect(
        find.byKey(const ValueKey('video-uploader-preview-0')), findsOneWidget);
    expect(
        find.byKey(const ValueKey('video-uploader-preview-1')), findsOneWidget);
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

  testWidgets('workflow reports render images before full-width PDF cards', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: const Scaffold(
          body: WorkflowReportDocuments(
            documents: [
              {
                'documentType': 'INSTALLATION_REPORT_BOM',
                'fileStoreId': 'bom-store',
                'documentUid': 'INSTALLATION-REPORT-PDF-2',
              },
              {
                'documentType': 'INSTALLATION_COMPLETION_REPORT',
                'fileStore': 'image-store',
                'documentUid': 'INSTALLATION-REPORT-IMAGE-1',
              },
              {
                'documentType': 'UNRELATED_DOCUMENT',
                'fileStoreId': 'ignored-store',
              },
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    final image = find.byKey(
      const ValueKey('workflow-report-preview-1'),
    );
    final pdf = find.byKey(
      const ValueKey('workflow-report-preview-0'),
    );
    expect(image, findsOneWidget);
    expect(pdf, findsOneWidget);
    expect(find.text('Installation Report BOM.pdf'), findsOneWidget);
    expect(tester.getTopLeft(image).dy, lessThan(tester.getTopLeft(pdf).dy));
    expect(tester.getSize(pdf).width, greaterThan(300));
    expect(
      find.descendant(of: image, matching: find.byType(InkWell)),
      findsWidgets,
    );
    expect(
      find.descendant(of: pdf, matching: find.byType(InkWell)),
      findsWidgets,
    );
  });

  testWidgets('shared OTP widget requests, resends, verifies and then locks', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final verificationChanges = <bool>[];
    final fakeRepo = _FakeOtpRepository();
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: OtpVerificationWidget(
            keyPrefix: 'test',
            activityFacilityId: 'activity-facility-otp-test',
            repository: fakeRepo,
            onVerificationChanged: verificationChanges.add,
          ),
        ),
      ),
    );

    // OTP field + Verify are always visible; the toggle starts as "Request OTP".
    expect(find.byKey(const ValueKey('test-otp-field')), findsOneWidget);
    expect(find.text(tr(i18.machineForm.validateTrainingOtp)), findsNothing);
    expect(find.text(tr(i18.machineForm.requestOtp)), findsOneWidget);

    final toggleButton =
        find.byKey(const ValueKey('test-otp-request-resend-button'));
    await tester.tap(toggleButton);
    await tester.pump();
    expect(fakeRepo.generateCalls, 1);
    expect(find.text(tr(i18.machineForm.otpRequestSent)), findsOneWidget);

    await tester.tap(toggleButton);
    await tester.pump();
    expect(fakeRepo.resendCalls, 1);

    final input = find.descendant(
      of: find.byKey(const ValueKey('test-otp-field')),
      matching: find.byType(EditableText),
    );
    await tester.enterText(input, '1234');
    await tester.pump();
    expect(
      tester
          .widget<DigitButton>(
            find.byKey(const ValueKey('test-verify-otp-button')),
          )
          .isDisabled,
      isFalse,
    );
    await tester.tap(find.byKey(const ValueKey('test-verify-otp-button')));
    await tester.pump();
    expect(verificationChanges, [isTrue]);
    expect(
      find.byKey(const ValueKey('test-otp-verified-message')),
      findsOneWidget,
    );

    expect(verificationChanges, [isTrue]);
    expect(tester.widget<DigitButton>(toggleButton).isDisabled, isTrue);
    expect(find.text(tr(i18.machineForm.resendOtp)), findsOneWidget);
  });

  testWidgets('shared OTP widget surfaces a failed request/verify message', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final fakeRepo = _FakeOtpRepository(
      generateSucceeds: false,
      validateSucceeds: false,
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: OtpVerificationWidget(
            keyPrefix: 'test-fail',
            activityFacilityId: 'activity-facility-otp-test',
            repository: fakeRepo,
            onVerificationChanged: (_) {},
          ),
        ),
      ),
    );

    await tester
        .tap(find.byKey(const ValueKey('test-fail-otp-request-resend-button')));
    await tester.pump();
    expect(find.text(tr(i18.machineForm.otpRequestFailed)), findsOneWidget);
    // A failed generate keeps the toggle reading "Request OTP".
    expect(find.text(tr(i18.machineForm.requestOtp)), findsOneWidget);
  });

  testWidgets(
      'submission overlay replaces raw workflow errors with retry guidance', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    Localization localized(String code, String message) => Localization()
      ..code = code
      ..message = message
      ..module = 'rainmaker-common'
      ..locale = 'en_IN';

    AppLocalizations.debugSeedLocalizations([
      localized(i18.syncLoading.failed, 'Submission failed'),
      localized(
        i18.syncLoading.failureWorkflow,
        'Unable to complete the report submission.',
      ),
      localized(
        i18.syncLoading.progressSavedRetry,
        'Your progress has been saved. Please try again.',
      ),
      localized(i18.common.back, 'Back'),
      localized(i18.common.retry, 'Retry'),
    ]);
    addTearDown(() => AppLocalizations.debugSeedLocalizations(const []));

    var backCalls = 0;
    var retryCalls = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: Stack(
            children: [
              const SizedBox.expand(),
              OperationProgressOverlay(
                progress: const OperationProgressModel(
                  activityFacilityId: 'workflow-failure',
                  operationType: OperationTypes.submit,
                  status: OperationStatuses.failed,
                  stageKey: 'finalizing_workflow_submission',
                  stageLabel: 'Finalizing workflow submission',
                  completedSteps: 6,
                  totalSteps: 9,
                  progressPercent: 67,
                  retryCount: 1,
                  errorMessage:
                      'DioException [bad response]: error while publishing to kafka',
                ),
                onClose: () => backCalls++,
                onRetry: () => retryCalls++,
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('Submission failed'), findsOneWidget);
    expect(
      find.text('Unable to complete the report submission.'),
      findsOneWidget,
    );
    expect(
      find.text('Your progress has been saved. Please try again.'),
      findsOneWidget,
    );
    expect(find.text('67%'), findsOneWidget);
    expect(find.textContaining('DioException'), findsNothing);
    expect(find.textContaining('kafka'), findsNothing);

    await tester.tap(find.byKey(
      const ValueKey('operation-progress-retry-button'),
    ));
    await tester.tap(find.byKey(
      const ValueKey('operation-progress-close-button'),
    ));
    expect(retryCalls, 1);
    expect(backCalls, 1);
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

  testWidgets('solar asset summary displays numeric warranty duration', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 3000));
    final draft = _filledSolarDraft(SolarWorkflowMode.newReport);
    draft.assets[SolarAssetType.panel]!.warrantyDuration = '10 Years';

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AssetSummaryPage(
          draft: draft,
          assetType: SolarAssetType.panel,
        ),
      ),
    );

    expect(find.text('10'), findsOneWidget);
    expect(find.text('10 Years'), findsNothing);
  });

  testWidgets(
      'asset summary shows canonical Battery Type and image-only thumbnails',
      (tester) async {
    setMobileViewport(tester, const Size(390, 3000));
    final draft = _filledSolarDraft(SolarWorkflowMode.newReport);
    draft.assets[SolarAssetType.battery]!.assets.first.batteryType =
        'LITHIUM_ION';
    draft.assets[SolarAssetType.battery]!.videos.add(const SolarFileRef(
      name: 'commissioning-video.mp4',
      path: '/tmp/commissioning-video.mp4',
      kind: SolarFileKind.video,
    ));

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AssetSummaryPage(
          draft: draft,
          assetType: SolarAssetType.battery,
        ),
      ),
    );

    expect(find.text('LITHIUM_ION'), findsOneWidget);
    expect(find.text('battery.jpg'), findsNothing);
    expect(find.text('battery-installation.jpg'), findsNothing);
    expect(find.text('commissioning-video.mp4'), findsOneWidget);

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AssetSummaryPage(
          draft: draft,
          assetType: SolarAssetType.inverter,
        ),
      ),
    );
    expect(find.text('LITHIUM_ION'), findsNothing);
  });

  testWidgets('installation images page enforces its local requirements', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final draft = SolarInstallationDraft(
      workflow: _StubActivityFacilityRemoteRepository._defaultItems.first,
      mode: SolarWorkflowMode.resubmission,
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
    draft.rejectionComments.add(const WorkflowComment(
      assetType: 'INSTALLATION_IMAGE_ARRAY',
      commentMessage:
          '{"reasonCode":"IMAGE_NOT_CLEAR","comment":"Retake this image"}',
    ));
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
    expect(
      find.byKey(const ValueKey('solar-installation-rejection-ARRAY')),
      findsOneWidget,
    );
    expect(find.text('Image Not Clear'), findsOneWidget);
    expect(find.text('Retake this image'), findsOneWidget);
    for (final requirement in draft.installationRequirements) {
      draft.installationMedia[requirement.code] = [
        SolarFileRef(
          name: '${requirement.code}.jpg',
          path: '/tmp/${requirement.code}.jpg',
          kind: SolarFileKind.image,
          documentUid: 'INSTALLATION-IMAGE-${requirement.code}-1-0',
          geoLocation: const {'latitude': '6.5', 'longitude': '3.6'},
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
        home: withAssetSubmissionBloc(MachineFormPage(
          workflow: _StubActivityFacilityRemoteRepository._defaultItems[1],
        )),
      ),
    );

    expect(find.byKey(const ValueKey('machine-form-card')), findsOneWidget);
    expect(
      find.byKey(const ValueKey('machine-rejection-reasons-panel')),
      findsNothing,
    );
    expect(find.byKey(const ValueKey('machine-form-footer')), findsOneWidget);
    expect(
      find.byKey(const ValueKey('machine-workflow-report-documents')),
      findsNothing,
    );
    expect(find.byKey(const ValueKey('po-number-field')), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-serial-field')), findsOneWidget);
    expect(find.byKey(const ValueKey('invoice-number-field')), findsOneWidget);
    expect(
        find.byKey(const ValueKey('machine-capacity-field')), findsOneWidget);
    expect(find.byKey(const ValueKey('warranty-years-field')), findsOneWidget);
    expect(find.byKey(const ValueKey('electric-board-picker')), findsOneWidget);
    expect(find.byKey(const ValueKey('demo-video-picker')), findsOneWidget);
    expect(find.byKey(const ValueKey('end-user-photo-picker')), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-media-MACHINE_CIVIL_WORK')),
        findsOneWidget);
    expect(find.byType(ImageUploader), findsNWidgets(3));
    expect(find.byType(VideoUploader), findsOneWidget);
    final civilWorkUploader = tester.widget<ImageUploader>(
      find.byKey(const ValueKey('machine-media-MACHINE_CIVIL_WORK')),
    );
    expect(civilWorkUploader.allowMultiples, isTrue);
    expect(civilWorkUploader.maxImages, 2);
    expect(civilWorkUploader.pickMedia, isNull);
    expect(find.text('Required: 1 image'), findsNWidgets(2));
    expect(find.text('Required: 1 video'), findsOneWidget);
    expect(find.text('Required: 2 images'), findsOneWidget);
    expect(find.byKey(const ValueKey('trained-yes')), findsOneWidget);
    expect(find.byKey(const ValueKey('trained-no')), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-otp-request-resend-button')),
        findsOneWidget);
    expect(find.byKey(const ValueKey('machine-otp-field')), findsOneWidget);

    expect(find.byKey(const ValueKey('save-draft-button')), findsOneWidget);
    expect(
      tester
          .widget<DigitButton>(
            find.byKey(const ValueKey('save-draft-button')),
          )
          .isDisabled,
      isTrue,
    );
    expect(
      tester
          .widget<DigitButton>(
            find.byKey(const ValueKey('machine-otp-request-resend-button')),
          )
          .isDisabled,
      isTrue,
    );
    expect(
      tester
          .widget<DigitButton>(
            find.byKey(const ValueKey('machine-verify-otp-button')),
          )
          .isDisabled,
      isTrue,
    );
    expect(
      tester
          .widget<DigitTextFormInput>(
            find.byKey(const ValueKey('machine-otp-field')),
          )
          .isDisabled,
      isTrue,
    );
    final submit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('submit-machine-report-button')),
    );
    expect(submit.isDisabled, isTrue);
  });

  testWidgets('machine resubmission displays latest rejection reasons', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 1600));
    final workflow =
        _StubActivityFacilityRemoteRepository._defaultItems[1].copyWith(
      status: FacilityInstallationStatus.rejectedByQcSpoc,
      workflow: const Workflow(
        state: FacilityInstallationStatus.rejectedByQcSpoc,
      ),
      transactions: const [
        WorkflowTransaction(
          transactionId: 'rejected-machine-transaction',
          comments: [
            WorkflowComment(
              assetType: 'MACHINE',
              commentMessage:
                  '{"reasonCode":"IMAGE_NOT_CLEAR","comment":"Retake the machine image","sectionLabel":"Machine Report"}',
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: withAssetSubmissionBloc(MachineFormPage(workflow: workflow)),
      ),
    );
    await tester.pump();

    final card = find.byKey(const ValueKey('machine-form-card'));
    final reasons = find.byKey(
      const ValueKey('machine-rejection-reasons-panel'),
    );
    expect(find.descendant(of: card, matching: reasons), findsOneWidget);
    expect(
      find.descendant(of: reasons, matching: find.text('Machine Report')),
      findsOneWidget,
    );
    expect(find.text(tr(i18.machineForm.validateTrainingOtp)), findsNothing);
    expect(
      find.descendant(of: reasons, matching: find.text('Image Not Clear')),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: reasons,
        matching: find.text('Retake the machine image'),
      ),
      findsOneWidget,
    );

    // Let the existing Asset Registry hydration timeout complete so the
    // standalone widget test leaves no pending network timer behind.
    await tester.pump(const Duration(seconds: 21));
    await tester.pump();
  });

  testWidgets('machine capacity ignores BOM values', (tester) async {
    setMobileViewport(tester, const Size(390, 844));

    ActivityFacilityWorkflow workflow(
      String id,
      Map<String, dynamic> data,
    ) =>
        ActivityFacilityWorkflow(
          activityFacility: ActivityFacility(
            id: id,
            facilityId: 'facility-$id',
            componentType: 'MACHINE',
            billOfMaterial: BillOfMaterial(data: data),
          ),
        );

    Future<String> capacityFor(ActivityFacilityWorkflow value) async {
      await tester.pumpWidget(MaterialApp(
        key: UniqueKey(),
        theme: DigitTheme.instance.mobileTheme,
        home: withAssetSubmissionBloc(MachineFormPage(workflow: value)),
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));
      return tester
          .widget<EditableText>(find.descendant(
            of: find.byKey(const ValueKey('machine-capacity-field')),
            matching: find.byType(EditableText),
          ))
          .controller
          .text;
    }

    expect(
      await capacityFor(workflow('capacity-from-bom', {
        'capacity': '300 W',
        'machineCapacity': '400 W',
        'machine_1_capacity': '500 W',
      })),
      isEmpty,
    );
  });

  testWidgets(
      'media viewers prefer MDMS titles and preserve file-name fallback',
      (tester) async {
    for (final title in const [
      'Electric Board',
      'Raw Material Demo',
      'Photo with End User',
      'Civil Work (If any)',
    ]) {
      await tester.pumpWidget(MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: ImageViewerPage(
          media: SolarFileRef(
            name: 'machine-image-$title.jpg',
            path: '/missing/machine-image.jpg',
            kind: SolarFileKind.image,
            displayTitle: title,
          ),
        ),
      ));
      expect(find.text(title), findsOneWidget);
      expect(find.byType(AppBar), findsNothing);
      expect(find.byType(ScrollableContent), findsOneWidget);
      expect(find.byKey(const ValueKey('report-back-button')), findsOneWidget);
    }

    await tester.pumpWidget(MaterialApp(
      theme: DigitTheme.instance.mobileTheme,
      home: const ImageViewerPage(
        media: SolarFileRef(
          name: 'solar-panel.jpg',
          path: '/missing/solar-panel.jpg',
          kind: SolarFileKind.image,
        ),
      ),
    ));
    expect(find.text('solar-panel.jpg'), findsOneWidget);
  });

  testWidgets('image viewer uses E4H compact natural-height layout',
      (tester) async {
    setMobileViewport(tester, const Size(390, 844));
    final imagePath = File('assets/images/digit_logo.png').absolute.path;
    expect(File(imagePath).existsSync(), isTrue);
    await tester.pumpWidget(MaterialApp(
      theme: DigitTheme.instance.mobileTheme,
      home: ImageViewerPage(
        media: SolarFileRef(
          name: 'digit_logo.png',
          path: imagePath,
          localPath: imagePath,
          kind: SolarFileKind.image,
          displayTitle: 'Electric Board',
        ),
      ),
    ));
    await tester.pump();
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 100)),
    );
    await tester.pump();

    final interactive = find.byKey(
      const ValueKey('image-viewer-interactive'),
    );
    expect(interactive, findsOneWidget);
    expect(
      tester.getSize(interactive).height,
      lessThan(tester.getSize(find.byType(ScrollableContent)).height),
    );
  });

  testWidgets('read-only machine form does not enable a missing fixed footer',
      (tester) async {
    setMobileViewport(tester, const Size(390, 844));
    final workflow = _StubActivityFacilityRemoteRepository._defaultItems[1];

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: withAssetSubmissionBloc(MachineFormPage(
          workflow: workflow,
          readOnly: true,
        )),
      ),
    );
    await tester.pump();

    // Let the read-only Asset Registry hydration complete through its
    // existing network/cache timeout path, then verify the rebuilt page too.
    await tester.pump(const Duration(seconds: 21));
    await tester.pump(const Duration(seconds: 3));

    expect(tester.takeException(), isNull);
    final content = tester.widget<ScrollableContent>(
      find.byKey(ValueKey('machine-form-${workflow.facilityTitle}')),
    );
    expect(content.enableFixedDigitButton, isFalse);
    expect(content.footer, isNull);
    expect(find.byKey(const ValueKey('machine-form-footer')), findsNothing);
    expect(find.byKey(const ValueKey('machine-otp-widget')), findsNothing);

    final cardFinder = find.byKey(const ValueKey('machine-form-card'));
    final documentsFinder =
        find.byKey(const ValueKey('machine-workflow-report-documents'));
    expect(
      find.descendant(of: cardFinder, matching: documentsFinder),
      findsOneWidget,
    );
    final card = tester.widget<DigitCard>(cardFinder);
    final trainedEndUserIndex = card.children.indexWhere(
      (child) => child.key == const ValueKey('machine-trainedEndUser'),
    );
    final workflowDocumentsIndex = card.children.indexWhere(
      (child) =>
          child.key == const ValueKey('machine-workflow-report-documents'),
    );
    expect(trainedEndUserIndex, greaterThanOrEqualTo(0));
    expect(workflowDocumentsIndex, greaterThan(trainedEndUserIndex));

    final poField = tester.widget<DigitTextFormInput>(
      find.descendant(
        of: find.byKey(const ValueKey('po-number-field')),
        matching: find.byType(DigitTextFormInput),
      ),
    );
    expect(poField.isDisabled, isTrue);
    expect(poField.readOnly, isTrue);
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

  testWidgets(
      'machine draft saves via success panel; submit hands off to sync screen',
      (tester) async {
    setMobileViewport(tester, const Size(390, 844));
    final originalOtpRepository = otpRepository;
    otpRepository = _FakeOtpRepository();
    addTearDown(() => otpRepository = originalOtpRepository);
    var mediaPickCount = 0;

    Future<void> pumpForm() async {
      await pumpAuthenticatedRoute(
        tester,
        MachineFormRoute(
          workflow: _StubActivityFacilityRemoteRepository._defaultItems[1],
          pickMedia: (kind, source) async {
            mediaPickCount++;
            final extension = kind == MachineMediaKind.image ? 'jpg' : 'mp4';
            return XFile(
              '/tmp/machine-media-$mediaPickCount.$extension',
              name: 'machine-media-$mediaPickCount.$extension',
            );
          },
        ),
      );
    }

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

    Future<void> selectMedia(String key, {required bool video}) async {
      final target = find.byKey(ValueKey(key));
      await scrollIntoView(target);
      await tester.tap(target);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(
          ValueKey(video ? 'video-uploader-files' : 'image-uploader-files')));
      await tester.pumpAndSettle();
    }

    Future<void> fillRequiredFields() async {
      await enter('po-number-field', 'PO-100');
      await enter('machine-serial-field', 'SERIAL-100');
      await enter('invoice-number-field', 'INVOICE-100');
      await enter('machine-capacity-field', '500 W');
      await enter('warranty-years-field', '2');
      await selectMedia('electric-board-picker', video: false);
      await selectMedia('demo-video-picker', video: true);
      await selectMedia('end-user-photo-picker', video: false);
    }

    await pumpForm();
    final saveDraft = find.byKey(const ValueKey('save-draft-button'));
    final requestOtp =
        find.byKey(const ValueKey('machine-otp-request-resend-button'));
    final verifyOtp = find.byKey(const ValueKey('machine-verify-otp-button'));
    final submitReport =
        find.byKey(const ValueKey('submit-machine-report-button'));
    expect(tester.widget<DigitButton>(saveDraft).isDisabled, isTrue);
    expect(tester.widget<DigitButton>(requestOtp).isDisabled, isTrue);
    expect(tester.widget<DigitButton>(verifyOtp).isDisabled, isTrue);
    expect(tester.widget<DigitButton>(submitReport).isDisabled, isTrue);
    expect(
      tester
          .widget<DigitTextFormInput>(
            find.byKey(const ValueKey('machine-otp-field')),
          )
          .isDisabled,
      isTrue,
    );

    await fillRequiredFields();
    expect(tester.widget<DigitButton>(saveDraft).isDisabled, isFalse);
    expect(tester.widget<DigitButton>(requestOtp).isDisabled, isFalse);
    expect(tester.widget<DigitButton>(verifyOtp).isDisabled, isTrue);

    // Optional Civil Work is valid when empty, but incomplete once started
    // until its MDMS requiredCount of two is reached.
    await selectMedia('machine-media-MACHINE_CIVIL_WORK', video: false);
    expect(tester.widget<DigitButton>(saveDraft).isDisabled, isTrue);
    expect(tester.widget<DigitButton>(requestOtp).isDisabled, isTrue);
    await selectMedia('machine-media-MACHINE_CIVIL_WORK', video: false);
    expect(tester.widget<DigitButton>(saveDraft).isDisabled, isFalse);
    expect(tester.widget<DigitButton>(requestOtp).isDisabled, isFalse);
    var civilRemove = find.descendant(
      of: find.byKey(const ValueKey('machine-media-MACHINE_CIVIL_WORK')),
      matching: find.byKey(const ValueKey('image-uploader-remove')),
    );
    await tester.tap(civilRemove.first);
    await tester.pump();
    expect(tester.widget<DigitButton>(saveDraft).isDisabled, isTrue);
    civilRemove = find.descendant(
      of: find.byKey(const ValueKey('machine-media-MACHINE_CIVIL_WORK')),
      matching: find.byKey(const ValueKey('image-uploader-remove')),
    );
    await tester.tap(civilRemove.first);
    await tester.pump();
    expect(tester.widget<DigitButton>(saveDraft).isDisabled, isFalse);
    expect(tester.widget<DigitButton>(requestOtp).isDisabled, isFalse);

    await tester.ensureVisible(saveDraft);
    await tester.tap(saveDraft);
    await tester.pump();
    await tester.pump(const Duration(seconds: 6));
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

    // A fresh editable form uses the same completion gate before OTP.
    await pumpForm();
    await fillRequiredFields();
    expect(tester.widget<DigitButton>(saveDraft).isDisabled, isFalse);
    expect(tester.widget<DigitButton>(requestOtp).isDisabled, isFalse);

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

    await scrollIntoView(
      find.byKey(const ValueKey('machine-otp-request-resend-button')),
    );
    await tester.tap(
      find.byKey(const ValueKey('machine-otp-request-resend-button')),
    );
    await tester.pump();
    expect(tester.widget<DigitButton>(verifyOtp).isDisabled, isTrue);

    await enter('machine-otp-field', '1234');
    expect(tester.widget<DigitButton>(verifyOtp).isDisabled, isFalse);
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

    await enter('po-number-field', '');
    expect(tester.widget<DigitButton>(saveDraft).isDisabled, isTrue);
    expect(tester.widget<DigitButton>(submitReport).isDisabled, isTrue);
    expect(
      find.byKey(const ValueKey('machine-otp-verified-message')),
      findsOneWidget,
    );

    // Dismiss the "OTP verified" SnackBar the tap above raised — it sits at
    // the bottom of the screen and would otherwise cover the fixed footer's
    // submit button below.
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();

    // The "OTP verified" SnackBar sits at the bottom of the screen and
    // overlaps this page's fixed (non-Scaffold-managed) footer button —
    // clear it explicitly rather than relying on its auto-dismiss timing.
    ScaffoldMessenger.of(tester.element(find.byType(Scaffold).first))
        .clearSnackBars();
    await tester.pumpAndSettle();

    // OTP approval automatically hands the completed report to the
    // resumable background submission pipeline without navigating away.
    expect(tester.takeException(), isNull);
    expect(find.byType(MachineFormPage), findsOneWidget);
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
              child: withAssetSubmissionBloc(page),
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

    // Each report-list page above renders facility cards whose progress bar
    // and cache reads start real Isar `.timeout()` guards (now genuinely
    // exercised — see `test/flutter_test_config.dart`); moving to the next
    // page/size before those resolve leaves them "pending" at test end
    // otherwise.
    await tester.pump(const Duration(seconds: 3));
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
