import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/data/remote_client.dart';
import 'package:livelihood/model/activity_facility/activity_facility.dart';
import 'package:livelihood/model/activity_facility_workflow/activity_facility_workflow.dart';
import 'package:livelihood/model/bom/bom.dart';
import 'package:livelihood/model/mdms/asset_registry_response.dart';
import 'package:livelihood/model/solar_installation_draft.dart';
import 'package:livelihood/repositories/asset_mdms_repository.dart';
import 'package:livelihood/repositories/associated_machine_bom_repository.dart';
import 'package:livelihood/utils/envConfig.dart';
import 'package:livelihood/utils/submission_payload.dart';

void main() {
  setUpAll(() async => envConfig.initialize());
  const source = ActivityFacility(
      id: 'solar',
      fieldPlanId: 'plan',
      facilityId: 'ED/2026/0101',
      activityId: 'installation',
      solutionId: '202526PASF0000141',
      componentType: 'SOLAR');
  ActivityFacility sibling(String id, int sequence) => source.copyWith(
      id: id, componentType: 'MACHINE', componentSequence: sequence);
  SolarInstallationDraft draft() => SolarInstallationDraft(
      workflow: const ActivityFacilityWorkflow(activityFacility: source),
      mode: SolarWorkflowMode.newReport);
  final fields = [
    'machine_1_product',
    'machine_1_make',
    'machine_1_capacity',
    'machine_1_quantity',
    'machine_2_product'
  ];
  AssetMdmsRepository mdms() => AssetMdmsRepository(
          initial: AssetRegistryMdmsResponse(
              livelihood: LivelihoodModule(
        solutionBomForms: [
          {
            'solutionCode': source.solutionId,
            'active': true,
            'bomForms': [
              {'name': 'LIVELIHOOD_202526PASF0000141_BOM_machines'}
            ]
          }
        ],
        bomFormSchema: [
          {
            'name': 'AssetForm.LIVELIHOOD_202526PASF0000141_BOM_machines',
            'pages': [
              {
                'page': 'machines',
                'properties': [
                  for (final field in fields)
                    {'fieldName': field, 'type': 'string'}
                ]
              }
            ]
          }
        ],
      )));
  BillOfMaterial bom(String id, Map<String, dynamic> data) => BillOfMaterial(
      id: 'bom-$id',
      activityFacilityId: id,
      solutionId: source.solutionId,
      isActive: true,
      additionalDetails: const {'componentType': 'MACHINE'},
      data: data);

  test('field-plan ID survives API parsing and cache serialization', () {
    final parsed = ActivityFacility.fromJson(source.toJson());
    expect(parsed.fieldPlanId, 'plan');
    expect(
        parsed.copyWith(fieldPlanId: 'other').toJson()['fieldPlanId'], 'other');
  });

  test('loads the supplied example without contaminating solar submission',
      () async {
    final current = draft();
    Map<String, dynamic>? cached;
    final repo = AssociatedMachineBomRepository(
        mdms: mdms(),
        siblings: (_) async => [sibling('machine', 1)],
        boms: (id) async => [
              bom(id, {
                'machine_1_product': 'Silk Spinning-7-W-DC-0.25-kgs/hr',
                'machine_1_make': '',
                'machine_1_capacity': '1',
                'machine_1_quantity': 1,
                'report_number': 'IC/2026/0124'
              })
            ],
        readCache: (_) async => null,
        writeCache: (_, values) async {
          cached = values;
        });
    await repo.load(current);
    expect(current.associatedMachinesAvailable, true);
    expect(current.associatedMachineValues['machine_1_product'],
        'Silk Spinning-7-W-DC-0.25-kgs/hr');
    expect(current.associatedMachineValues['machine_1_make'], '');
    expect(current.associatedMachineValues['machine_1_quantity'], 1);
    expect(current.associatedMachineValues.containsKey('report_number'), false);
    expect(cached, current.associatedMachineValues);
    expect(current.mergedBom.keys.any(fields.contains), false);
    final payload = buildSolarSubmissionPayload(current);
    expect((payload['bom']['data'] as Map).keys.any(fields.contains), false);
  });
  test(
      'filters other plans and solutions; sequence determines duplicate winners',
      () async {
    final current = draft();
    final fetched = <String>[];
    final repo = AssociatedMachineBomRepository(
        mdms: mdms(),
        siblings: (_) async => [
              sibling('second', 2),
              sibling('wrong-plan', 1).copyWith(fieldPlanId: 'other'),
              sibling('wrong-solution', 1).copyWith(solutionId: 'other'),
              sibling('first', 1)
            ],
        boms: (id) async {
          fetched.add(id);
          return [
            bom(id, {
              'machine_1_product': id,
              if (id == 'second') 'machine_2_product': 'second-machine'
            })
          ];
        },
        readCache: (_) async => null,
        writeCache: (_, __) async {});
    await repo.load(current);
    expect(fetched, ['first', 'second']);
    expect(current.associatedMachineValues,
        {'machine_1_product': 'first', 'machine_2_product': 'second-machine'});
  });
  test(
      'failed network retains cached values; successful empty search clears cache',
      () async {
    final current = draft();
    var fail = true;
    Map<String, dynamic> cache = {'machine_1_product': 'cached'};
    final repo = AssociatedMachineBomRepository(
        mdms: mdms(),
        siblings: (_) async {
          if (fail) throw StateError('offline');
          return [];
        },
        boms: (_) async => [],
        readCache: (_) async => cache,
        writeCache: (_, values) async {
          cache = values;
        });
    await repo.load(current);
    expect(current.associatedMachinesFailed, true);
    expect(current.associatedMachineValues['machine_1_product'], 'cached');
    fail = false;
    await repo.load(current);
    expect(current.associatedMachinesFailed, false);
    expect(current.associatedMachineValues, isEmpty);
    expect(cache, isEmpty);
  });
  test('missing context never searches; concurrent loads share the request',
      () async {
    var calls = 0;
    final gate = Completer<List<ActivityFacility>>();
    final repo = AssociatedMachineBomRepository(
        mdms: mdms(),
        siblings: (_) {
          calls++;
          return gate.future;
        },
        boms: (_) async => [],
        readCache: (_) async => null,
        writeCache: (_, __) async {});
    final missing = SolarInstallationDraft(
        workflow: ActivityFacilityWorkflow(
            activityFacility: source.copyWith(fieldPlanId: null)),
        mode: SolarWorkflowMode.newReport);
    await repo.load(missing);
    expect(calls, 0);
    expect(missing.associatedMachinesAvailable, false);
    final current = draft();
    final first = repo.load(current);
    final second = repo.load(current);
    await Future<void>.delayed(Duration.zero);
    expect(calls, 1);
    gate.complete([]);
    await Future.wait([first, second]);
    expect(current.associatedMachinesLoading, null);
  });
  test('activity search uses scoped filters and retrieves subsequent pages',
      () async {
    final dio = DioClient().dio;
    final original = dio.interceptors.toList();
    final requests = <RequestOptions>[];
    dio.interceptors.clear();
    dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
      requests.add(options);
      final offset = options.queryParameters['offset'] as int;
      handler.resolve(Response(requestOptions: options, statusCode: 200, data: {
        'totalCount': 2,
        'facility': [
          {'activityFacility': sibling('machine-$offset', offset + 1).toJson()}
        ]
      }));
    }));
    addTearDown(() {
      dio.interceptors
        ..clear()
        ..addAll(original);
    });
    final results = await AssociatedMachineBomRepository.searchSiblings(source);
    expect(results, hasLength(2));
    expect(
        requests.map((request) => request.queryParameters['offset']), [0, 1]);
    final criteria = requests.first.data['ActivityFacility'] as Map;
    expect(criteria['facilityIds'], ['ED/2026/0101']);
    expect(criteria['fieldPlanIds'], ['plan']);
    expect(criteria['activityIds'], ['installation']);
    expect(criteria['componentTypes'], ['MACHINE']);
    expect(criteria.containsKey('statuses'), false);
    expect(criteria.containsKey('assignedToMe'), false);
  });
}
