import 'dart:convert';
import 'dart:io';

import 'package:digit_forms_engine/models/schema_object/schema_object.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/blocs/localization/app_localization.dart';
import 'package:livelihood/main.dart';
import 'package:livelihood/model/amc/scheduled_visit.dart';
import 'package:livelihood/model/login/loginModel.dart';
import 'package:livelihood/model/response/responsemodel.dart';
import 'package:livelihood/pages/amc/amc_home.dart';
import 'package:livelihood/pages/home_page.dart';
import 'package:livelihood/pages/role_selection.dart';
import 'package:livelihood/repositories/amc/amc_dummy_backend.dart';
import 'package:livelihood/repositories/amc/amc_dummy_form_schema.dart';
import 'package:livelihood/repositories/amc/amc_remote_data_source.dart';
import 'package:livelihood/repositories/amc/amc_system_status_repo.dart';
import 'package:livelihood/repositories/amc/scheduled_visit_repo.dart';
import 'package:livelihood/repositories/auth_repo.dart';
import 'package:livelihood/router/app_router.dart';
import 'package:livelihood/utils/amc/amc_module_readiness.dart';
import 'package:livelihood/utils/amc/amc_utils.dart';
import 'package:livelihood/utils/envConfig.dart';
import 'package:livelihood/utils/i18_key_constants.dart' as i18;
import 'package:livelihood/utils/role_login_resolver.dart';

const _secureStorageChannel =
    MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
final Map<String, String> _secureStorageValues = {};

String tr(String code) => AppLocalizations.fallbackLabel(code);

class _StubAuthRepository implements AuthRepository {
  _StubAuthRepository(this.roles);

  final List<String> roles;

  @override
  Future<ResponseModel> validateLogin(LoginModel body) async => ResponseModel(
        access_token: 'stub-access-token',
        token_type: 'bearer',
        refresh_token: 'stub-refresh-token',
        scope: 'read',
        userRequest: UserRequest(
          id: 7,
          uuid: '1b4f5c0e-2a6d-4c4e-9f1a-0c3d5e7f9a11',
          userName: 'amc.user',
          name: 'AMC Staff',
          mobileNumber: '9900112233',
          emailId: null,
          type: 'EMPLOYEE',
          active: true,
          roles: [
            for (final code in roles)
              Roles(name: code, code: code, tenantId: 'livelihood'),
          ],
          tenantId: 'livelihood',
        ),
      );

  @override
  Future<String> refreshToken() async => 'stub-access-token';

  @override
  Future<void> logout() async {}

  @override
  Future<void> reportLogin(UserRequest user) async {}
}

/// In-memory stand-in for the Isar-backed system status store.
class _MemorySystemStatusStore implements AmcSystemStatusLocalStore {
  final Map<String, Map<String, dynamic>> values = {};

  @override
  Future<Map<String, dynamic>?> read(String visitId) async => values[visitId];

  @override
  Future<void> write(String visitId, Map<String, dynamic> value) async =>
      values[visitId] = {...?values[visitId], ...value};
}

/// In-memory AMC backend for widget tests (no file IO, no delays).
class _FakeAmcRemoteDataSource implements AmcRemoteDataSource {
  _FakeAmcRemoteDataSource({this.failSchema = false});

  final bool failSchema;
  final List<Map<String, dynamic>> workflowBodies = [];
  final List<Map<String, dynamic>> systemStatusBodies = [];
  bool failSystemStatus = false;

  @override
  Future<void> updateSystemStatus(Map<String, dynamic> body) async {
    if (failSystemStatus) throw StateError('offline');
    systemStatusBodies.add(body);
  }

  @override
  Future<Map<String, dynamic>> searchVisits({
    required Map<String, dynamic> searchCriteria,
    required int limit,
    required int offset,
  }) async =>
      {'ScheduledVisits': const [], 'TotalCount': 0};

  @override
  Future<void> updateVisitWorkflow(Map<String, dynamic> body) async =>
      workflowBodies.add(body);

  @override
  Future<void> resendVisitOtp(String visitId) async {}

