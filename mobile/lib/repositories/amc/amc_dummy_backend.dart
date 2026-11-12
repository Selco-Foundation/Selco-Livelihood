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
  Future<void> updateVisitWorkflow(Map<String, dynamic> body) async {
    await Future<void>.delayed(latency);
    await _lock.synchronized(() async {
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
          nextStatus = 'PENDING_APPROVAL';
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
    });
  }

  @override
  Future<void> resendVisitOtp(String visitId) async {
    await Future<void>.delayed(latency);
    // The real service re-sends the SMS; here the code stays [dummyAmcOtp].
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

  Map<String, dynamic> visit({
    required String id,
    required String name,
    required String boundary,
    required String status,
    required int visitNumber,
    required int scheduledInDays,
    Map<String, dynamic>? visitReport,
    Object? comment,
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
    };
  }

  final submittedReport = {
    'schemaCode': amcDummySchemaCode,
    'version': '1',
    'responses': {
      'faults_observed': 'NO',
      'panel_condition': 'GOOD',
      'battery_condition': 'GOOD',
      'inverter_condition': 'GOOD',
      'remarks': 'All components working normally.',
    },
    'documents': const [],
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
    ),
    visit(
      id: 'dummy-visit-003',
      name: 'Sub Centre Hosur',
      boundary: 'IN_KARNATAKA_MANDYA_PANDAVAPURA',
      status: 'SCHEDULED',
      visitNumber: 3,
      scheduledInDays: 9,
    ),
    // "AMC delayed" samples: one overdue, one due today (not delayed).
    visit(
      id: 'dummy-visit-008',
      name: 'PHC Bannur',
      boundary: 'IN_KARNATAKA_MYSURU_T NARASIPURA',
      status: 'SCHEDULED',
      visitNumber: 2,
      scheduledInDays: -4,
    ),
    visit(
      id: 'dummy-visit-009',
      name: 'CHC Malavalli',
      boundary: 'IN_KARNATAKA_MANDYA_MALAVALLI',
      status: 'SCHEDULED',
      visitNumber: 1,
      scheduledInDays: 0,
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
