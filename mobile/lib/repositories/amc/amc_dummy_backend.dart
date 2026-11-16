import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:synchronized/synchronized.dart';

import '../../utils/api_paths.dart';
import '../../utils/envConfig.dart';
import 'amc_dummy_form_schema.dart';
import 'amc_remote_data_source.dart';

/// DUMMY-BACKEND: a fake `amc-scheduler-service` + MDMS + filestore used
/// while `kAmcUseDummyBackend` is true. Remove this file (and
/// `amc_dummy_form_schema.dart`) once the real backend is wired.
///
/// It behaves like the AMC_VISIT workflow so every E4H screen can be
/// exercised: visits start in each status; `SUBMIT_VISIT_REPORT` moves a
/// visit to `PENDING_OTP_APPROVAL`; `SUBMIT_OTP` with [dummyAmcOtp] moves it
/// to `PENDING_APPROVAL` (any other code fails like an invalid OTP).
///
/// State is a JSON file in app-support storage (not memory) because the
/// report submission runs in the background-service isolate, and both
/// isolates must see the same "server". Delete the app's data (or call
/// [DummyAmcRemoteDataSource.reset]) to start over.
const String dummyAmcOtp = '1234';

const String _dummyFileStorePrefix = 'dummy-filestore-';

bool isDummyFileStoreId(String value) =>
    value.startsWith(_dummyFileStorePrefix);

class DummyAmcRemoteDataSource implements AmcRemoteDataSource {
  DummyAmcRemoteDataSource({
    this.latency = const Duration(milliseconds: 400),
    Future<Directory> Function()? storageDirectory,
  }) : _storageDirectory = storageDirectory ?? getApplicationSupportDirectory;

  final Duration latency;
  final Future<Directory> Function() _storageDirectory;
  static final _lock = Lock();

  Future<File> _stateFile() async =>
      File(p.join((await _storageDirectory()).path, 'amc_dummy_backend.json'));

  Future<Directory> _fileStoreDir() async {
    final dir = Directory(
        p.join((await _storageDirectory()).path, 'amc_dummy_filestore'));
    await dir.create(recursive: true);
    return dir;
  }

  Future<List<Map<String, dynamic>>> _readVisits() async {
    final file = await _stateFile();
    if (await file.exists()) {
      try {
        final decoded = jsonDecode(await file.readAsString());
        if (decoded is List) {
          return decoded
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        }
      } catch (_) {
        // Corrupt state: fall through to a fresh seed.
      }
    }
    final seeded = dummySeedVisits();
    await _writeVisits(seeded);
    return seeded;
  }

  Future<void> _writeVisits(List<Map<String, dynamic>> visits) async {
    final file = await _stateFile();
    await file.parent.create(recursive: true);
    await file.writeAsString(jsonEncode(visits), flush: true);
  }

  /// Restores the seeded sample visits.
  Future<void> reset() => _lock.synchronized(() async {
        final file = await _stateFile();
        if (await file.exists()) await file.delete();
      });

  Never _badRequest(String path, String code, String message) {
    final requestOptions = RequestOptions(path: path);
    throw DioException(
      requestOptions: requestOptions,
      type: DioExceptionType.badResponse,
      response: Response(
        requestOptions: requestOptions,
        statusCode: 400,
        data: {
          'Errors': [
            {'code': code, 'message': message}
          ]
        },
      ),
      message: message,
    );
  }

