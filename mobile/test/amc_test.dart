import 'dart:convert';

import 'package:digit_ui_components/widgets/atoms/digit_button.dart';
import 'package:digit_forms_engine/blocs/app_localization.dart'
    as forms_localization;
import 'package:digit_forms_engine/blocs/forms/forms.dart';
import 'package:digit_forms_engine/json_forms.dart';
import 'package:digit_forms_engine/models/property_schema/property_schema.dart';
import 'package:digit_forms_engine/models/schema_object/schema_object.dart';
import 'package:digit_forms_engine/utils/utils.dart'
    show evaluateVisibilityExpression;
import 'package:dio/dio.dart';
import 'package:excel/excel.dart' show Excel;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/blocs/localization/app_localization.dart';
import 'package:livelihood/data/nosql/localization.dart' show Localization;
import 'package:livelihood/blocs/amc_otp/amc_otp.dart';
import 'package:livelihood/main.dart';
import 'package:livelihood/model/amc/amc_schedule.dart';
import 'package:livelihood/model/amc/amc_site_details.dart';
import 'package:livelihood/model/amc/scheduled_visit.dart';
import 'package:livelihood/model/appconfig/mdmsResponse.dart' show Language;
import 'package:livelihood/model/login/loginModel.dart';
import 'package:livelihood/model/response/responsemodel.dart';
import 'package:livelihood/pages/amc/amc_home.dart';
import 'package:livelihood/pages/home_page.dart';
import 'package:livelihood/pages/role_selection.dart';
import 'package:livelihood/repositories/amc/amc_report_form_schema.dart';
import 'package:livelihood/repositories/amc/amc_remote_data_source.dart';
import 'package:livelihood/repositories/amc/amc_system_status_repo.dart';
import 'package:livelihood/repositories/amc/scheduled_visit_repo.dart';
import 'package:livelihood/repositories/auth_repo.dart';
import 'package:livelihood/router/app_router.dart';
import 'package:livelihood/utils/amc/amc_module_readiness.dart';
import 'package:livelihood/utils/amc/amc_rejection_reasons.dart';
import 'package:livelihood/utils/amc/amc_schedule_export.dart';
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
    return [amcReportFormSchemaDoc('livelihood')];
  }

  @override
  Future<String> uploadFile(String localFilePath) async => 'fake-filestore-id';

  @override
  Future<List<int>?> downloadFile(String fileStoreId) async => null;
}

/// A visit as the AMC visit search returns it, due [days] days from now.
Map<String, dynamic> _visitJson(
  String id, {
  required int days,
  String status = 'SCHEDULED',
  String site = 'PHC Hunsur',
  String endUser = 'Lakshmi Devi',
  String phone = '9845000001',
  String state = 'Karnataka',
  String district = 'Mysuru',
  String block = 'Hunsur',
  Map<String, dynamic>? siteDetails,
}) =>
    {
      'id': id,
      'status': status,
      'scheduledDate':
          DateTime.now().add(Duration(days: days)).millisecondsSinceEpoch,
      'facilityName': site,
      'facility': {
        'facilityName': site,
        'facilityPocName': endUser,
        'facilityPocPhone': phone,
      },
      'state': state,
      'district': district,
      'block': block,
      if (siteDetails != null) 'siteDetails': siteDetails,
    };

/// One field staff's visits: one not started per AMC, plus one in review.
List<Map<String, dynamic>> _sampleVisits() => [
      _visitJson('v-overdue', days: -4, site: 'PHC Bannur'),
      _visitJson('v-today', days: 0, site: 'PHC Malavalli'),
      _visitJson('v-2', days: 2, site: 'PHC Hunsur'),
      _visitJson('v-5', days: 5, site: 'CHC Kollegal'),
      _visitJson('v-9', days: 9, site: 'Sub Centre Hosur'),
      _visitJson('v-15',
          days: 15,
          site: 'PHC Periyapatna',
          endUser: 'Ramesh Kumar',
          phone: '9845000012',
          block: 'Periyapatna',
          siteDetails: {
            'machines': [
              {'name': 'Chaff Cutter', 'solutionId': 'S1'},
              {'name': 'Milking Machine, Milk Can', 'solutionId': 'S2'},
            ],
          }),
      _visitJson('v-30', days: 30, site: 'PHC Saligrama'),
      _visitJson('v-31', days: 31, site: 'CHC Hanur'),
      _visitJson('v-review',
          days: -3, status: 'PENDING_APPROVAL', site: 'PHC Nanjangud'),
    ];

/// Serves [visits] like the real visit search: status and name filter, due
/// date soonest first, paging. Like the real search today, it refuses any
/// due-date range (`ScheduledVisitValidator`), and it records what was asked.
class _VisitsBackend extends _FakeAmcRemoteDataSource {
  _VisitsBackend(this.visits);