  @override
  Future<List<dynamic>> searchAmcFormSchemaDocs(
      Map<String, dynamic> mdmsRequestBody) async {
    if (failSchema) throw StateError('MDMS unavailable');
    return [dummyAmcFormSchemaDoc('livelihood')];
  }

  @override
  Future<String> uploadFile(String localFilePath) async => 'fake-filestore-id';

  @override
  Future<List<int>?> downloadFile(String fileStoreId) async => null;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    await envConfig.initialize();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_secureStorageChannel, (call) async {
      final key = call.arguments['key'] as String?;
      switch (call.method) {
        case 'write':
          _secureStorageValues[key!] = call.arguments['value'] as String;
          return null;
        case 'read':
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
  });

  setUp(() {
    _secureStorageValues.clear();
    AmcModuleReadiness.invalidate();
    tempGrantAmcToFieldStaff = false;
    addTearDown(() => tempGrantAmcToFieldStaff = true);
  });

  test('TEMP: field staff also get AMC while the testing access is on', () {
    tempGrantAmcToFieldStaff = true;
    final r = RoleLoginResolver.resolveRoleCodes(
        [installationReportPartAEditorRoleCode]);
    expect(r.requiresSelection, isTrue);
    expect(r.selectionOptions,
        [RoleSelectionOption.staff, RoleSelectionOption.amc]);
  });

  group('RoleLoginResolver', () {
    test('installation (Part A) only goes straight to installation', () {
      final r = RoleLoginResolver.resolveRoleCodes(
          [installationReportPartAEditorRoleCode]);
      expect(r.requiresSelection, isFalse);
      expect(r.directUserType, USER_TYPES.FIELD_STAFF);
    });

    test('AMC only goes straight to AMC', () {
      final r = RoleLoginResolver.resolveRoleCodes([amcFieldStaffRoleCode]);
      expect(r.requiresSelection, isFalse);
      expect(r.directUserType, USER_TYPES.AMC);
    });

    test('Installation + AMC requires role selection', () {
      final r = RoleLoginResolver.resolveRoleCodes(
          [installationReportPartAEditorRoleCode, amcFieldStaffRoleCode]);
      expect(r.requiresSelection, isTrue);
      expect(r.selectionOptions,
          [RoleSelectionOption.staff, RoleSelectionOption.amc]);
    });

    test('only Part A or AMC grant access', () {
      expect(RoleLoginResolver.hasSupportedRole(['EMPLOYEE']), isFalse);
      expect(RoleLoginResolver.hasSupportedRole([amcFieldStaffRoleCode]),
          isTrue);
    });
  });

  group('AMC helpers (E4H parity)', () {
    test('formatAmcNumber and boundary locality', () {
      expect(formatAmcNumber(2, 12, 3), '2 / 4');
      expect(formatAmcNumber(null, 12, 5), '--- / ---');
      final locality =
          parseBoundaryCodeLocality('IN_KARNATAKA_MYSURU_HUNSUR');
      expect(locality.state, 'KARNATAKA');
      expect(locality.district, 'MYSURU');
      expect(locality.block, 'HUNSUR');
      expect(lastPhoneDigits('9876543210'), '3210');
    });

    test('dummy AMC form schema loads in digit_forms_engine', () {
      final transformed =
          transformSelcoFormMdmsDocToSchema(dummyAmcFormSchemaDoc('t'));
      final schema = SchemaObject.fromJson(transformed);
      expect(schema.name, amcFormSchemaKey);
      expect(schema.pages.keys.first, amcFormFirstPage);
      expect(schema.pages[amcFormFirstPage]!.properties!.keys,
          contains('faults_observed'));
    });

    test('seed visits parse and round-trip through JSON', () {
      for (final raw in dummySeedVisits()) {
        final visit = ScheduledVisit.fromJson(raw);
        // The app always persists through jsonEncode (Isar cache, bookmarks).
        final again = ScheduledVisit.fromJson(
            jsonDecode(jsonEncode(visit.toJson())) as Map<String, dynamic>);
        expect(again.id, visit.id);
        expect(again.status, visit.status);
        expect(again.facility?.facilityName, visit.facility?.facilityName);
        expect(again.facility?.facility_poc_phone, '9876543210');
        expect(again.displayDate, isNotNull);
      }
    });
  });