  @override
  Future<Map<String, dynamic>> searchVisits({
    required Map<String, dynamic> searchCriteria,
    required int limit,
    required int offset,
  }) async {
    await Future<void>.delayed(latency);
    final visits = await _lock.synchronized(_readVisits);

    final statuses = (searchCriteria['statuses'] as List?)
            ?.map((e) => e.toString())
            .toSet() ??
        const <String>{};
    final name =
        searchCriteria['facilityName']?.toString().trim().toLowerCase() ?? '';
    final sort = searchCriteria['sort_direction']?.toString();
    // Same inclusive bounds as the real query builder.
    final from = searchCriteria['scheduledDateFrom'] as num?;
    final to = searchCriteria['scheduledDateTo'] as num?;

    final matching = visits.where((visit) {
      if (statuses.isNotEmpty && !statuses.contains(visit['status'])) {
        return false;
      }
      final scheduled = visit['scheduledDate'] as num?;
      if (from != null && (scheduled == null || scheduled < from)) {
        return false;
      }
      if (to != null && (scheduled == null || scheduled > to)) return false;
      final facilityName =
          ((visit['facility'] as Map?)?['facility_name'] ?? '')
              .toString()
              .toLowerCase();
      return name.isEmpty || facilityName.contains(name);
    }).toList()
      ..sort((a, b) {
        final order = ((a['scheduledDate'] as num?) ?? 0)
            .compareTo((b['scheduledDate'] as num?) ?? 0);
        return sort == 'ASC' ? order : -order;
      });

    return {
      'ScheduledVisits': matching.skip(offset).take(limit).toList(),
      'TotalCount': matching.length,
    };
  }

  @override
  Future<Map<String, dynamic>?> updateVisitWorkflow(
      Map<String, dynamic> body) async {
    await Future<void>.delayed(latency);
    return _lock.synchronized(() async {
      final visits = await _readVisits();
      final visitId = body['visitId']?.toString();
      final index = visits.indexWhere((v) => v['id'] == visitId);
      if (index < 0) {
        _badRequest(ApiPaths.amcVisitWorkflowUpdate, 'INVALID_VISIT',
            'Scheduled visit not found');
      }

      final visit = visits[index];
      final workflow = Map<String, dynamic>.from(
          (body['workflow'] as Map?) ?? const <String, dynamic>{});
      final report = Map<String, dynamic>.from(
          (body['visitReport'] as Map?) ?? const <String, dynamic>{});
      final action = workflow['action']?.toString();
      final now = DateTime.now().millisecondsSinceEpoch;

      String nextStatus;
      switch (action) {
        case 'SUBMIT_VISIT_REPORT':
          if (visit['status'] != 'SCHEDULED' && visit['status'] != 'REJECTED') {
            _badRequest(ApiPaths.amcVisitWorkflowUpdate, 'INVALID_ACTION',
                'Action $action not allowed in ${visit['status']}');
          }
          nextStatus = 'PENDING_OTP_APPROVAL';
          visit['visitReport'] = {
            ...?(visit['visitReport'] as Map?)?.cast<String, dynamic>(),
            'schemaCode': report['schemaCode'],
            'version': report['version']?.toString(),
            'submittedAt': now,
            if (report['responses'] != null) 'responses': report['responses'],
            if (report['documents'] != null) 'documents': report['documents'],
            if (report['additionalDetails'] != null)
              'additionalDetails': report['additionalDetails'],
          };
          break;
        case 'SUBMIT_OTP':
          if (visit['status'] != 'PENDING_OTP_APPROVAL') {
            _badRequest(ApiPaths.amcVisitWorkflowUpdate, 'INVALID_ACTION',
                'Action $action not allowed in ${visit['status']}');
          }
          if (report['otpReference']?.toString() != dummyAmcOtp) {
            _badRequest(ApiPaths.amcVisitWorkflowUpdate, 'INVALID_OTP',
                'Invalid OTP');
          }
          // DUMMY-BACKEND: stand-in for the backend's auto-approval
          // evaluation (#249), so both outcomes can be tested: approved when
          // both pre-report answers (#247) are "Yes", otherwise sent for
          // review. The real rule is the backend's.
          final systemStatus = ((visit['visitReport'] as Map?)?[
                  'additionalDetails'] as Map?)?['systemStatus'] as Map?;
          nextStatus = systemStatus?['isSystemInUse'] == true &&
                  systemStatus?['isSystemFunctional'] == true
              ? 'APPROVED'
              : 'PENDING_APPROVAL';
          visit['visitReport'] = {
            ...?(visit['visitReport'] as Map?)?.cast<String, dynamic>(),
            'otpReference': report['otpReference'],
            'otpVerifiedAt': now,
          };
          break;
        default:
          _badRequest(ApiPaths.amcVisitWorkflowUpdate, 'INVALID_ACTION',
              'Unsupported action $action');
      }

      visit['status'] = nextStatus;
      visit['processInstances'] = [
        {
          'id': 'dummy-pi-$now',
          'businessId': visitId,
          'businessService': 'AMC_VISIT',
          'action': action,
          'state': {'state': nextStatus},
          'comment': workflow['comment'],
          'auditDetails': {'lastModifiedTime': now, 'createdTime': now},
        },
        ...((visit['processInstances'] as List?) ?? const []),
      ];
      visits[index] = visit;
      await _writeVisits(visits);
      // Same shape as the real `workflow/_update` response.
      return <String, dynamic>{
        'ResponseInfo': {'status': 'successful'},
        'ScheduledVisits': [visit],
      };
    });
  }

