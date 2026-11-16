import 'dart:convert';
import 'dart:io';

import 'package:digit_forms_engine/blocs/app_localization.dart'
    as forms_localization;
import 'package:digit_forms_engine/blocs/forms/forms.dart';
import 'package:digit_forms_engine/json_forms.dart';
import 'package:digit_forms_engine/models/property_schema/property_schema.dart';
import 'package:digit_forms_engine/models/schema_object/schema_object.dart';
import 'package:digit_forms_engine/utils/utils.dart'
    show evaluateVisibilityExpression;
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/blocs/localization/app_localization.dart';
import 'package:livelihood/data/nosql/localization.dart' show Localization;
import 'package:livelihood/blocs/amc_otp/amc_otp.dart';
import 'package:livelihood/main.dart';
import 'package:livelihood/model/amc/amc_site_details.dart';
import 'package:livelihood/model/amc/scheduled_visit.dart';
import 'package:livelihood/model/appconfig/mdmsResponse.dart' show Language;
import 'package:livelihood/model/login/loginModel.dart';
import 'package:livelihood/model/response/responsemodel.dart';
import 'package:livelihood/pages/amc/amc_home.dart';
import 'package:livelihood/pages/home_page.dart';
import 'package:livelihood/pages/role_selection.dart';
import 'package:livelihood/repositories/amc/amc_dummy_backend.dart';
import 'package:livelihood/repositories/amc/amc_dummy_form_schema.dart';
import 'package:livelihood/repositories/amc/amc_dummy_localization.dart';
import 'package:livelihood/repositories/amc/amc_remote_data_source.dart';
import 'package:livelihood/repositories/amc/amc_system_status_repo.dart';
import 'package:livelihood/repositories/amc/scheduled_visit_repo.dart';
import 'package:livelihood/repositories/auth_repo.dart';
import 'package:livelihood/router/app_router.dart';
import 'package:livelihood/utils/amc/amc_module_readiness.dart';
import 'package:livelihood/utils/amc/amc_rejection_reasons.dart';
import 'package:livelihood/utils/amc/amc_utils.dart';
import 'package:livelihood/utils/envConfig.dart';
import 'package:livelihood/utils/i18_key_constants.dart' as i18;
import 'package:livelihood/utils/role_login_resolver.dart';
import 'package:reactive_forms/reactive_forms.dart';
import 'package:livelihood/widgets/amc/amc_reading_fields.dart';

const _secureStorageChannel =
    MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
final Map<String, String> _secureStorageValues = {};

String tr(String code) => AppLocalizations.fallbackLabel(code);

/// A form field label as Digit UI draws it: rich text, in sentence case,
/// followed by the required "*".
Finder _label(String text) => find.textContaining(
    RegExp('^${RegExp.escape(text)}\\s*\\*?\$', caseSensitive: false),
    findRichText: true);

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

/// In-memory stand-in for the device-wide status update queue.
class _MemorySystemStatusQueue implements AmcSystemStatusQueueStore {
  List<Map<String, dynamic>> items = [];

  @override
  Future<List<Map<String, dynamic>>> read() async => [...items];

  @override
  Future<void> write(List<Map<String, dynamic>> value) async =>
      items = [...value];
}

DioException _dioError({int? status}) {
  final options = RequestOptions(path: '/status');
  return DioException(
    requestOptions: options,
    type: status == null
        ? DioExceptionType.connectionError
        : DioExceptionType.badResponse,
    response: status == null
        ? null
        : Response(requestOptions: options, statusCode: status),
  );
}

/// In-memory AMC backend for widget tests (no file IO, no delays).
class _FakeAmcRemoteDataSource implements AmcRemoteDataSource {
  _FakeAmcRemoteDataSource({this.failSchema = false});

  final bool failSchema;
  final List<Map<String, dynamic>> workflowBodies = [];
  final List<Map<String, dynamic>> systemStatusBodies = [];