  group('AMC delayed filter', () {
    final now = DateTime(2026, 11, 12, 10, 30);
    ScheduledVisit visitOn(DateTime? date, {String status = 'SCHEDULED'}) =>
        ScheduledVisit(id: 'v', status: status, scheduledDate: date);

    test('delay is decided by date: due today or later is not delayed', () {
      expect(amcDelayedScheduledBefore(now),
          DateTime(2026, 11, 11, 23, 59, 59, 999));
      expect(
          visitOn(DateTime(2026, 11, 11, 23, 59)).isAmcDelayed(now), isTrue);
      expect(visitOn(DateTime(2026, 11, 1)).isAmcDelayed(now), isTrue);
      expect(visitOn(DateTime(2026, 11, 12)).isAmcDelayed(now), isFalse);
      expect(visitOn(DateTime(2026, 11, 12, 9)).isAmcDelayed(now), isFalse);
      expect(visitOn(DateTime(2026, 11, 20)).isAmcDelayed(now), isFalse);
      expect(visitOn(null).isAmcDelayed(now), isFalse);
    });

    test('only SCHEDULED visits can be delayed', () {
      final past = DateTime(2026, 11, 1);
      for (final status in [
        'PENDING_OTP_APPROVAL',
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
      ]) {
        expect(visitOn(past, status: status).isAmcDelayed(now), isFalse,
            reason: status);
      }
    });

    test('search request uses the backend scheduledDateTo field', () {
      final map = ScheduledVisitSearchCriteria(
        statuses: const ['SCHEDULED'],
        scheduledTo: amcDelayedScheduledBefore(now),
      ).toApiMap();
      expect(map['scheduledDateTo'],
          DateTime(2026, 11, 11, 23, 59, 59, 999).millisecondsSinceEpoch);
      expect(map.containsKey('scheduledTo'), isFalse);
    });

    test('dummy backend returns only overdue SCHEDULED visits', () async {
      final dir = Directory.systemTemp.createTempSync('amc_dummy_delayed');
      addTearDown(() => dir.deleteSync(recursive: true));
      final backend = DummyAmcRemoteDataSource(
          latency: Duration.zero, storageDirectory: () async => dir);

      final res = await backend.searchVisits(
        searchCriteria: {
          'statuses': const ['SCHEDULED'],
          'scheduledDateTo': amcDelayedScheduledBefore().millisecondsSinceEpoch,
        },
        limit: 10,
        offset: 0,
      );
      final ids = (res['ScheduledVisits'] as List).map((v) => v['id']).toList();
      // dummy-visit-009 is due today; 001-003 are in the future;
      // 004-007 are past but not SCHEDULED.
      expect(ids, ['dummy-visit-008']);
      expect(res['TotalCount'], 1);
    });
  });

