import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:synchronized/synchronized.dart';

import '../../utils/api_paths.dart';
import '../../utils/envConfig.dart';
import 'amc_report_form_schema.dart';
import 'amc_remote_data_source.dart';

/// DUMMY-BACKEND: a fake `amc-scheduler-service` + MDMS + filestore used
/// while `kAmcUseDummyBackend` is true. Remove this file (and
/// `amc_report_form_schema.dart`) once the real backend is wired.
///
/// It follows the "Livelihood AMC API Contract" (16 Nov 2026) so every
/// screen can be exercised: visits start in each status;
/// `SUBMIT_VISIT_REPORT` moves a visit to `PENDING_OTP_APPROVAL`;
/// `SUBMIT_OTP` with [dummyAmcOtp] runs the auto-approval rules
/// ([dummyAutoApproval]) and moves it to `APPROVED` (by `SYSTEM`) or
/// `PENDING_APPROVAL`. Errors use the contract's codes.
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
    final search =
        searchCriteria['searchText']?.toString().trim().toLowerCase() ?? '';
    final searchPhone = search.replaceAll(' ', '').replaceFirst('+91', '');
    final withSiteDetails = searchCriteria['includeSiteDetails'] == true;
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
      if (search.isEmpty) return true;
      // End user name contains the text, or the phone matches exactly.
      final names = [
        visit['facilityName'],
        (visit['facility'] as Map?)?['facilityPocName'],
      ].map((n) => (n ?? '').toString().toLowerCase());
      final phone = (visit['facility'] as Map?)?['facilityPocPhone'];
      return names.any((n) => n.contains(search)) || phone == searchPhone;
    }).toList()
      ..sort((a, b) {
        final order = ((a['scheduledDate'] as num?) ?? 0)
            .compareTo((b['scheduledDate'] as num?) ?? 0);
        return sort == 'ASC' ? order : -order;
      });

    return {
      'ScheduledVisits': [
        for (final visit in matching.skip(offset).take(limit))
          withSiteDetails ? visit : (Map.of(visit)..remove('siteDetails')),
      ],
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
        _badRequest(ApiPaths.amcVisitWorkflowUpdate, 'AMC_VISIT_NOT_FOUND',
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
            _badRequest(
                ApiPaths.amcVisitWorkflowUpdate,
                'AMC_VISIT_NOT_SUBMITTABLE',
                'This report has already been submitted.');
          }
          final opensAt = visit['submissionWindowOpensAt'] as num?;
          if (visit['status'] == 'SCHEDULED' &&
              opensAt != null &&
              now < opensAt) {
            _badRequest(
                ApiPaths.amcVisitWorkflowUpdate,
                'AMC_SUBMISSION_WINDOW_NOT_OPEN',
                'The report can be submitted from 30 days before the AMC '
                    'date.');
          }
          final documents = (report['documents'] as List?) ?? const [];
          if (!documents.any((d) =>
              d is Map && d['documentType'] == 'AMC_VERIFICATION_PHOTO')) {
            _badRequest(
                ApiPaths.amcVisitWorkflowUpdate,
                'AMC_VERIFICATION_PHOTO_MISSING',
                'Add the photo of the system with the end user and the '
                    'technician.');
          }
          nextStatus = 'PENDING_OTP_APPROVAL';
          visit['visitReport'] = {
            ...?(visit['visitReport'] as Map?)?.cast<String, dynamic>(),
            'submittedAt': now,
            'responses': report['responses'] ?? const <String, dynamic>{},
            'documents': documents,
            'additionalDetails':
                report['additionalDetails'] ?? const <String, dynamic>{},
          };
          visit['firstSubmissionDate'] ??= now;
          visit['latestSubmissionDate'] = now;
          visit['additionalDetails'] = {
            ...?(visit['additionalDetails'] as Map?)?.cast<String, dynamic>(),
            'reportPdf': {
              'fileStoreId': '${_dummyFileStorePrefix}pdf-$now',
              'visitStatus': nextStatus,
            },
          };
          break;
        case 'SUBMIT_OTP':
          if (visit['status'] != 'PENDING_OTP_APPROVAL') {
            _badRequest(
                ApiPaths.amcVisitWorkflowUpdate,
                'AMC_ACTION_NOT_ALLOWED',
                'Action $action not allowed in ${visit['status']}');
          }
          if (report['otpReference']?.toString() != dummyAmcOtp) {
            _badRequest(ApiPaths.amcVisitWorkflowUpdate,
                'AMC_INVALID_SERVICE_CODE', 'The service code is wrong.');
          }
          final responses =
              ((visit['visitReport'] as Map?)?['responses'] as Map?)
                  ?.cast<String, dynamic>();
          final approval = dummyAutoApproval(responses ?? const {},
              (visit['siteDetails'] as Map?)?.cast<String, dynamic>());
          nextStatus =
              approval['allPassed'] == true ? 'APPROVED' : 'PENDING_APPROVAL';
          if (nextStatus == 'APPROVED') visit['approvedBy'] = 'SYSTEM';
          visit['additionalDetails'] = {
            ...?(visit['additionalDetails'] as Map?)?.cast<String, dynamic>(),
            'autoApproval': approval,
          };
          visit['visitReport'] = {
            ...?(visit['visitReport'] as Map?)?.cast<String, dynamic>(),
            'otpReference': report['otpReference'],
            'otpVerifiedAt': now,
          };
          break;
        default:
          _badRequest(ApiPaths.amcVisitWorkflowUpdate, 'AMC_ACTION_NOT_ALLOWED',
              'Action $action is not allowed');
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
        _badRequest(ApiPaths.amcVisitSystemStatusUpdate, 'AMC_VISIT_NOT_FOUND',
            'Scheduled visit not found');
      }
      final status = body['systemStatus'];
      if (status is! Map ||
          status['isSystemInUse'] is! bool ||
          status['isSystemFunctional'] is! bool) {
        _badRequest(ApiPaths.amcVisitSystemStatusUpdate,
            'AMC_INVALID_SYSTEM_STATUS', 'Answer both questions.');
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
    return [amcReportFormSchemaDoc(envConfig.variables.tenantId)];
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

  /// `facility` as the visit search returns it (camelCase).
  Map<String, dynamic> facility(String id, String name, String boundary,
          {required String endUser, required String phone}) =>
      {
        'tenantId': tenantId,
        'facilityId': id,
        'facilityName': name,
        'boundaryCode': boundary,
        'facilityPocName': endUser,
        'facilityPocPhone': phone,
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

  /// `siteDetails` as the visit search returns it with
  /// `includeSiteDetails: true` (the contract's fields; the real
  /// `systemType` and `pinCode` are blank today, the samples fill them so
  /// the conditional questions can be tried).
  Map<String, dynamic> siteDetails(String id,
      {String battery = 'Lead Acid', String system = 'DC'}) {
    final number = id.split('-').last;
    return {
      'solarAssetId': 'dummy-solar-asset-$number',
      'components': const [],
      'batteryType': battery,
      'systemType': system,
      'installationDate': daysFromNow(-200),
      'purchaseOrderNumber': 'PO-2026-$number',
      'pinCode': '571${number.padLeft(3, '0')}',
      'machines': const [],
    };
  }

  String title(String code) => code
      .toLowerCase()
      .split(' ')
      .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
      .join(' ');

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
    final parts = boundary.split('_');
    final number = id.split('-').last;
    return {
      'id': id,
      'tenantId': tenantId,
      'amcConfigurationId': 'dummy-config-$id',
      'amcConfiguration': config('dummy-config-$id', facilityId),
      'activityFacilityId': 'dummy-activity-facility-$number',
      'facilityId': facilityId,
      'facilityName': name,
      'facility': facility(facilityId, name, boundary,
          endUser: endUser, phone: '98450${number.padLeft(5, '0')}'),
      'state': parts.length > 1 ? title(parts[1]) : '',
      'district': parts.length > 2 ? title(parts[2]) : '',
      'block': parts.length > 3 ? title(parts[3]) : '',
      'visitNumber': visitNumber,
      'totalVisits': 4,
      'scheduledDate': at,
      'submissionWindowOpensAt': DateTime.fromMillisecondsSinceEpoch(at)
          .subtract(const Duration(days: 30))
          .millisecondsSinceEpoch,
      'status': status,
      if (status == 'APPROVED') 'approvedBy': 'SYSTEM',
      'vendorName': 'Sample Vendor',
      'fieldStaff': const {'uuid': 'dummy-field-staff', 'name': 'You'},
      if (visitReport != null) 'visitReport': visitReport,
      'processInstances': [instance(id, status, at, comment: comment)],
      'assignments': const [],
      'siteDetails': siteDetails(id, battery: battery, system: system),
      'additionalDetails': const <String, dynamic>{},
    };
  }

  final submittedReport = {
    // #250: a lead-acid DC site. Photos are left out (the dummy filestore
    // has no files for them), so a rework asks for them again.
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
      // The web reviewer stores rejection reasons as a JSON list string;
      // `OTHERS` is the only reason code today (AMC API contract).
      comment: jsonEncode([
        {
          'reason': 'OTHERS',
          'comment': 'Retake the SPD photo in daylight.',
        },
        {
          'reason': 'OTHERS',
          'comment': 'Record the battery condition.',
        },
      ]),
    ),
  ];
}