  final List<Map<String, dynamic>> visits;
  final List<Map<String, dynamic>> criteria = [];

  @override
  Future<Map<String, dynamic>> searchVisits({
    required Map<String, dynamic> searchCriteria,
    required int limit,
    required int offset,
  }) async {
    criteria.add(Map.of(searchCriteria));
    if (searchCriteria.containsKey('scheduledDateFrom') ||
        searchCriteria.containsKey('scheduledDateTo')) {
      throw StateError('INVALID_SCHEDULED_DATE');
    }
    final statuses = (searchCriteria['statuses'] as List?)?.toSet();
    final search = searchCriteria['searchText']?.toString().toLowerCase() ?? '';
    final matching = visits
        .where((v) => statuses == null || statuses.contains(v['status']))
        .where((v) =>
            search.isEmpty ||
            v['facilityName'].toString().toLowerCase().contains(search))
        .toList()
      ..sort((a, b) =>
          (a['scheduledDate'] as int).compareTo(b['scheduledDate'] as int));
    return {
      'ScheduledVisits': matching.skip(offset).take(limit).toList(),
      'TotalCount': matching.length,
    };
  }
}

/// The texts the readings page tests look for (normally from the server).
const _readingTexts = {
  'AMC_FORM_BATTERY_SPECIFIC_GRAVITY':
      'Battery specific gravity, measured through hydrometer',
  'AMC_FORM_SOLAR_SPD': 'Solar SPD',
  'AMC_FORM_SOLAR_SPD_PHOTO': 'Solar SPD photo',
  'AMC_FORM_GRID_SPD': 'Grid input SPD',
  'AMC_FORM_GRID_SPD_PHOTO': 'Grid input SPD photo',
  'AMC_FORM_GOOD': 'Good',
  'AMC_FORM_NA': 'Not applicable',
};

/// #252: serves the View Schedule screen without Isar or a server.
class _FakeScheduleRepository extends ScheduledVisitRepository {
  _FakeScheduleRepository(this.respond);

  final Future<AmcScheduleResult> Function(int days) respond;
  final List<int> requestedDays = [];

  @override
  Future<AmcScheduleResult> fetchSchedule({required int days, DateTime? now}) {
    requestedDays.add(days);
    return respond(days);
  }
}

class _ScheduleTestRouter extends RootStackRouter {
  @override
  Map<String, PageFactory> get pagesMap => {
        AmcViewScheduleRoute.name:
            AppRouter().pagesMap[AmcViewScheduleRoute.name]!,
      };