  group('AMC pre-report system status', () {
    late _MemorySystemStatusStore store;
    late _FakeAmcRemoteDataSource remote;
    late AmcSystemStatusRepository repo;
    const visit = ScheduledVisit(id: 'v1', status: 'SCHEDULED');

    setUp(() {
      store = _MemorySystemStatusStore();
      remote = _FakeAmcRemoteDataSource();
      repo = AmcSystemStatusRepository(store: store, dataSource: remote);
    });

    test('functional system: answers saved, nothing sent', () async {
      final result = await repo.save(
          visit: visit, isSystemInUse: false, isSystemFunctional: true);
      expect(result, AmcSystemStatusSaveResult.saved);
      expect(remote.systemStatusBodies, isEmpty);
      final saved = await repo.load(visit);
      expect(saved?.isSystemInUse, isFalse);
      expect(saved?.isSystemFunctional, isTrue);
    });

    test('non-functional is sent once per activity, however often saved',
        () async {
      expect(
          await repo.save(
              visit: visit, isSystemInUse: true, isSystemFunctional: false),
          AmcSystemStatusSaveResult.notified);
      expect(remote.systemStatusBodies.single['visitId'], 'v1');
      expect(remote.systemStatusBodies.single['systemStatus'],
          {'isSystemInUse': true, 'isSystemFunctional': false});

      // Saving again (No, Yes, No) never sends a second request.
      for (final functional in [false, true, false]) {
        expect(
            await repo.save(
                visit: visit,
                isSystemInUse: true,
                isSystemFunctional: functional),
            AmcSystemStatusSaveResult.saved);
      }
      expect(remote.systemStatusBodies, hasLength(1));
      expect((await repo.load(visit))?.nonFunctionalNotified, isTrue);
    });

    test('a failed send is not retained, and saving again retries', () async {
      remote.failSystemStatus = true;
      expect(
          await repo.save(
              visit: visit, isSystemInUse: true, isSystemFunctional: false),
          AmcSystemStatusSaveResult.notifyFailed);
      // The answers are still saved; the report is not blocked.
      expect((await repo.load(visit))?.isSystemFunctional, isFalse);
      expect((await repo.load(visit))?.nonFunctionalNotified, isFalse);

      remote.failSystemStatus = false;
      expect(
          await repo.save(
              visit: visit, isSystemInUse: true, isSystemFunctional: false),
          AmcSystemStatusSaveResult.notified);
      expect(remote.systemStatusBodies, hasLength(1));
    });

    test('rework: answers and the sent flag come from the submitted report',
        () async {
      const rejected = ScheduledVisit(
        id: 'v2',
        status: 'REJECTED',
        visitReport: ScheduledVisitReport(additionalDetails: {
          'systemStatus': {
            'isSystemInUse': true,
            'isSystemFunctional': false,
            'nonFunctionalNotified': true,
          },
        }),
      );
      final shown = await repo.load(rejected);
      expect(shown?.isSystemInUse, isTrue);
      expect(shown?.isSystemFunctional, isFalse);

      expect(
          await repo.save(
              visit: rejected, isSystemInUse: true, isSystemFunctional: false),
          AmcSystemStatusSaveResult.saved);
      expect(remote.systemStatusBodies, isEmpty);
    });

    test('answers go with the report in visitReport.additionalDetails',
        () async {
      expect(await repo.reportAdditionalDetails('v1'), isNull);
      await repo.save(
          visit: visit, isSystemInUse: false, isSystemFunctional: false);
      final details = await repo.reportAdditionalDetails('v1');

      await ScheduledVisitRemoteRepository(dataSource: remote)
          .updateVisitWorkflow(
        visitId: 'v1',
        schemaCode: '12345678',
        version: 1,
        responses: const {'faults_observed': 'NO'},
        reportAdditionalDetails: details,
      );
      final report = remote.workflowBodies.single['visitReport'] as Map;
      expect(report['additionalDetails'], {
        'systemStatus': {
          'isSystemInUse': false,
          'isSystemFunctional': false,
          'nonFunctionalNotified': true,
        },
      });
      // The MDMS form answers are untouched.
      expect(report['responses'], {'faults_observed': 'NO'});
    });

    test('dummy backend records the update and keeps it with the report',
        () async {
      final dir = Directory.systemTemp.createTempSync('amc_dummy_status');
      addTearDown(() => dir.deleteSync(recursive: true));
      final backend = DummyAmcRemoteDataSource(
          latency: Duration.zero, storageDirectory: () async => dir);

      await backend.updateSystemStatus(buildSystemStatusRequest(
          visitId: 'dummy-visit-001',
          isSystemInUse: true,
          isSystemFunctional: false));
      await backend.updateVisitWorkflow({
        'visitId': 'dummy-visit-001',
        'workflow': {'action': 'SUBMIT_VISIT_REPORT'},
        'visitReport': {
          'schemaCode': '12345678',
          'version': 1,
          'responses': {'faults_observed': 'YES'},
          'additionalDetails': {
            'systemStatus': {
              'isSystemInUse': true,
              'isSystemFunctional': false,
              'nonFunctionalNotified': true,
            },
          },
        },
      });
      await expectLater(
        backend.updateSystemStatus(buildSystemStatusRequest(
            visitId: 'missing',
            isSystemInUse: true,
            isSystemFunctional: false)),
        throwsA(isA<Exception>()),
      );

      final res = await backend.searchVisits(
          searchCriteria: const {}, limit: 100, offset: 0);
      final raw = (res['ScheduledVisits'] as List)
          .cast<Map<String, dynamic>>()
          .firstWhere((v) => v['id'] == 'dummy-visit-001');
      expect(raw['dummySystemStatusUpdates'], hasLength(1));
      final status = AmcSystemStatusRepository.fromSubmittedReport(
          ScheduledVisit.fromJson(raw));
      expect(status?.isSystemFunctional, isFalse);
      expect(status?.nonFunctionalNotified, isTrue);
    });

    test('submitted sample reports carry status answers for read-only views',
        () {
      final approved = dummySeedVisits()
          .map(ScheduledVisit.fromJson)
          .firstWhere((v) => v.status == 'APPROVED');
      final status = AmcSystemStatusRepository.fromSubmittedReport(approved);
      expect(status?.isComplete, isTrue);
    });
  });