  @override
  Future<void> resendVisitOtp(String visitId) async {
    await Future<void>.delayed(latency);
    // The real service re-sends the SMS; here the code stays [dummyAmcOtp].
  }

  /// Records each call on the visit (`dummySystemStatusUpdates`) so tests
  /// and testers can see what was sent. The real service emails the
  /// Program POC (once per activity). The visit status does not change.
  @override
  Future<void> updateSystemStatus(Map<String, dynamic> body) async {
    await Future<void>.delayed(latency);
    await _lock.synchronized(() async {
      final visits = await _readVisits();
      final visitId = body['visitId']?.toString();
      final index = visits.indexWhere((v) => v['id'] == visitId);
      if (index < 0) {
        _badRequest(ApiPaths.amcVisitSystemStatusUpdate, 'INVALID_VISIT',
            'Scheduled visit not found');
      }
      final visit = visits[index];
      visit['dummySystemStatusUpdates'] = [
        ...?(visit['dummySystemStatusUpdates'] as List?),
        {
          ...body,
          'receivedAt': DateTime.now().millisecondsSinceEpoch,
        },
      ];
      await _writeVisits(visits);
    });
  }

  @override
  Future<List<dynamic>> searchAmcFormSchemaDocs(
      Map<String, dynamic> mdmsRequestBody) async {
    await Future<void>.delayed(latency);
    return [dummyAmcFormSchemaDoc(envConfig.variables.tenantId)];
  }

  @override
  Future<String> uploadFile(String localFilePath) async {
    await Future<void>.delayed(latency);
    final id = '$_dummyFileStorePrefix${DateTime.now().microsecondsSinceEpoch}';
    final dir = await _fileStoreDir();
    await File(localFilePath).copy(p.join(dir.path, id));
    return id;
  }

  @override
  Future<List<int>?> downloadFile(String fileStoreId) async {
    final file = File(p.join((await _fileStoreDir()).path, fileStoreId));
    return await file.exists() ? file.readAsBytes() : null;
  }
}