  @override
  List<AutoRoute> get routes =>
      [AutoRoute(page: AmcViewScheduleRoute.page, path: '/')];
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
      expect(
          RoleLoginResolver.hasSupportedRole([amcFieldStaffRoleCode]), isTrue);
    });
  });

  group('AMC helpers (E4H parity)', () {
    test('formatAmcNumber and boundary locality', () {
      expect(formatAmcNumber(2, 12, 3), '2 / 4');
      expect(formatAmcNumber(null, 12, 5), '--- / ---');
      final locality = parseBoundaryCodeLocality('IN_KARNATAKA_MYSURU_HUNSUR');
      expect(locality.state, 'KARNATAKA');
      expect(locality.district, 'MYSURU');
      expect(locality.block, 'HUNSUR');
      expect(lastPhoneDigits('9876543210'), '3210');
    });

    test('AMC report form loads in digit_forms_engine', () {
      final transformed =
          transformSelcoFormMdmsDocToSchema(amcReportFormSchemaDoc('t'));
      final schema = SchemaObject.fromJson(transformed);
      expect(schema.name, amcFormSchemaKey);
      expect(schema.pages.keys.first, amcFormFirstPage);
      expect(schema.pages[amcFormFirstPage]!.properties!.keys,
          contains('visitDate'));
    });
  });

  group('AMC delayed filter', () {
    final now = DateTime(2026, 11, 12, 10, 30);
    ScheduledVisit visitOn(DateTime? date, {String status = 'SCHEDULED'}) =>
        ScheduledVisit(id: 'v', status: status, scheduledDate: date);

    test('delay is decided by date: due today or later is not delayed', () {
      expect(amcDelayedScheduledBefore(now),
          DateTime(2026, 11, 11, 23, 59, 59, 999));
      expect(visitOn(DateTime(2026, 11, 11, 23, 59)).isAmcDelayed(now), isTrue);
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
        responses: const {'obsPanelsClean': 'NO'},
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
      expect(report['responses'], {'obsPanelsClean': 'NO'});
    });
  });

  group('AMC 30-day submission window', () {
    final now = DateTime(2026, 11, 12, 10, 30);
    ScheduledVisit visitOn(DateTime? date, {String status = 'SCHEDULED'}) =>
        ScheduledVisit(id: 'v', status: status, scheduledDate: date);

    test('SCHEDULED visits are listed up to 30 days ahead, by date', () {
      expect(
          amcSubmissionWindowEnd(now), DateTime(2026, 12, 12, 23, 59, 59, 999));
      expect(
          visitOn(DateTime(2026, 12, 12, 23, 59))
              .isWithinAmcSubmissionWindow(now),
          isTrue);
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
  });

  test('SUBMIT_VISIT_REPORT request body matches the API contract', () async {
    final fake = _FakeAmcRemoteDataSource();
    await ScheduledVisitRemoteRepository(dataSource: fake).updateVisitWorkflow(
      visitId: 'v1',
      responses: const {'obsPanelsClean': 'NO'},
      visitDocuments: [
        AmcDocument(
          documentType: 'AMC_VERIFICATION_PHOTO',
          fileStore: 'fs-1',
          documentUid: 'DOC-AMC-image-1',
          geoLocation: AmcGeoLocation(latitude: '12.1', longitude: '76.6'),
        ),
      ],
    );
    final body = fake.workflowBodies.single;
    expect(body['visitId'], 'v1');
    expect(body['workflow'],
        {'action': 'SUBMIT_VISIT_REPORT', 'comment': null, 'documents': []});
    expect(body['visitReport'], isNot(contains('schemaCode')));
    expect(body['visitReport']['responses'], {'obsPanelsClean': 'NO'});
    final doc = (body['visitReport']['documents'] as List).single as Map;
    expect(doc['documentType'], 'AMC_VERIFICATION_PHOTO');
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
      bloc.add(const AmcOtpEvent.submit(visitId: 'v1', otp: '1234'));
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

      expect(
          parseAmcRejectionComment('["Blurred photo", "Wrong date"]')
              .map((c) => c.reason),
          ['Blurred photo', 'Wrong date']);
      expect(parseAmcRejectionComment('Please retake the photo.').single.reason,
          'Please retake the photo.');
      // A comment-only entry is shown as the reason itself.
      expect(
          parseAmcRejectionComment([
            {'comment': 'Readings look wrong'}
          ]).single.reason,
          'Readings look wrong');
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
      expect(
          amcRejectionReasons(visit('REJECTED', 'Retake photos')).single.reason,
          'Retake photos');
      expect(amcRejectionReasons(visit('APPROVED', 'Retake photos')), isEmpty);

      final seeded = ScheduledVisit.fromJson({
        'id': 'v2',
        'status': 'REJECTED',
        'processInstances': [
          {
            'id': 'pi-1',
            'comment': jsonEncode([
              {
                'reason': 'OTHERS',
                'comment': 'Retake the SPD photo in daylight.',
              },
              {'reason': 'OTHERS', 'comment': 'Record the battery condition.'},
            ]),
          },
        ],
      });
      // `OTHERS` is the only reason code today; the comment says why.
      expect(amcRejectionReasons(seeded).map((c) => c.reason),
          ['OTHERS', 'OTHERS']);
      expect(amcRejectionReasons(seeded).first.details,
          'Retake the SPD photo in daylight.');
    });
  });

  group('Livelihood AMC report form (#250)', () {
    final schema = SchemaObject.fromJson(
        transformSelcoFormMdmsDocToSchema(amcReportFormSchemaDoc('t')));
    Map<String, PropertySchema> fieldsOf(String page) =>
        schema.pages[page]!.properties!;
    bool isRequired(PropertySchema field) =>
        field.validations
            ?.any((r) => r.type == 'required' && r.value == true) ??
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
      // Field names are the API contract's report keys.
      expect(fieldsOf('Report_Header').keys,
          ['visitDate', 'serviceBy', 'serviceByPhone']);
      expect(fieldsOf('Site_Details').keys, amcSiteDetailFields);
      expect(fieldsOf('Charge_Controller_PCU').keys,
          ['pcuPriority', 'panelsPerString']);
      expect(fieldsOf('Observation_Points').keys, [
        'obsPanelCablesTied',
        'obsPanelsClean',
        'obsMmsRusting',
        'obsNutsBoltsRusting',
        'obsAjbMounted',
        'obsBatteryTerminalsClean',
        'obsPetroleumJelly',
        'obsFloatIndicators',
        'obsDistilledWaterLevel',
        'obsPcuCablesIntact',
        'obsLaInsulation',
        'obsLaFixed',
        'obsGiStripsInsulated',
        'obsDownConductorConduit',
        'obsEarthCableContact',
        'obsEarthElectrodesBuried',
        'obsCableLugsUsed',
        'obsCablesCrimped',
        'obsCableLugsInsulated',
        'obsMc4Intact',
      ]);
      expect(fieldsOf('Capture_Readings').keys, [
        'batteryType',
        'systemType',
        'neVoltagePcuOutput',
        'neVoltagePcuOutputPhoto',
        'neVoltageGridInput',
        'neVoltageGridInputPhoto',
        'inverterOutputVoltage',
        'earthingElectrodeAvailable',
        'earthingWireConnected',
        'batterySpecificGravity',
        'batterySpecificGravityAction',
        'solarSpdStatus',
        'solarSpdPhoto',
        'solarSpdAction',
        'gridSpdStatus',
        'gridSpdPhoto',
        'gridSpdAction',
        'vendorRemarks',
        'endUserRemarks',
      ]);
      // Labels keep their localisation keys.
      expect(fieldsOf('Report_Header')['visitDate']!.label,
          'AMC_FORM_DATE_OF_VISIT');
      expect(fieldsOf('Capture_Readings')['solarSpdStatus']!.label,
          'AMC_FORM_SOLAR_SPD');
    });

    test('site details are read-only; everything else applicable is required',
        () {
      expect(fieldsOf('Site_Details').values.every((f) => f.readOnly == true),
          isTrue);
      const optional = {
        'batteryType',
        'systemType',
        'batterySpecificGravityAction',
        'solarSpdAction',
        'gridSpdAction',
        'vendorRemarks',
        'endUserRemarks',
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
        'obsPanelCablesTied',
        'obsMmsRusting',
        'obsFloatIndicators',
        'obsDistilledWaterLevel',
        'obsLaInsulation',
        'obsLaFixed',
        'obsGiStripsInsulated',
        'obsMc4Intact',
        'batterySpecificGravity',
      });
    });

    test('conditional fields follow battery and system type', () {
      final readings = fieldsOf('Capture_Readings');
      bool visible(String field, String battery, String system) {
        final expression = readings[field]!.visibilityCondition?.expression;
        if (expression == null) return true;
        return evaluateVisibilityExpression(expression, {
          'Capture_Readings.batteryType': battery,
          'Capture_Readings.systemType': system,
        });
      }

      for (final field in [
        'batterySpecificGravity',
        'batterySpecificGravityAction'
      ]) {
        expect(visible(field, 'LEAD_ACID', 'DC'), isTrue, reason: field);
        expect(visible(field, 'LITHIUM_ION', 'DC'), isFalse, reason: field);
        expect(visible(field, '', 'DC'), isFalse, reason: field);
      }
      for (final field in [
        'solarSpdStatus',
        'solarSpdPhoto',
        'solarSpdAction'
      ]) {
        expect(visible(field, 'LEAD_ACID', 'DC'), isTrue, reason: field);
        expect(visible(field, 'LEAD_ACID', 'AC'), isFalse, reason: field);
      }
      for (final field in ['gridSpdStatus', 'gridSpdPhoto', 'gridSpdAction']) {
        expect(visible(field, 'LEAD_ACID', 'AC'), isTrue, reason: field);
        expect(visible(field, 'LEAD_ACID', 'DC'), isFalse, reason: field);
      }
      expect(visible('inverterOutputVoltage', '', ''), isTrue);
    });

    test('site details come from the visit and override saved values', () {
      final visit = ScheduledVisit.fromJson(_visitJson('v-5',
          days: 5,
          site: 'CHC Kollegal',
          endUser: 'Manjunath S',
          phone: '9845000002',
          district: 'Chamarajanagar',
          block: 'Kollegal',
          siteDetails: {
            'batteryType': 'Lithium Ion',
            'systemType': 'AC',
            'installationDate': DateTime(2026, 4, 20).millisecondsSinceEpoch,
            'purchaseOrderNumber': 'PO-2026-002',
            'pinCode': '571002',
          }));
      final site = AmcSiteDetails.fromVisit(visit);
      expect(site.batteryType, 'LITHIUM_ION');
      expect(site.systemType, amcAcSystem);

      final values = withAmcSiteDetails(
          {'serviceBy': 'Suresh', 'endUserName': 'stale'}, visit);
      expect(values['serviceBy'], 'Suresh');
      // The end user's name and phone come from the visit's facility, the
      // district from the visit, the rest from `siteDetails`.
      expect(values['endUserName'], 'Manjunath S');
      expect(values['endUserPhone'], '9845000002');
      expect(values['district'], 'Chamarajanagar');
      expect(values['pinCode'], '571002');
      expect(values['purchaseOrderNumber'], 'PO-2026-002');
      expect(values[amcSystemTypeField], 'AC');
      expect(values['installationDate'], matches(RegExp(r'^\d\d/\d\d/\d{4}$')));

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
        'neVoltagePcuOutputPhoto',
        'neVoltageGridInputPhoto',
        'solarSpdPhoto',
        'gridSpdPhoto',
      ]);
      // Each has its own report document type.
      expect(
          custom.where(isAmcReadingPhotoField).map(amcReadingPhotoDocumentType),
          [
            'AMC_PHOTO_NE_PCU',
            'AMC_PHOTO_NE_GRID',
            'AMC_PHOTO_SOLAR_SPD',
            'AMC_PHOTO_GRID_SPD',
          ]);
      String typed(String text) => amcDecimalInputFormatter
          .formatEditUpdate(
              TextEditingValue.empty, TextEditingValue(text: text))
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
            Future.value([
              for (final e in _readingTexts.entries)
                Localization()
                  ..code = e.key
                  ..message = e.value
                  ..module = 'rainmaker-amc'
                  ..locale = 'en_IN',
            ]),
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
                form: () =>
                    fb.group(JsonForms.getFormControls(page, defaultValues: {
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
                            label: _readingTexts[e.value.label],
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
      expect(form.contains('gridSpdStatus'), isFalse);
      expect(form.contains('solarSpdStatus'), isTrue);
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
  });

  group('AMC API contract (integration)', () {
    test('report answers are converted to the contract format', () {
      final out = amcResponsesForSubmit({
        'visitDate': DateTime(2026, 11, 16, 0, 0).toUtc().toIso8601String(),
        'serviceBy': 'Ravi',
        'neVoltagePcuOutput': '3.5',
        'neVoltageGridInput': '2',
        'inverterOutputVoltage': '23O', // a typo stays text: reviewer
        'panelsPerString': 4,
        'neVoltagePcuOutputPhoto': '/local/photo.jpg',
        'endUserName': 'Shown only',
        'batteryType': 'LEAD_ACID',
        'systemType': 'DC',
        'vendorRemarks': '  ',
        'solarSpdAction': null,
        'obsPanelsClean': 'YES',
      });
      expect(out, {
        'visitDate': '2026-11-16',
        'serviceBy': 'Ravi',
        'neVoltagePcuOutput': 3.5,
        'neVoltageGridInput': 2,
        'inverterOutputVoltage': '23O',
        'panelsPerString': 4,
        'obsPanelsClean': 'YES',
      });
      expect(amcReportDate(DateTime(2026, 1, 5, 23, 30)), '2026-01-05');
      expect(amcReportDate('2026-11-16'), '2026-11-16');
      expect(amcReportDate(null), isNull);
    });

    test('reading photos come back from the report documents', () {
      final answers = amcPhotoAnswersFromDocuments([
        AmcDocument(documentType: 'AMC_VERIFICATION_PHOTO', fileStore: 'v'),
        AmcDocument(documentType: 'AMC_PHOTO_NE_PCU', fileStore: 'fs-pcu'),
        AmcDocument(documentType: 'AMC_PHOTO_SOLAR_SPD', fileStore: 'fs-spd'),
        AmcDocument(documentType: 'AMC_PHOTO_NE_GRID', fileStore: ''),
      ]);
      expect(answers, {
        'neVoltagePcuOutputPhoto': 'fs-pcu',
        'solarSpdPhoto': 'fs-spd',
      });
      // The photo screen shows only the verification photograph.
      expect(isAmcReadingPhotoDocument('AMC_PHOTO_GRID_SPD'), isTrue);
      expect(isAmcReadingPhotoDocument('AMC_VERIFICATION_PHOTO'), isFalse);
      expect(isAmcReadingPhotoDocument('image'), isFalse);
    });

    test('visit search asks for site details and searches by text', () {
      final map = const ScheduledVisitSearchCriteria(
        tenantId: 'livelihood',
        statuses: ['SCHEDULED'],
        searchText: ' Nipe ',
        includeSiteDetails: true,
        sortBy: 'scheduledDate',
        sortDirection: 'ASC',
      ).toApiMap();
      expect(map, {
        'tenantId': 'livelihood',
        'statuses': ['SCHEDULED'],
        'searchText': 'Nipe',
        'includeSiteDetails': true,
        'sortBy': 'scheduledDate',
        'sort_direction': 'ASC',
      });
    });

    test('a contract visit shows its own names, places and visit count', () {
      final visit = ScheduledVisit.fromJson({
        'id': 'v1',
        'visitNumber': 2,
        'totalVisits': 6,
        'facilityName': 'Nipe Brahma',
        'facility': {'facilityPocPhone': '9678335201'},
        'state': 'Assam',
        'district': 'Baksa',
        'block': 'Dhamdhama',
        'siteDetails': {
          'batteryType': 'Lead Acid',
          'systemType': null,
          'installationDate': DateTime(2026, 5, 1).millisecondsSinceEpoch,
          'purchaseOrderNumber': 'PO-1',
          'pinCode': '',
        },
      });
      expect(visit.displayFacilityName, 'Nipe Brahma');
      expect(visit.facility?.facility_poc_phone, '9678335201');
      final locality = amcVisitLocality(visit);
      expect([locality.state, locality.district, locality.block],
          ['Assam', 'Baksa', 'Dhamdhama']);
      expect(
          formatAmcNumber(visit.visitNumber, null, null,
              totalVisits: visit.totalVisits),
          '2 / 6');
      final site = AmcSiteDetails.fromVisit(visit).toFormValues();
      expect(site, {
        'endUserName': 'Nipe Brahma',
        'endUserPhone': '9678335201',
        'installationDate': '01/05/2026',
        'block': 'Dhamdhama',
        'district': 'Baksa',
        'purchaseOrderNumber': 'PO-1',
        amcBatteryTypeField: 'LEAD_ACID',
      });
    });

    test('service code calls send only the code', () async {
      final fake = _FakeAmcRemoteDataSource();
      await ScheduledVisitRemoteRepository(dataSource: fake)
          .updateVisitWorkflow(
              visitId: 'v1', otp: '1234', status: 'SUBMIT_OTP');
      expect(fake.workflowBodies.single, {
        'visitId': 'v1',
        'workflow': {'action': 'SUBMIT_OTP', 'comment': null, 'documents': []},
        'visitReport': {'otpReference': '1234'},
      });
    });
  });

  group('New Report filtered on the device (backend date bug)', () {
    final now = DateTime(2026, 11, 18, 10, 30);
    ScheduledVisit visit(String id, DateTime? date,
            {String status = 'SCHEDULED'}) =>
        ScheduledVisit(id: id, status: status, scheduledDate: date);
    final visits = [
      visit('later', DateTime(2026, 12, 1)),
      visit('overdue', DateTime(2026, 11, 10)),
      visit('today', DateTime(2026, 11, 18, 9)),
      visit('last-day', DateTime(2026, 12, 18, 23)),
      visit('too-far', DateTime(2026, 12, 19)),
      visit('no-date', null),
      visit('done', DateTime(2026, 11, 20), status: 'PENDING_APPROVAL'),
      visit('later', DateTime(2026, 12, 1)),
    ];
    List<String?> ids(List<ScheduledVisit> list) =>
        list.map((v) => v.id).toList();

    test('New Report: due within 30 days (overdue too), soonest first', () {
      expect(ids(amcNewReportVisits(visits, now: now)),
          ['overdue', 'today', 'later', 'last-day']);
      expect(ids(amcNewReportVisits(visits, now: now, sortDirection: 'DESC')),
          ['last-day', 'later', 'today', 'overdue']);
    });

    test('AMC delayed: only visits whose date has passed', () {
      expect(ids(amcNewReportVisits(visits, now: now, delayedOnly: true)),
          ['overdue']);
    });

    test('the search sends no date, so the real backend accepts it', () async {
      final backend = _VisitsBackend(_sampleVisits());
      final remote = ScheduledVisitRemoteRepository(dataSource: backend);

      final all = await remote.fetchAllScheduled(pageSize: 3);
      expect(backend.criteria, isNotEmpty);
      for (final sent in backend.criteria) {
        expect(sent.containsKey('scheduledDateFrom'), isFalse);
        expect(sent.containsKey('scheduledDateTo'), isFalse);
        expect(sent['statuses'], ['SCHEDULED']);
      }
      expect(ids(amcNewReportVisits(all)), [
        'v-overdue',
        'v-today',
        'v-2',
        'v-5',
        'v-9',
        'v-15',
        'v-30',
      ]);
      expect(ids(amcNewReportVisits(all, delayedOnly: true)), ['v-overdue']);

      // Name search still goes to the server.
      backend.criteria.clear();
      final found = await remote.fetchAllScheduled(searchText: 'kollegal');
      expect(ids(found), ['v-5']);
      expect(backend.criteria.single['searchText'], 'kollegal');
      // A blank search is not sent.
      backend.criteria.clear();
      await remote.fetchAllScheduled(searchText: '  ');
      expect(backend.criteria.single.containsKey('searchText'), isFalse);
    });
  });

  group('AMC View Schedule (#252)', () {
    // 17 Nov 2026, 10:30 on the device's calendar.
    final now = DateTime(2026, 11, 17, 10, 30);
    ScheduledVisit visit(String id, DateTime? date,
            {String status = 'SCHEDULED'}) =>
        ScheduledVisit(id: id, status: status, scheduledDate: date);

    test('offers only 10, 20 and 30 days, 30 selected first', () {
      expect(amcSchedulePeriods, [10, 20, 30]);
      expect(amcDefaultSchedulePeriod, 30);
      expect(amcSchedulePeriods.last, amcSubmissionWindowDays);
    });

    test('a period runs from the start of today to the end of its last day',
        () {
      expect(amcScheduleStart(now), DateTime(2026, 11, 17));
      expect(amcScheduleEnd(10, now),
          DateTime(2026, 11, 28).subtract(const Duration(milliseconds: 1)));
      // Same last day as New Report's 30-day window.
      expect(amcScheduleEnd(30, now), amcSubmissionWindowEnd(now));

      bool inTen(DateTime? date, [String status = 'SCHEDULED']) =>
          isInAmcSchedule(visit('v', date, status: status), 10, now);
      expect(inTen(DateTime(2026, 11, 17)), isTrue); // today, earlier hour
      expect(inTen(DateTime(2026, 11, 27, 23, 59)), isTrue);
      expect(inTen(DateTime(2026, 11, 28)), isFalse);
      expect(inTen(DateTime(2026, 11, 16, 23, 59)), isFalse); // overdue
      expect(inTen(null), isFalse);
      expect(inTen(DateTime(2026, 11, 20), 'PENDING_OTP_APPROVAL'), isFalse);
    });

    test('lists the period earliest due first, once per visit', () {
      final list = amcScheduleVisits([
        visit('c', DateTime(2026, 11, 25)),
        visit('a', DateTime(2026, 11, 18)),
        visit('late', DateTime(2026, 12, 30)),
        visit('a', DateTime(2026, 11, 18)),
        visit('b', DateTime(2026, 11, 20)),
      ], 10, now);
      expect(list.map((v) => v.id), ['a', 'b', 'c']);
    });

    test('reads the machine names from the site details', () {
      expect(
          amcMachineNames({
            'machines': [
              {'name': 'Sewing Machine', 'solutionId': 'S1'},
              {'name': ' ', 'solutionId': 'SOL-CHAFF'},
              {'name': null, 'solutionId': null},
              'Oil Expeller',
            ],
          }),
          ['Sewing Machine', 'SOL-CHAFF', 'Oil Expeller']);
      expect(amcMachineNames({'machines': null}), isEmpty);
      expect(amcMachineNames(null), isEmpty);
    });

    group('fetched from the visit search', () {
      late ScheduledVisitRemoteRepository remote;

      setUp(() => remote = ScheduledVisitRemoteRepository(
          dataSource: _VisitsBackend(_sampleVisits())));

      test('fetches every page of not-started visits, earliest first',
          () async {
        final visits = await remote.fetchAllScheduled(pageSize: 3);
        expect(visits.map((v) => v.id), [
          'v-overdue',
          'v-today',
          'v-2',
          'v-5',
          'v-9',
          'v-15',
          'v-30',
          'v-31',
        ]);
      });

      test('each period shows only the visits due within it', () async {
        final visits = await remote.fetchAllScheduled();
        List<String?> ids(int days) =>
            amcScheduleVisits(visits, days).map((v) => v.id).toList();
        const tenDays = ['v-today', 'v-2', 'v-5', 'v-9'];
        expect(ids(10), tenDays);
        expect(ids(20), [...tenDays, 'v-15']);
        expect(ids(30), [...tenDays, 'v-15', 'v-30']);
      });

      test('a row has the screen fields and the machines', () async {
        final visits = await remote.fetchAllScheduled();
        final entry = AmcScheduleEntry.fromVisit(
            visits.firstWhere((v) => v.id == 'v-15'));
        expect(entry.endUserName, 'Ramesh Kumar');
        expect(entry.phone, '9845000012');
        expect(entry.state, 'Karnataka');
        expect(entry.district, 'Mysuru');
        expect(entry.block, 'Periyapatna');
        expect(entry.machines, ['Chaff Cutter', 'Milking Machine, Milk Can']);
      });
    });

    test('the Excel file has a header row and one row per visit', () {
      final bytes = buildAmcScheduleWorkbook(
        headers: const [
          'End user name',
          'Phone number',
          'State',
          'District',
          'Block',
          'Scheduled AMC date',
          'Machines',
        ],
        entries: [
          AmcScheduleEntry(
            visitId: 'v1',
            endUserName: 'Ramesh Kumar',
            phone: '09876543210',
            state: 'Assam',
            district: 'Kamrup',
            block: 'Rangia',
            scheduledDate: DateTime(2026, 11, 20),
            machines: const ['Sewing Machine', 'Chaff Cutter'],
          ),
        ],
      );
      final excel = Excel.decodeBytes(bytes);
      expect(excel.tables.keys, [amcScheduleSheetName]);
      final rows = excel.tables[amcScheduleSheetName]!.rows
          .map((row) => row.map((cell) => cell?.value?.toString()).toList())
          .toList();
      expect(rows, [
        [
          'End user name',
          'Phone number',
          'State',
          'District',
          'Block',
          'Scheduled AMC date',
          'Machines',
        ],
        [
          'Ramesh Kumar',
          '09876543210', // text, so the leading zero stays
          'Assam',
          'Kamrup',
          'Rangia',
          '20/11/2026',
          'Sewing Machine, Chaff Cutter',
        ],
      ]);
      expect(amcScheduleFileName(30, now),
          'AMC_Schedule_next_30_days_2026-11-17.xlsx');
    });

    group('screen', () {
      Future<void> pumpSchedule(
          WidgetTester tester, _FakeScheduleRepository repository) async {
        tester.view.physicalSize = const Size(1080, 6000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        final router = _ScheduleTestRouter();
        await tester.pumpWidget(MaterialApp.router(
          routerConfig: router.config(
            deepLinkBuilder: (_) =>
                DeepLink([AmcViewScheduleRoute(repository: repository)]),
          ),
        ));
        await tester.pumpAndSettle();
      }

      final today = DateTime.now();
      ScheduledVisit due(String id, int days) => ScheduledVisit(
            id: id,
            status: 'SCHEDULED',
            scheduledDate:
                DateTime(today.year, today.month, today.day + days, 12),
            facilityName: 'Site $id',
          );
      final all = [due('a', 1), due('b', 15), due('c', 25)];
      AmcScheduleResult resultFor(int days) =>
          AmcScheduleResult(visits: amcScheduleVisits(all, days));
      Finder card(String id) => find.byKey(ValueKey('amc-schedule-$id'));
      DigitButton downloadButton(WidgetTester tester) =>
          tester.widget(find.byKey(const ValueKey('amc-schedule-download')));

      testWidgets('opens on 30 days; another period fetches again',
          (tester) async {
        final repository =
            _FakeScheduleRepository((days) async => resultFor(days));
        await pumpSchedule(tester, repository);

        expect(repository.requestedDays, [30]);
        for (final id in ['a', 'b', 'c']) {
          expect(card(id), findsOneWidget);
        }
        expect(find.text('Site b'), findsOneWidget);
        expect(downloadButton(tester).isDisabled, isFalse);

        await tester.tap(find.byKey(const ValueKey('amc-schedule-period-10')));
        await tester.pumpAndSettle();
        expect(repository.requestedDays, [30, 10]);
        expect(card('a'), findsOneWidget);
        expect(card('b'), findsNothing);
        expect(card('c'), findsNothing);
        expect(
            find.byKey(const ValueKey('amc-schedule-period-40')), findsNothing);
      });

      testWidgets('says so when nothing is due; nothing to download',
          (tester) async {
        await pumpSchedule(
            tester,
            _FakeScheduleRepository(
                (_) async => const AmcScheduleResult(visits: [])));
        expect(
            find.byKey(const ValueKey('amc-schedule-empty')), findsOneWidget);
        expect(downloadButton(tester).isDisabled, isTrue);
      });

      testWidgets('a failed load shows Retry, which loads again',
          (tester) async {
        var fail = true;
        final repository = _FakeScheduleRepository((days) async {
          if (fail) throw Exception('offline');
          return resultFor(days);
        });
        await pumpSchedule(tester, repository);
        expect(
            find.byKey(const ValueKey('amc-schedule-retry')), findsOneWidget);
        expect(downloadButton(tester).isDisabled, isTrue);

        fail = false;
        await tester.tap(find.byKey(const ValueKey('amc-schedule-retry')));
        await tester.pumpAndSettle();
        expect(card('a'), findsOneWidget);
        expect(find.byKey(const ValueKey('amc-schedule-retry')), findsNothing);
      });

      testWidgets('offline, the saved copy is shown with a notice',
          (tester) async {
        await pumpSchedule(
            tester,
            _FakeScheduleRepository((days) async => AmcScheduleResult(
                visits: amcScheduleVisits(all, days), fromCache: true)));
        expect(
            find.byKey(const ValueKey('amc-schedule-offline')), findsOneWidget);
        expect(card('a'), findsOneWidget);
      });
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
      expect(
          find.byKey(const ValueKey('amc-home-view-schedule')), findsOneWidget);
      expect(
          find.byKey(const ValueKey('amc-mdms-loading-dialog')), findsNothing);
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
      expect(
          find.byKey(const ValueKey('role-selection-staff')), findsOneWidget);
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