  group('Dummy AMC backend', () {
    late Directory dir;
    late DummyAmcRemoteDataSource backend;

    setUp(() {
      dir = Directory.systemTemp.createTempSync('amc_dummy');
      backend = DummyAmcRemoteDataSource(
        latency: Duration.zero,
        storageDirectory: () async => dir,
      );
    });

    tearDown(() => dir.deleteSync(recursive: true));

    Future<String> statusOf(String id) async {
      final res = await backend.searchVisits(
          searchCriteria: const {}, limit: 100, offset: 0);
      return ((res['ScheduledVisits'] as List)
          .cast<Map>()
          .firstWhere((v) => v['id'] == id))['status'] as String;
    }

    test('filters by status and name, with paging', () async {
      final res = await backend.searchVisits(
        searchCriteria: const {
          'statuses': ['SCHEDULED'],
          'facilityName': 'kollegal',
        },
        limit: 10,
        offset: 0,
      );
      expect(res['TotalCount'], 1);
      expect((res['ScheduledVisits'] as List).single['id'], 'dummy-visit-002');
    });

    test('report submit then completion code follows the AMC workflow',
        () async {
      await backend.updateVisitWorkflow({
        'visitId': 'dummy-visit-001',
        'workflow': {'action': 'SUBMIT_VISIT_REPORT'},
        'visitReport': {
          'schemaCode': '12345678',
          'version': 1,
          'responses': {'faults_observed': 'YES'},
        },
      });
      expect(await statusOf('dummy-visit-001'), 'PENDING_OTP_APPROVAL');

      await expectLater(
        backend.updateVisitWorkflow({
          'visitId': 'dummy-visit-001',
          'workflow': {'action': 'SUBMIT_OTP'},
          'visitReport': {'otpReference': '0000'},
        }),
        throwsA(isA<Exception>()),
      );
      expect(await statusOf('dummy-visit-001'), 'PENDING_OTP_APPROVAL');

      await backend.updateVisitWorkflow({
        'visitId': 'dummy-visit-001',
        'workflow': {'action': 'SUBMIT_OTP'},
        'visitReport': {'otpReference': dummyAmcOtp},
      });
      expect(await statusOf('dummy-visit-001'), 'PENDING_APPROVAL');
    });

    test('uploaded files can be downloaded by their dummy id', () async {
      final file = File('${dir.path}/photo.jpg')..writeAsBytesSync([1, 2, 3]);
      final id = await backend.uploadFile(file.path);
      expect(isDummyFileStoreId(id), isTrue);
      expect(await backend.downloadFile(id), [1, 2, 3]);
    });
  });