/// Sample visits, one or more per AMC status, shaped like
/// `asset-amc/v1/visit/_search` results.
List<Map<String, dynamic>> dummySeedVisits() {
  final tenantId = envConfig.variables.tenantId;
  final now = DateTime.now();
  int daysFromNow(int days) =>
      now.add(Duration(days: days)).millisecondsSinceEpoch;

  Map<String, dynamic> config(String id, String facilityId) => {
        'id': id,
        'tenantId': tenantId,
        'facilityId': facilityId,
        'durationMonths': 12,
        'visitFrequencyMonths': 3,
        'totalVisits': 4,
        'status': 'ACTIVE',
        'assetTypes': [
          {'code': 'PANEL', 'name': 'Panel'},
          {'code': 'BATTERY', 'name': 'Battery'},
          {'code': 'INVERTER', 'name': 'Inverter'},
        ],
      };

  Map<String, dynamic> facility(String id, String name, String boundary) => {
        'tenant_id': tenantId,
        'facility_id': id,
        'facility_name': name,
        'boundaryCode': boundary,
        'facility_type': 'PHC',
        'facility_poc_name': 'Ravi Kumar',
        'facility_poc_phone': '9876543210',
      };

  Map<String, dynamic> instance(String id, String state, int at,
          {Object? comment}) =>
      {
        'id': 'dummy-pi-$id-$state',
        'businessId': id,
        'businessService': 'AMC_VISIT',
        'state': {'state': state},
        if (comment != null) 'comment': comment,
        'auditDetails': {'lastModifiedTime': at, 'createdTime': at},
      };

  /// #250: the end user's site record (Site Details section). Where the
  /// real API puts this is not decided yet; see `AmcSiteDetails`.
  Map<String, dynamic> siteDetails(String id, String boundary,
      {required String endUser, String battery = 'Lead Acid',
      String system = 'DC'}) {
    final parts = boundary.split('_');
    final number = id.split('-').last;
    return {
      'endUserName': endUser,
      'endUserPhone': '98450${number.padLeft(5, '0')}',
      'installationDate': daysFromNow(-200),
      'block': parts.length > 3 ? parts[3] : '',
      'district': parts.length > 2 ? parts[2] : '',
      'pincode': '571${number.padLeft(3, '0')}',
      'purchaseOrderNumber': 'PO-2026-$number',
      'batteryType': battery,
      'systemType': system,
    };
  }

  Map<String, dynamic> visit({
    required String id,
    required String name,
    required String boundary,
    required String status,
    required int visitNumber,
    required int scheduledInDays,
    Map<String, dynamic>? visitReport,
    Object? comment,
    String endUser = 'Lakshmi Devi',
    String battery = 'Lead Acid',
    String system = 'DC',
  }) {
    final facilityId = 'dummy-facility-$id';
    final at = daysFromNow(scheduledInDays);
    return {
      'id': id,
      'tenantId': tenantId,
      'amcConfigurationId': 'dummy-config-$id',
      'amcConfiguration': config('dummy-config-$id', facilityId),
      'facilityId': facilityId,
      'facility': facility(facilityId, name, boundary),
      'visitNumber': visitNumber,
      'scheduledDate': at,
      'status': status,
      if (visitReport != null) 'visitReport': visitReport,
      'processInstances': [instance(id, status, at, comment: comment)],
      'assignments': const [],
      'additionalDetails': {
        'siteDetails': siteDetails(id, boundary,
            endUser: endUser, battery: battery, system: system),
      },
    };
  }

  final submittedReport = {
    'schemaCode': amcDummySchemaCode,
    'version': '1',
    // #250: a lead-acid DC site. Reading photos are left out (the dummy
    // filestore has no files for them), so a rework asks for them again.
    'responses': dummySubmittedAmcResponses(daysFromNow(-1)),
    'documents': const [],
    // Pre-report system status (#247), as the app submits it.
    'additionalDetails': {
      'systemStatus': {
        'isSystemInUse': true,
        'isSystemFunctional': true,
        'nonFunctionalNotified': false,
      },
    },
  };

  return [
    visit(
      id: 'dummy-visit-001',
      name: 'PHC Hunsur',
      boundary: 'IN_KARNATAKA_MYSURU_HUNSUR',
      status: 'SCHEDULED',
      visitNumber: 2,
      scheduledInDays: 2,
    ),
    visit(
      id: 'dummy-visit-002',
      name: 'CHC Kollegal',
      boundary: 'IN_KARNATAKA_CHAMARAJANAGAR_KOLLEGAL',
      status: 'SCHEDULED',
      visitNumber: 1,
      scheduledInDays: 5,
      endUser: 'Manjunath S',
      battery: 'Lithium Ion',
      system: 'AC',
    ),
    visit(
      id: 'dummy-visit-003',
      name: 'Sub Centre Hosur',
      boundary: 'IN_KARNATAKA_MANDYA_PANDAVAPURA',
      status: 'SCHEDULED',
      visitNumber: 3,
      scheduledInDays: 9,
      endUser: 'Shivamma K',
      system: 'AC',
    ),
    // "AMC delayed" samples: one overdue, one due today (not delayed).
    visit(
      id: 'dummy-visit-008',
      name: 'PHC Bannur',
      boundary: 'IN_KARNATAKA_MYSURU_T NARASIPURA',
      status: 'SCHEDULED',
      visitNumber: 2,
      scheduledInDays: -4,
      endUser: 'Ravi Gowda',
      battery: 'Lithium Ion',
    ),
    visit(
      id: 'dummy-visit-009',
      name: 'CHC Malavalli',
      boundary: 'IN_KARNATAKA_MANDYA_MALAVALLI',
      status: 'SCHEDULED',
      visitNumber: 1,
      scheduledInDays: 0,
    ),
    // 30-day window samples: +30 days is listed, +31 days is hidden.
    visit(
      id: 'dummy-visit-010',
      name: 'PHC Saligrama',
      boundary: 'IN_KARNATAKA_MYSURU_K R NAGAR',
      status: 'SCHEDULED',
      visitNumber: 1,
      scheduledInDays: 30,
    ),
    visit(
      id: 'dummy-visit-011',
      name: 'CHC Hanur',
      boundary: 'IN_KARNATAKA_CHAMARAJANAGAR_HANUR',
      status: 'SCHEDULED',
      visitNumber: 1,
      scheduledInDays: 31,
    ),
    visit(
      id: 'dummy-visit-004',
      name: 'PHC Kushalnagar',
      boundary: 'IN_KARNATAKA_KODAGU_SOMWARPET',
      status: 'PENDING_OTP_APPROVAL',
      visitNumber: 2,
      scheduledInDays: -3,
      visitReport: submittedReport,
    ),
    visit(
      id: 'dummy-visit-005',
      name: 'PHC Nanjangud',
      boundary: 'IN_KARNATAKA_MYSURU_NANJANGUD',
      status: 'PENDING_APPROVAL',
      visitNumber: 1,
      scheduledInDays: -6,
      visitReport: submittedReport,
    ),
    visit(
      id: 'dummy-visit-006',
      name: 'CHC Gundlupet',
      boundary: 'IN_KARNATAKA_CHAMARAJANAGAR_GUNDLUPET',
      status: 'APPROVED',
      visitNumber: 1,
      scheduledInDays: -20,
      visitReport: submittedReport,
    ),
    visit(
      id: 'dummy-visit-007',
      name: 'PHC Saragur',
      boundary: 'IN_KARNATAKA_MYSURU_HD KOTE',
      status: 'REJECTED',
      visitNumber: 2,
      scheduledInDays: -10,
      visitReport: submittedReport,
      // The web reviewer stores rejection reasons as a JSON list string.
      comment: jsonEncode([
        {
          'reason': 'Photos are not clear',
          'comment': 'Retake the panel photos in daylight.',
        },
        {
          'reason': 'Battery details missing',
          'comment': 'Record the battery condition.',
        },
      ]),
    ),
  ];
}