  /// Thrown by [updateSystemStatus] while set.
  Object? systemStatusError;

  @override
  Future<void> updateSystemStatus(Map<String, dynamic> body) async {
    final error = systemStatusError;
    if (error != null) throw error;
    systemStatusBodies.add(body);
  }

  @override
  Future<Map<String, dynamic>> searchVisits({
    required Map<String, dynamic> searchCriteria,
    required int limit,
    required int offset,
  }) async =>
      {'ScheduledVisits': const [], 'TotalCount': 0};

  /// Thrown by [updateVisitWorkflow] while set.
  Object? workflowError;

  /// Returned by [updateVisitWorkflow].
  Map<String, dynamic>? workflowResponse;

  @override
  Future<Map<String, dynamic>?> updateVisitWorkflow(
      Map<String, dynamic> body) async {
    workflowBodies.add(body);
    final error = workflowError;
    if (error != null) throw error;
    return workflowResponse;
  }

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
          contains('date_of_visit'));
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
    late _MemorySystemStatusQueue queue;
    late _FakeAmcRemoteDataSource remote;
    late AmcSystemStatusRepository repo;
    late bool online;
    late bool loggedIn;
    const visit = ScheduledVisit(id: 'v1', status: 'SCHEDULED');

    setUp(() {
      store = _MemorySystemStatusStore();
      queue = _MemorySystemStatusQueue();
      remote = _FakeAmcRemoteDataSource();
      online = true;
      loggedIn = true;
      repo = AmcSystemStatusRepository(
        store: store,
        queue: queue,
        dataSource: remote,
        isOnline: () async => online,
        hasSession: () async => loggedIn,
      );
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

    test('offline: queued once, then sent when the device is online', () async {
      online = false;
      expect(
          await repo.save(
              visit: visit, isSystemInUse: true, isSystemFunctional: false),
          AmcSystemStatusSaveResult.queued);
      expect(remote.systemStatusBodies, isEmpty);
      expect(queue.items.single['visitId'], 'v1');
      // The answers are saved and marked as handled; saving again does not
      // queue a second update.
      expect((await repo.load(visit))?.nonFunctionalNotified, isTrue);
      expect(
          await repo.save(
              visit: visit, isSystemInUse: true, isSystemFunctional: false),
          AmcSystemStatusSaveResult.saved);
      expect(queue.items, hasLength(1));

      // Still offline: nothing is sent.
      expect(await repo.flushQueue(), 0);
      expect(queue.items, hasLength(1));

      online = true;
      expect(await repo.flushQueue(), 1);
      expect(remote.systemStatusBodies.single['systemStatus'],
          {'isSystemInUse': true, 'isSystemFunctional': false});
      expect(queue.items, isEmpty);
    });

    test('a request that cannot reach the server is queued', () async {
      for (final error in [_dioError(), _dioError(status: 503)]) {
        queue.items = [];
        store.values.clear();
        remote.systemStatusError = error;
        expect(
            await repo.save(
                visit: visit, isSystemInUse: false, isSystemFunctional: false),
            AmcSystemStatusSaveResult.queued);
        expect(queue.items, hasLength(1));
      }
    });

    test('a server rejection is not queued; saving again retries', () async {
      remote.systemStatusError = _dioError(status: 400);
      expect(
          await repo.save(
              visit: visit, isSystemInUse: true, isSystemFunctional: false),
          AmcSystemStatusSaveResult.notifyFailed);
      expect(queue.items, isEmpty);
      // The answers are still saved; the report is not blocked.
      expect((await repo.load(visit))?.isSystemFunctional, isFalse);
      expect((await repo.load(visit))?.nonFunctionalNotified, isFalse);

      remote.systemStatusError = null;
      expect(
          await repo.save(
              visit: visit, isSystemInUse: true, isSystemFunctional: false),
          AmcSystemStatusSaveResult.notified);
      expect(remote.systemStatusBodies, hasLength(1));
    });

    test('queued updates are sent even after the activity data is gone',
        () async {
      online = false;
      await repo.save(
          visit: visit, isSystemInUse: true, isSystemFunctional: false);
      // e.g. reassigned, or cleared after the completion code.
      store.values.clear();
      online = true;
      expect(await repo.flushQueue(), 1);
      expect(remote.systemStatusBodies.single['visitId'], 'v1');
    });

    test(
        'flush waits for a login, keeps on connectivity errors, drops '
        'rejected updates', () async {
      queue.items = [
        buildSystemStatusRequest(
            visitId: 'a', isSystemInUse: true, isSystemFunctional: false),
        buildSystemStatusRequest(
            visitId: 'b', isSystemInUse: true, isSystemFunctional: false),
      ];

      loggedIn = false;
      expect(await repo.flushQueue(), 0);
      expect(queue.items, hasLength(2));

      loggedIn = true;
      remote.systemStatusError = _dioError();
      expect(await repo.flushQueue(), 0);
      expect(queue.items, hasLength(2));

      remote.systemStatusError = _dioError(status: 400);
      expect(await repo.flushQueue(), 0);
      expect(queue.items, isEmpty);
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

  group('AMC 30-day submission window', () {
    final now = DateTime(2026, 11, 12, 10, 30);
    ScheduledVisit visitOn(DateTime? date, {String status = 'SCHEDULED'}) =>
        ScheduledVisit(id: 'v', status: status, scheduledDate: date);

    test('SCHEDULED visits are listed up to 30 days ahead, by date', () {
      expect(amcSubmissionWindowEnd(now),
          DateTime(2026, 12, 12, 23, 59, 59, 999));
      expect(visitOn(DateTime(2026, 12, 12, 23, 59))
          .isWithinAmcSubmissionWindow(now), isTrue);
      expect(visitOn(DateTime(2026, 12, 13)).isWithinAmcSubmissionWindow(now),
          isFalse);
      // No lower limit: overdue visits stay listed.
      expect(visitOn(DateTime(2025, 1, 1)).isWithinAmcSubmissionWindow(now),
          isTrue);
      expect(visitOn(null).isWithinAmcSubmissionWindow(now), isFalse);
    });

    test('only SCHEDULED visits are hidden', () {
      final far = DateTime(2027, 6, 1);
      for (final status in [
        'PENDING_OTP_APPROVAL',
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
      ]) {
        expect(visitOn(far, status: status).isWithinAmcSubmissionWindow(now),
            isTrue,
            reason: status);
      }
    });

    test('dummy backend hides SCHEDULED visits more than 30 days ahead',
        () async {
      final dir = Directory.systemTemp.createTempSync('amc_dummy_window');
      addTearDown(() => dir.deleteSync(recursive: true));
      final backend = DummyAmcRemoteDataSource(
          latency: Duration.zero, storageDirectory: () async => dir);

      final res = await backend.searchVisits(
        searchCriteria: {
          'statuses': const ['SCHEDULED'],
          'scheduledDateTo': amcSubmissionWindowEnd().millisecondsSinceEpoch,
        },
        limit: 20,
        offset: 0,
      );
      final ids = (res['ScheduledVisits'] as List).map((v) => v['id']).toSet();
      expect(ids, contains('dummy-visit-010')); // +30 days
      expect(ids, contains('dummy-visit-008')); // overdue
      expect(ids, isNot(contains('dummy-visit-011'))); // +31 days
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

  group('AMC completion code verification (#249)', () {
    late _FakeAmcRemoteDataSource fake;
    late bool online;
    late List<ScheduledVisit> cached;
    late List<String> cleared;

    AmcOtpBloc buildBloc() => AmcOtpBloc(
          scheduledVisitRepo: ScheduledVisitRemoteRepository(dataSource: fake),
          isOnline: () async => online,
          cacheVisit: (visit) async => cached.add(visit),
          clearLocalData: (id) async => cleared.add(id),
        );

    Future<AmcOtpState> submit(AmcOtpBloc bloc) {
      final result = bloc.stream.firstWhere((s) => s.maybeWhen(
          submitSuccess: (_) => true,
          failure: (_, __) => true,
          orElse: () => false));
      bloc.add(const AmcOtpEvent.submit(
          visitId: 'v1', schemaCode: '12345678', version: 1, otp: '1234'));
      return result;
    }

    DioException serverError(String code, String message) => DioException(
          requestOptions: RequestOptions(path: '/workflow'),
          type: DioExceptionType.badResponse,
          response: Response(
            requestOptions: RequestOptions(path: '/workflow'),
            statusCode: 400,
            data: {
              'Errors': [
                {'code': code, 'message': message}
              ]
            },
          ),
        );

    setUp(() {
      fake = _FakeAmcRemoteDataSource();
      online = true;
      cached = [];
      cleared = [];
    });

    test('needs connectivity: offline does not call the server', () async {
      online = false;
      final bloc = buildBloc();
      addTearDown(bloc.close);
      final state = await submit(bloc);
      expect(state, AmcOtpState.failure(i18.amcOtp.offline));
      expect(fake.workflowBodies, isEmpty);
      expect(cleared, isEmpty);
    });

    test('approved and sent-for-review results are reported and cached',
        () async {
      for (final status in ['APPROVED', 'PENDING_APPROVAL']) {
        fake.workflowResponse = {
          'ScheduledVisits': [
            {'id': 'v1', 'status': status}
          ]
        };
        cached.clear();
        final bloc = buildBloc();
        addTearDown(bloc.close);
        final state = await submit(bloc);
        expect(state, AmcOtpState.submitSuccess(status: status));
        expect(cached.single.status, status);
      }
      expect(cleared, ['v1', 'v1']);
      expect(fake.workflowBodies.last['workflow']['action'], 'SUBMIT_OTP');
    });

    test('wrong code, unreachable server and rejections keep saved data',
        () async {
      final cases = <Object, AmcOtpState>{
        serverError('ERROR_OTP_GENERATION', 'OTP validation unsuccessful'):
            AmcOtpState.failure(i18.amcOtp.invalidCode),
        serverError('INVALID_OTP', 'Invalid OTP'):
            AmcOtpState.failure(i18.amcOtp.invalidCode),
        _dioError(): AmcOtpState.failure(i18.amcOtp.serverUnreachable),
        serverError('SUBMISSION_WINDOW_CLOSED', 'Window not open yet'):
            AmcOtpState.failure(i18.amcOtp.submitFailed,
                serverMessage: 'Window not open yet'),
      };
      for (final entry in cases.entries) {
        fake.workflowError = entry.key;
        final bloc = buildBloc();
        addTearDown(bloc.close);
        expect(await submit(bloc), entry.value);
      }
      expect(cleared, isEmpty);
      expect(cached, isEmpty);
    });

    test('dummy backend approves only when both pre-questions are Yes',
        () async {
      final dir = Directory.systemTemp.createTempSync('amc_dummy_otp');
      addTearDown(() => dir.deleteSync(recursive: true));
      final backend = DummyAmcRemoteDataSource(
          latency: Duration.zero, storageDirectory: () async => dir);

      Future<String?> verify(String id, bool inUse, bool functional) async {
        await backend.updateVisitWorkflow({
          'visitId': id,
          'workflow': {'action': 'SUBMIT_VISIT_REPORT'},
          'visitReport': {
            'schemaCode': '12345678',
            'version': 1,
            'additionalDetails': {
              'systemStatus': {
                'isSystemInUse': inUse,
                'isSystemFunctional': functional,
              }
            },
          },
        });
        final res = await backend.updateVisitWorkflow({
          'visitId': id,
          'workflow': {'action': 'SUBMIT_OTP'},
          'visitReport': {'otpReference': dummyAmcOtp},
        });
        return ((res!['ScheduledVisits'] as List).single as Map)['status']
            as String?;
      }

      expect(await verify('dummy-visit-001', true, true), 'APPROVED');
      expect(await verify('dummy-visit-002', true, false), 'PENDING_APPROVAL');
    });
  });

  group('AMC rejection reasons (#251)', () {
    test('E4H JSON list, installation objects, strings and plain text', () {
      final e4h = parseAmcRejectionComment(jsonEncode([
        {'reason': 'Photos are not clear', 'comment': 'Retake in daylight.'},
        {'reason': 'Battery details missing'},
      ]));
      expect(e4h.map((c) => c.reason), [
        'Photos are not clear',
        'Battery details missing',
      ]);
      expect(e4h.first.details, 'Retake in daylight.');

      final installation = parseAmcRejectionComment([
        {
          'reasonCode': 'READING_OUT_OF_RANGE',
          'sectionLabel': 'Inverter',
          'comment': 'Recheck the output voltage.',
          'assetType': 'INVERTER',
        },
        {
          'commentMessage': jsonEncode({'reason': 'Wrong photo'}),
        },
      ]);
      expect(installation.first.reasonCode, 'READING_OUT_OF_RANGE');
      expect(installation.first.sectionLabel, 'Inverter');
      expect(installation.first.assetType, 'INVERTER');
      expect(installation.last.reason, 'Wrong photo');

      expect(parseAmcRejectionComment('["Blurred photo", "Wrong date"]')
          .map((c) => c.reason), ['Blurred photo', 'Wrong date']);
      expect(parseAmcRejectionComment('Please retake the photo.')
          .single.reason, 'Please retake the photo.');
      // A comment-only entry is shown as the reason itself.
      expect(parseAmcRejectionComment([
        {'comment': 'Readings look wrong'}
      ]).single.reason, 'Readings look wrong');
      expect(parseAmcRejectionComment(null), isEmpty);
      expect(parseAmcRejectionComment('  '), isEmpty);
    });

    test('read from the latest workflow step of a REJECTED visit only', () {
      ScheduledVisit visit(String status, Object? comment) =>
          ScheduledVisit.fromJson({
            'id': 'v1',
            'status': status,
            'processInstances': [
              {'id': 'pi-2', 'comment': comment},
              {'id': 'pi-1', 'comment': 'older comment'},
            ],
          });
      expect(amcRejectionReasons(visit('REJECTED', 'Retake photos'))
          .single.reason, 'Retake photos');
      expect(amcRejectionReasons(visit('APPROVED', 'Retake photos')), isEmpty);

      final seeded = dummySeedVisits()
          .map(ScheduledVisit.fromJson)
          .firstWhere((v) => v.status == 'REJECTED');
      expect(amcRejectionReasons(seeded).map((c) => c.reason), [
        'Photos are not clear',
        'Battery details missing',
      ]);
    });
  });

  test('dummy backend supplies AMC texts the server does not have', () {
    expect(AppLocalizations.translateCached(i18.amcOtp.reportApproved),
        'Report approved. You can find it in Inbox.');
    expect(AppLocalizations.translateCached('PENDING_OTP_APPROVAL'),
        'Pending Service Code');
    // Server messages win over the dummy texts.
    AppLocalizations.debugSeedLocalizations([
      Localization()
        ..code = i18.amcOtp.reportApproved
        ..message = 'From the server'
        ..module = 'rainmaker-common'
        ..locale = 'en_IN',
    ]);
    addTearDown(() => AppLocalizations.debugSeedLocalizations(const []));
    expect(AppLocalizations.translateCached(i18.amcOtp.reportApproved),
        'From the server');
  });

  group('Livelihood AMC report form (#250)', () {
    final schema = SchemaObject.fromJson(
        transformSelcoFormMdmsDocToSchema(dummyAmcFormSchemaDoc('t')));
    Map<String, PropertySchema> fieldsOf(String page) =>
        schema.pages[page]!.properties!;
    bool isRequired(PropertySchema field) =>
        field.validations?.any((r) => r.type == 'required' && r.value == true) ??
        false;

    test('five sections in order, each with its heading', () {
      expect(schema.pages.keys, [
        'Report_Header',
        'Site_Details',
        'Charge_Controller_PCU',
        'Observation_Points',
        'Capture_Readings',
      ]);
      expect(schema.pages.values.map((page) => page.label), [
        'AMC_FORM_REPORT_HEADER',
        'AMC_FORM_SITE_DETAILS',
        'AMC_FORM_CHARGE_CONTROLLER_PCU',
        'AMC_FORM_OBSERVATION_POINTS',
        'AMC_FORM_CAPTURE_READINGS',
      ]);
      expect(schema.pages['Capture_Readings']!.actionLabel,
          'AMC_FORM_SAVE_AND_NEXT');
    });

    test('fields match the final field list', () {
      expect(fieldsOf('Report_Header').keys,
          ['date_of_visit', 'service_by', 'service_contact_number']);
      expect(fieldsOf('Site_Details').keys, amcSiteDetailFields);
      expect(fieldsOf('Charge_Controller_PCU').keys,
          ['pcu_priority', 'panels_per_string']);
      expect(fieldsOf('Observation_Points'), hasLength(20));
      expect(fieldsOf('Capture_Readings').keys, [
        'battery_type',
        'system_type',
        'pcu_neutral_earth_voltage',
        'pcu_neutral_earth_voltage_photo',
        'grid_neutral_earth_voltage',
        'grid_neutral_earth_voltage_photo',
        'inverter_output_voltage',
        'earthing_electrode_available',
        'earthing_wire_connected',
        'battery_specific_gravity',
        'battery_specific_gravity_action',
        'solar_spd',
        'solar_spd_photo',
        'solar_spd_action',
        'grid_spd',
        'grid_spd_photo',
        'grid_spd_action',
        'vendor_remarks',
        'end_user_remarks',
      ]);
    });

    test('site details are read-only; everything else applicable is required',
        () {
      expect(fieldsOf('Site_Details').values.every((f) => f.readOnly == true),
          isTrue);
      const optional = {
        'battery_type',
        'system_type',
        'battery_specific_gravity_action',
        'solar_spd_action',
        'grid_spd_action',
        'vendor_remarks',
        'end_user_remarks',
      };
      for (final page in schema.pages.keys.where((p) => p != 'Site_Details')) {
        fieldsOf(page).forEach((name, field) {
          expect(isRequired(field), !optional.contains(name), reason: name);
        });
      }
    });

    test('N/A is offered exactly where the field list allows it', () {
      final withNa = <String>{
        for (final page in schema.pages.keys)
          for (final entry in fieldsOf(page).entries)
            if (entry.value.enums?.any((o) => o.code == 'NA') ?? false)
              entry.key,
      };
      expect(withNa, {
        'solar_cables_tied',
        'solar_mms_rusting',
        'battery_float_indicators_ok',
        'battery_water_level_ok',
        'la_insulation',
        'la_firmly_fixed',
        'la_saddle_insulators',
        'mc4_interlocked',
        'battery_specific_gravity',
      });
    });

    test('conditional fields follow battery and system type', () {
      final readings = fieldsOf('Capture_Readings');
      bool visible(String field, String battery, String system) {
        final expression = readings[field]!.visibilityCondition?.expression;
        if (expression == null) return true;
        return evaluateVisibilityExpression(expression, {
          'Capture_Readings.battery_type': battery,
          'Capture_Readings.system_type': system,
        });
      }

      for (final field in [
        'battery_specific_gravity',
        'battery_specific_gravity_action'
      ]) {
        expect(visible(field, 'LEAD_ACID', 'DC'), isTrue, reason: field);
        expect(visible(field, 'LITHIUM_ION', 'DC'), isFalse, reason: field);
        expect(visible(field, '', 'DC'), isFalse, reason: field);
      }
      for (final field in ['solar_spd', 'solar_spd_photo', 'solar_spd_action']) {
        expect(visible(field, 'LEAD_ACID', 'DC'), isTrue, reason: field);
        expect(visible(field, 'LEAD_ACID', 'AC'), isFalse, reason: field);
      }
      for (final field in ['grid_spd', 'grid_spd_photo', 'grid_spd_action']) {
        expect(visible(field, 'LEAD_ACID', 'AC'), isTrue, reason: field);
        expect(visible(field, 'LEAD_ACID', 'DC'), isFalse, reason: field);
      }
      expect(visible('inverter_output_voltage', '', ''), isTrue);
    });

    test('site details come from the visit and override saved values', () {
      final visit = ScheduledVisit.fromJson(dummySeedVisits()
          .firstWhere((v) => v['id'] == 'dummy-visit-002'));
      final site = AmcSiteDetails.fromVisit(visit);
      expect(site.batteryType, 'LITHIUM_ION');
      expect(site.systemType, amcAcSystem);

      final values = withAmcSiteDetails(
          {'service_by': 'Suresh', 'end_user_name': 'stale'}, visit);
      expect(values['service_by'], 'Suresh');
      expect(values['end_user_name'], 'Manjunath S');
      expect(values['district'], 'CHAMARAJANAGAR');
      expect(values[amcSystemTypeField], 'AC');
      expect(values['installation_date'], matches(RegExp(r'^\d\d/\d\d/\d{4}$')));

      expect(AmcSiteDetails.normaliseBatteryType('Lead-acid'), 'LEAD_ACID');
      expect(AmcSiteDetails.normaliseSystemType('dc system'), 'DC');
      expect(AmcSiteDetails.normaliseSystemType('Hybrid'), isNull);
      // No site record: nothing is invented.
      expect(AmcSiteDetails.fromVisit(const ScheduledVisit()).toFormValues(),
          isEmpty);
    });

    test('custom fields: photos by name, decimals accepted', () {
      final custom = fieldsOf('Capture_Readings')
          .entries
          .where((e) => e.value.format == PropertySchemaFormat.custom)
          .map((e) => e.key);
      expect(custom.where(isAmcReadingPhotoField), [
        'pcu_neutral_earth_voltage_photo',
        'grid_neutral_earth_voltage_photo',
        'solar_spd_photo',
        'grid_spd_photo',
      ]);
      String typed(String text) => amcDecimalInputFormatter
          .formatEditUpdate(TextEditingValue.empty,
              TextEditingValue(text: text))
          .text;
      expect(typed('230.5'), '230.5');
      expect(typed('1.2.3'), '1.2');
      expect(typed('abc'), '');
    });

    /// Renders the Capture Readings page through the forms engine, as the
    /// report screen does, for a site of the given battery/system type.
    Future<void> pumpReadings(
        WidgetTester tester, String battery, String system) async {
      tester.view.physicalSize = const Size(1080, 20000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final page = resolveAmcVisibility(schema, 'Capture_Readings', {
        amcBatteryTypeField: battery,
        amcSystemTypeField: system,
      });
      final bloc = FormsBloc()
        ..add(FormsUpdateEvent(schema: schema, schemaKey: amcFormSchemaKey));
      addTearDown(bloc.close);
      await tester.pumpWidget(MaterialApp(
        locale: const Locale('en', 'IN'),
        supportedLocales: const [Locale('en', 'IN')],
        localizationsDelegates: [
          forms_localization.FormLocalization.getDelegate(
            Future.value(withDummyAmcLocalizations(const [], 'en_IN')),
            const [Language(label: 'English', value: 'en_IN')],
          ),
          GlobalWidgetsLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: BlocProvider.value(
          value: bloc,
          child: Scaffold(
            body: SingleChildScrollView(
              child: ReactiveFormBuilder(
                form: () => fb.group(JsonForms.getFormControls(page,
                    defaultValues: {
                      amcBatteryTypeField: battery,
                      amcSystemTypeField: system,
                    })),
                builder: (context, form, _) => JsonForms(
                  currentSchemaKey: amcFormSchemaKey,
                  propertySchema: page,
                  pageName: 'Capture_Readings',
                  childrens: [
                    for (final e in page.properties!.entries)
                      if (e.value.format == PropertySchemaFormat.custom)
                        {
                          e.key: amcCustomFormField(
                            fieldName: e.key,
                            label: dummyAmcLocalization[e.value.label],
                            isRequired: true,
                            readOnly: false,
                          ),
                        },
                  ],
                ),
              ),
            ),
          ),
        ),
      ));
      // Settles: no rebuild loop from the engine's visibility checks.
      await tester.pumpAndSettle();
    }

    testWidgets('readings page: lead-acid DC site', (tester) async {
      await pumpReadings(tester, 'LEAD_ACID', 'DC');
      expect(_label('Battery specific gravity, measured through hydrometer'),
          findsOneWidget);
      expect(_label('Solar SPD'), findsOneWidget);
      expect(_label('Solar SPD photo'), findsOneWidget);
      expect(_label('Grid input SPD'), findsNothing);
      expect(_label('Grid input SPD photo'), findsNothing);
      expect(find.byType(AmcDecimalReadingField), findsNWidgets(3));
      expect(find.byType(AmcReadingPhotoField), findsNWidgets(3));
      expect(find.text('Good'), findsOneWidget);
      // Only fields that apply have inputs, so only they are validated.
      final form = ReactiveForm.of(
          tester.element(find.byType(AmcDecimalReadingField).first),
          listen: false) as FormGroup;
      expect(form.contains('grid_spd'), isFalse);
      expect(form.contains('solar_spd'), isTrue);
      expect(find.text('Not applicable'), findsOneWidget);
    });

    testWidgets('readings page: lithium AC site', (tester) async {
      await pumpReadings(tester, 'LITHIUM_ION', 'AC');
      expect(_label('Battery specific gravity, measured through hydrometer'),
          findsNothing);
      expect(_label('Solar SPD'), findsNothing);
      expect(_label('Grid input SPD'), findsOneWidget);
      expect(_label('Grid input SPD photo'), findsOneWidget);
      expect(find.byType(AmcReadingPhotoField), findsNWidgets(3));
    });

    test('every form text has a dummy translation, server texts win', () {
      final keys = <String>{
        for (final page in schema.pages.values) ...[
          page.label!,
          if (page.actionLabel != null) page.actionLabel!,
          for (final field in page.properties!.values) ...[
            if (field.hidden != true) field.label!,
            if (field.section != null) field.section!,
            for (final option in field.enums ?? const <Option>[]) option.name,
          ],
        ],
        i18.amcForm.naNote,
        i18.amcForm.photoRequired,
      }..removeAll(const {'COMMON_YES', 'COMMON_NO'});
      expect(keys.where((k) => !dummyAmcLocalization.containsKey(k)), isEmpty);

      final server = Localization()
        ..code = 'AMC_FORM_NA'
        ..message = 'Not applicable'
        ..module = 'm'
        ..locale = 'en_IN';
      final merged = withDummyAmcLocalizations([server], 'en_IN');
      expect(merged.where((l) => l.code == 'AMC_FORM_NA').single.message,
          'Not applicable');
      expect(
          merged
              .firstWhere((l) => l.code == 'AMC_FORM_REPORT_HEADER')
              .message,
          'Report Header');
    });
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