  test('SUBMIT_VISIT_REPORT request body matches E4H', () async {
    final fake = _FakeAmcRemoteDataSource();
    await ScheduledVisitRemoteRepository(dataSource: fake).updateVisitWorkflow(
      visitId: 'v1',
      schemaCode: '12345678',
      version: 1,
      responses: const {'faults_observed': 'NO'},
      visitDocuments: [
        AmcDocument(
          documentType: 'image',
          fileStore: 'fs-1',
          documentUid: 'DOC-AMC-image-1',
          geoLocation: AmcGeoLocation(latitude: '12.1', longitude: '76.6'),
        ),
      ],
    );
    final body = fake.workflowBodies.single;
    expect(body['visitId'], 'v1');
    expect(body['workflow']['action'], 'SUBMIT_VISIT_REPORT');
    expect(body['visitReport']['schemaCode'], '12345678');
    expect(body['visitReport']['responses'], {'faults_observed': 'NO'});
    final doc = (body['visitReport']['documents'] as List).single as Map;
    expect(doc['fileStoreId'], 'fs-1');
    expect(doc['geoLocation'], containsPair('latitude', '12.1'));
  });

  group('Login routing', () {
    void setViewport(WidgetTester tester) {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
    }

    Future<void> loginAs(WidgetTester tester, List<String> roles,
        {AmcRemoteDataSource? amc}) async {
      setViewport(tester);
      final previousAmc = amcRemoteDataSource;
      amcRemoteDataSource = amc ?? _FakeAmcRemoteDataSource();
      addTearDown(() => amcRemoteDataSource = previousAmc);
      loginAuthRepository = _StubAuthRepository(roles);
      addTearDown(() => loginAuthRepository = HttpAuthRepository());

      final router = AppRouter();
      await tester.pumpWidget(LivelihoodApp(router: router));
      await tester.pumpAndSettle();
      await router.replaceAll(
        const [
          UnauthenticatedRouteWrapper(children: [LoginRoute()])
        ],
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const ValueKey('consent-checkbox')));
      await tester.pump();
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('user-id-field')),
          matching: find.byType(EditableText),
        ),
        'amc.user',
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
    }

    testWidgets('an AMC-only user lands on AMC home after the form loads',
        (tester) async {
      await loginAs(tester, [amcFieldStaffRoleCode]);

      expect(find.byType(AmcHomePage), findsOneWidget);
      expect(find.byType(HomePage), findsNothing);
      expect(find.byKey(const ValueKey('amc-home-report')), findsOneWidget);
      expect(find.byKey(const ValueKey('amc-home-data-sync')), findsOneWidget);
      expect(find.byKey(const ValueKey('amc-mdms-loading-dialog')),
          findsNothing);
      expect(AmcModuleReadiness.isReady, isTrue);
      // The AMC form schema was cached for offline use, as in E4H.
      expect(_secureStorageValues.keys, contains('amcFormConfigsRaw'));
      expect(_secureStorageValues['individualId'], 'amc.user');
    });

    testWidgets('AMC home blocks entry with Retry when the form cannot load',
        (tester) async {
      await loginAs(tester, [amcFieldStaffRoleCode],
          amc: _FakeAmcRemoteDataSource(failSchema: true));

      expect(find.byType(AmcHomePage), findsOneWidget);
      expect(find.byKey(const ValueKey('amc-mdms-retry')), findsOneWidget);
      expect(find.text(tr(i18.amcCommon.somethingWentWrong)), findsOneWidget);
      expect(AmcModuleReadiness.isReady, isFalse);
    });

    testWidgets('an Installation + AMC user picks a module first',
        (tester) async {
      await loginAs(tester,
          [installationReportPartAEditorRoleCode, amcFieldStaffRoleCode]);

      expect(find.byType(RoleSelectionPage), findsOneWidget);
      expect(find.byKey(const ValueKey('role-selection-staff')),
          findsOneWidget);
      expect(find.byKey(const ValueKey('role-selection-amc')), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('role-selection-amc')));
      await tester.pumpAndSettle();

      expect(find.byType(AmcHomePage), findsOneWidget);
    });

    testWidgets('an Installation + AMC user can pick Installation',
        (tester) async {
      await loginAs(tester,
          [installationReportPartAEditorRoleCode, amcFieldStaffRoleCode]);

      await tester.tap(find.byKey(const ValueKey('role-selection-staff')));
      await tester.pumpAndSettle();

      expect(find.byType(HomePage), findsOneWidget);
    });
  });
}