/// #250: answers of a submitted report on a lead-acid DC site (field names
/// from the dummy form schema).
Map<String, dynamic> dummySubmittedAmcResponses(int visitedAt) => {
      'date_of_visit':
          DateTime.fromMillisecondsSinceEpoch(visitedAt).toUtc().toIso8601String(),
      'service_by': 'Suresh Kumar',
      'service_contact_number': '9876501234',
      'pcu_priority': 'SOLAR_BATTERY_GRID',
      'panels_per_string': 4,
      for (final field in const [
        'solar_cables_tied',
        'solar_panels_clean',
        'solar_mms_rusting',
        'solar_nuts_bolts_rusting',
        'ajb_mounted_firm',
        'battery_terminals_clean',
        'battery_petroleum_jelly',
        'battery_float_indicators_ok',
        'battery_water_level_ok',
        'pcu_cables_intact',
        'la_insulation',
        'la_firmly_fixed',
        'la_saddle_insulators',
        'earthing_conduit',
        'earthing_cable_contact',
        'earthing_electrodes_buried',
        'cable_lugs_used',
        'cable_lugs_crimped',
        'cable_lugs_insulated',
        'mc4_interlocked',
      ])
        field: 'YES',
      'solar_mms_rusting': 'NO',
      'solar_nuts_bolts_rusting': 'NO',
      'la_saddle_insulators': 'NA',
      'pcu_neutral_earth_voltage': '2.5',
      'grid_neutral_earth_voltage': '3',
      'inverter_output_voltage': '230.4',
      'earthing_electrode_available': 'YES',
      'earthing_wire_connected': 'YES',
      'battery_specific_gravity': 'GOOD',
      'solar_spd': 'WORKING',
      'vendor_remarks': 'All components working normally.',
    };