/// #250: answers of a submitted report on a lead-acid DC site, as the app
/// sends them (contract report keys, readings as numbers).
Map<String, dynamic> dummySubmittedAmcResponses(int visitedAt) => {
      'visitDate': () {
        final d = DateTime.fromMillisecondsSinceEpoch(visitedAt);
        String two(int n) => n.toString().padLeft(2, '0');
        return '${d.year}-${two(d.month)}-${two(d.day)}';
      }(),
      'serviceBy': 'Suresh Kumar',
      'serviceByPhone': '9876501234',
      'pcuPriority': 'SOLAR_BATTERY_GRID',
      'panelsPerString': 4,
      for (final field in const [
        'obsPanelCablesTied',
        'obsPanelsClean',
        'obsAjbMounted',
        'obsBatteryTerminalsClean',
        'obsPetroleumJelly',
        'obsFloatIndicators',
        'obsDistilledWaterLevel',
        'obsPcuCablesIntact',
        'obsLaInsulation',
        'obsLaFixed',
        'obsDownConductorConduit',
        'obsEarthCableContact',
        'obsEarthElectrodesBuried',
        'obsCableLugsUsed',
        'obsCablesCrimped',
        'obsCableLugsInsulated',
        'obsMc4Intact',
      ])
        field: 'YES',
      'obsMmsRusting': 'NO',
      'obsNutsBoltsRusting': 'NO',
      'obsGiStripsInsulated': 'NA',
      'neVoltagePcuOutput': 2.5,
      'neVoltageGridInput': 3,
      'inverterOutputVoltage': 230.4,
      'earthingElectrodeAvailable': 'YES',
      'earthingWireConnected': 'YES',
      'batterySpecificGravity': 'GOOD',
      'solarSpdStatus': 'WORKING',
      'vendorRemarks': 'All components working normally.',
    };

/// The backend's auto-approval rules (AMC API contract, "Readings and
/// auto-approval rules"), applied when the service code is accepted: every
/// rule must pass, and a missing or non-numeric reading fails its rule.
/// The SPD rule applies only to the site's system type (DC: Solar SPD, AC:
/// Grid SPD).
Map<String, dynamic> dummyAutoApproval(
    Map<String, dynamic> responses, Map<String, dynamic>? siteDetails) {
  final system = (siteDetails?['systemType'] ?? '').toString().toUpperCase();
  num? number(String key) {
    final value = responses[key];
    return value is num ? value : num.tryParse(value?.toString() ?? '');
  }

  bool equals(String key, String expected) =>
      responses[key]?.toString().toUpperCase() == expected;

  final rules = <Map<String, dynamic>>[
    {
      'key': 'neVoltagePcuOutput',
      'rule': '< 7',
      'passed': (number('neVoltagePcuOutput') ?? 99) < 7,
    },
    {
      'key': 'neVoltageGridInput',
      'rule': '< 7',
      'passed': (number('neVoltageGridInput') ?? 99) < 7,
    },
    {
      'key': 'inverterOutputVoltage',
      'rule': '215 to 250',
      'passed': () {
        final v = number('inverterOutputVoltage');
        return v != null && v >= 215 && v <= 250;
      }(),
    },
    {
      'key': 'earthingElectrodeAvailable',
      'rule': 'YES',
      'passed': equals('earthingElectrodeAvailable', 'YES'),
    },
    {
      'key': 'earthingWireConnected',
      'rule': 'YES',
      'passed': equals('earthingWireConnected', 'YES'),
    },
    if (system.contains('DC'))
      {
        'key': 'solarSpdStatus',
        'rule': 'WORKING',
        'passed': equals('solarSpdStatus', 'WORKING'),
      },
    if (system.contains('AC'))
      {
        'key': 'gridSpdStatus',
        'rule': 'WORKING',
        'passed': equals('gridSpdStatus', 'WORKING'),
      },
  ];
  for (final rule in rules) {
    rule['reading'] = responses[rule['key']];
  }
  return {
    'allPassed': rules.every((r) => r['passed'] == true),
    'rules': rules,
  };
}
