import 'dart:async';

import 'package:digit_forms_engine/models/schema_object/schema_object.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/blocs/activity_facility/activity_facility.dart';
import 'package:livelihood/blocs/asset_submission/asset_submission.dart';
import 'package:livelihood/model/activity_facility/activity_facility.dart';
import 'package:livelihood/model/activity_facility_workflow/activity_facility_workflow.dart';
import 'package:livelihood/model/asset_count/asset_count.dart';
import 'package:livelihood/model/asset_type/asset_type.dart';
import 'package:livelihood/model/asset/asset_submission.dart';
import 'package:livelihood/model/brand/brand.dart';
import 'package:livelihood/model/bom/bom.dart';
import 'package:livelihood/model/document/submission_document.dart';
import 'package:livelihood/model/facility_report.dart';
import 'package:livelihood/model/mdms/asset_registry_response.dart';
import 'package:livelihood/model/mdms/common_masters.dart';
import 'package:livelihood/model/warranty/warranty.dart';
import 'package:livelihood/model/solar_installation_draft.dart';
import 'package:livelihood/repositories/activity_facility_repo.dart';
import 'package:livelihood/repositories/activity_facility_mock_overlay.dart';
import 'package:livelihood/repositories/asset_mdms_repository.dart';
import 'package:livelihood/repositories/bom_repository.dart';
import 'package:livelihood/repositories/operation_progress_repo.dart';
import 'package:livelihood/utils/envConfig.dart';
import 'package:livelihood/utils/dynamic_form_schema.dart';
import 'package:livelihood/utils/operation_progress.dart';
import 'package:livelihood/utils/submission_payload.dart';
import 'package:livelihood/utils/warranty.dart';

void main() {
  setUpAll(() async => envConfig.initialize());

  test('temporary Solar component payload is merged before deserialization',
      () async {
    final overlay = ActivityFacilityMockOverlay(
      readAsset: (_) async => '''
        {
          "battery": {"brandName": "NED", "capacity": "125"},
          "inverter": {"brandName": "Eternity", "capacity": "1"},
          "panel": {"brandName": "ReNew", "capacity": "330"}
        }
      ''',
    );
    final enriched = await overlay.apply({
      'activityFacility': {
        'id': 'solar-1',
        'additionalDetails': {
          'componentType': 'SOLAR',
          'battery': {'capacity': '150'},
        },
      },
    });
    final workflow = ActivityFacilityWorkflow.fromJson(enriched);

    expect(workflow.activityFacility.additionalDetails?.battery,
        {'brandName': 'NED', 'capacity': '150'});
    expect(workflow.activityFacility.additionalDetails?.inverter?['capacity'],
        '1');
    expect(
        workflow.activityFacility.additionalDetails?.panel?['capacity'], '330');
  });

  test('temporary Solar component payload is a no-op for Machine or no file',
      () async {
    final machine = {
      'activityFacility': {
        'id': 'machine-1',
        'additionalDetails': {'componentType': ' MACHINE '},
      },
    };
    final overlay = ActivityFacilityMockOverlay(
      readAsset: (_) async => '{"battery":{"capacity":"125"}}',
    );
    expect(await overlay.apply(machine), same(machine));

    final missing = ActivityFacilityMockOverlay(
      readAsset: (_) => Future<String>.error(Exception('missing')),
    );
    final solar = {
      'activityFacility': {
        'id': 'solar-1',
        'additionalDetails': {'componentType': 'SOLAR'},
      },
    };
    expect(await missing.apply(solar), same(solar));
  });

  test('asset counts stay zero until activated and never fall below minimum',
      () {
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(id: 'count-1'),
    );
    final draft = SolarInstallationDraft(
      workflow: workflow,
      mode: SolarWorkflowMode.newReport,
    )
      ..applicableTypes = const [SolarAssetType.battery]
      ..minimumCounts[SolarAssetType.battery] = 2
      ..maximumCounts[SolarAssetType.battery] = 4;

    expect(draft.countFor(SolarAssetType.battery), 0);
    expect(draft.allCountsEntered, isFalse);
    draft.setCount(SolarAssetType.battery, 1);
    expect(draft.countFor(SolarAssetType.battery), 2);
    expect(draft.assets[SolarAssetType.battery]!.assets, hasLength(2));
    draft.setCount(SolarAssetType.battery, 0);
    expect(draft.countFor(SolarAssetType.battery), 2);
    expect(draft.assets[SolarAssetType.battery]!.assets, hasLength(2));
    draft.setCount(SolarAssetType.battery, 10);
    expect(draft.countFor(SolarAssetType.battery), 4);
  });

  test('asset entry reconciliation pads, trims, and preserves cached values',
      () {
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(id: 'reconcile-1'),
    );
    final draft = SolarInstallationDraft(
      workflow: workflow,
      mode: SolarWorkflowMode.newReport,
    )..setCount(SolarAssetType.inverter, 3);
    const preservedPhoto = SolarFileRef(
      name: 'inverter.jpg',
      path: '/tmp/inverter.jpg',
      kind: SolarFileKind.image,
    );
    draft.assets[SolarAssetType.inverter]!.assets
      ..clear()
      ..add(SolarAssetEntry(
        assetId: 'asset-1',
        serialNumber: 'INV-001',
        capacity: '1',
        supportingPhoto: preservedPhoto,
      ));

    draft.reconcileEntries(SolarAssetType.inverter);
    final entries = draft.assets[SolarAssetType.inverter]!.assets;
    expect(entries, hasLength(3));
    expect(entries.first.assetId, 'asset-1');
    expect(entries.first.serialNumber, 'INV-001');
    expect(entries.first.capacity, '1');
    expect(entries.first.supportingPhoto, same(preservedPhoto));

    draft.setCount(SolarAssetType.inverter, 2);
    expect(draft.assets[SolarAssetType.inverter]!.assets, hasLength(2));
    expect(
        draft.assets[SolarAssetType.inverter]!.assets.first.assetId, 'asset-1');
  });

  test('BOM masters parse v1 data and wrapped records', () {
    final schema = BomFormSchema.fromJson({
      'data': {
        'name': 'AssetForm.DC_BOM_system',
        'pages': [
          {
            'page': 'system',
            'label': 'System',
            'order': 1,
            'properties': [
              {
                'fieldName': 'weather',
                'label': 'Weather',
                'type': 'string',
                'format': 'dropdown',
                'includeInForm': true,
                'enums': [
                  {'code': 'CLEAR', 'name': 'Clear'}
                ],
                'validations': [
                  {'type': 'required', 'value': true}
                ],
              }
            ],
          }
        ],
      }
    });
    expect(schema.name, 'AssetForm.DC_BOM_system');
    expect(schema.pages.single.properties.single.requiredField, isTrue);
    expect(schema.pages.single.properties.single.enums.single.code, 'CLEAR');

    final mapping = SolutionDesignBomForms.fromJson({
      'uniqueIdentifier': 'DC',
      'data': {
        'bomForms': [
          {'name': 'DC_BOM_Solar'},
          {'name': 'DC_BOM_system'},
        ]
      }
    });
    expect(mapping.systemCode, 'DC');
    expect(mapping.forms, ['DC_BOM_Solar', 'DC_BOM_system']);

    final image = InstallationImageRequirement.fromJson({
      'code': '3',
      'description': 'Inverter front and back',
      'required_count': 2,
    });
    expect(image.requiredCount, 2);
  });

  test('documents use endpoint-specific filestore keys', () {
    final document = SubmissionDocument.fromJson({
      'documentType': 'PHOTO',
      'fileStoreId': 'filestore-1',
      'documentUid': 'document-1',
    });

    expect(document.fileStore, 'filestore-1');
    expect(document.toAssetJson()['fileStore'], 'filestore-1');
    expect(document.toAssetJson().containsKey('fileStoreId'), isFalse);
    expect(document.toWorkflowJson()['fileStoreId'], 'filestore-1');
    expect(document.toWorkflowJson()['status'], 'ACTIVE');
    expect(document.toWorkflowJson().containsKey('fileStore'), isFalse);
  });

  test('typed asset writes backend identifiers and asset-owned documents', () {
    final asset = AssetSubmission.fromCheckpoint({
      'system': 'DC',
      'assetTypeID': 'PANEL',
      'serialNumber': 'P-001',
      'modelNumber': 'SP330',
      'brandID': 'RENEW',
      'itemCode': 'SP-330WP',
      'name': 'Solar panel',
      'documents': [
        {'documentType': 'PHOTO', 'fileStoreId': 'fs-asset-photo'},
      ],
    });

    final json = asset.toRegistryJson(
      tenantId: 'livelihood',
      facilityId: 'facility-1',
      activityFacilityId: 'activity-facility-1',
      vendorId: 'vendor-1',
    );

    expect(json['activityFacilityID'], 'activity-facility-1');
    expect(json['itemCode'], 'SP-330WP');
    expect(json['isOperational'], isFalse);
    expect((json['documents'] as List).single, contains('fileStore'));
    expect((json['documents'] as List).single, isNot(contains('fileStoreId')));
  });

  test('required BOM keys reject blank and missing merged values', () {
    final missing = missingRequiredBomFields(
      {'panelCount': 4, 'serial': '  '},
      [
        {'fieldName': 'panelCount', 'label': 'Panel count'},
        {'fieldName': 'serial', 'label': 'Serial number'},
        {'fieldName': 'rating', 'label': 'System rating'},
      ],
    );

    expect(missing, ['Serial number', 'System rating']);
  });

  test('solar submission merges pages into one document-free BOM', () {
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'activity-facility-1',
        facilityId: 'facility-1',
        facility: Facility(
          facilityDetails: FacilityDetails(
            solutionDesignType: 'RMS_ACC_OFF_GRID_SINGLE_PHASE',
          ),
        ),
      ),
    );
    final draft = SolarInstallationDraft(
      workflow: workflow,
      mode: SolarWorkflowMode.newReport,
    )
      ..systemCode = 'DC'
      ..applicableTypes = const [SolarAssetType.panel]
      ..bomFormNames.addAll(['DC_BOM_Solar', 'DC_BOM_system'])
      ..mergedBom.addAll({'panelCount': 4, 'weather': 'CLEAR'});
    draft.assetTypeCodes[SolarAssetType.panel] = 'PANEL';
    draft.assets[SolarAssetType.panel]!
      ..selectedBrandCode = 'RENEW'
      ..warrantyDuration = '5 Years'
      ..assets.add(SolarAssetEntry(
        itemCode: 'SP-330WP',
        serialNumber: 'SERIAL-1',
        capacity: '330',
        supportingPhoto: const SolarFileRef(
          name: 'asset.jpg',
          path: 'asset-filestore',
          remoteId: 'asset-filestore',
          kind: SolarFileKind.image,
        ),
      ))
      ..images.add(const SolarFileRef(
        name: 'overview.jpg',
        path: 'workflow-filestore',
        remoteId: 'workflow-filestore',
        kind: SolarFileKind.image,
      ));

    final payload = buildSolarSubmissionPayload(draft);
    final bom = payload['bom'] as Map;
    final asset = (payload['assets'] as List).single as Map;
    final workflowDocument =
        (payload['workflowDocuments'] as List).single as Map;

    expect(payload.containsKey('boms'), isFalse);
    expect(bom['name'], 'RMS_ACC_OFF_GRID_SINGLE_PHASE');
    expect(bom['data'], {'panelCount': 4, 'weather': 'CLEAR'});
    expect(bom.containsKey('documents'), isFalse);
    expect((asset['documents'] as List).single['fileStore'], 'asset-filestore');
    expect(asset['itemCode'], 'SP-330WP');
    expect(workflowDocument['fileStore'], 'workflow-filestore');
  });

  test('Battery Type is submitted only through canonical batteryType', () {
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'activity-facility-1',
        facilityId: 'facility-1',
      ),
    );
    final draft = SolarInstallationDraft(
      workflow: workflow,
      mode: SolarWorkflowMode.newReport,
    )
      ..systemCode = 'DC'
      ..applicableTypes = const [SolarAssetType.battery];
    draft.assetTypeCodes[SolarAssetType.battery] = 'BATTERY';
    draft.assets[SolarAssetType.battery]!
      ..selectedBrandCode = 'NED'
      ..warrantyDuration = '5 Years'
      ..assets.add(SolarAssetEntry(
        itemCode: 'BAT-125',
        serialNumber: 'BATTERY-1',
        capacity: '125',
        batteryType: 'LITHIUM_ION',
        fields: const {
          'type': 'LEGACY_TYPE',
          'battery_type': 'LEGACY_SNAKE_CASE',
        },
        supportingPhoto: const SolarFileRef(
          name: 'battery.jpg',
          path: 'asset-filestore',
          remoteId: 'asset-filestore',
          kind: SolarFileKind.image,
        ),
      ));

    final payload = buildSolarSubmissionPayload(draft);
    final asset = (payload['assets'] as List).single as Map;
    final details = asset['assetDetails'] as Map;
    expect(details['batteryType'], 'LITHIUM_ION');
    expect(details, isNot(contains('type')));
    expect(details, isNot(contains('battery_type')));
  });

  test('BOM matching never selects Machine or split-page rows for Solar', () {
    final repository = BomRepository();
    final result = repository.matchingForSubmission(
      records: const [
        BillOfMaterial(
          id: 'machine',
          name: 'Machine',
          additionalDetails: {'componentType': 'MACHINE'},
        ),
        BillOfMaterial(
          id: 'split',
          name: 'DC_BOM_Solar',
          additionalDetails: {'componentType': 'SOLAR'},
        ),
        BillOfMaterial(
          id: 'solar',
          name: 'RMS_ACC_OFF_GRID_SINGLE_PHASE',
          additionalDetails: {'componentType': 'SOLAR'},
        ),
      ],
      componentType: 'SOLAR',
      name: 'RMS_ACC_OFF_GRID_SINGLE_PHASE',
    );

    expect(result?.id, 'solar');
  });

  test('asset MDMS selectors join records by stable asset type code', () {
    const response = AssetRegistryMdmsResponse(
      commonMasters: CommonMastersModule(
        bomFormSchema: [
          {
            'isActive': true,
            'data': {'name': 'AssetForm.System', 'pages': []},
          },
          {
            'isActive': false,
            'data': {'name': 'AssetForm.Inactive', 'pages': []},
          },
        ],
      ),
      assetRegistry: AssetRegistryModule(
        assetCountSchema: [
          AssetCountData(
            id: 1,
            assetCount: [
              AssetCount(max: 8, min: 2, active: true, assetTypeCode: 'PANEL')
            ],
          )
        ],
        assetTypeSchema: [
          AssetTypeData(
            id: 1,
            assetType: [
              AssetType(
                code: 'PANEL',
                name: 'Panel',
                active: true,
                formFields: [
                  AssetTypeFormField(
                    key: 'capacity',
                    system: 'DC',
                    options: ['550'],
                  )
                ],
              )
            ],
          )
        ],
        brandSchema: [
          BrandData(
            id: 1,
            brand: [
              Brand(
                active: true,
                code: 'W',
                name: 'Waaree',
                assetTypeCode: 'PANEL',
              )
            ],
          )
        ],
        warrantyDurationSchema: [
          WarrantyData(
            id: 1,
            warrantyDuration: [
              Warranty(
                active: true,
                duration: '5',
                format: 'Years',
                assetTypeCode: 'PANEL',
              )
            ],
          )
        ],
      ),
    );
    final repository = AssetMdmsRepository(initial: response);
    expect(repository.assetTypes(systemCode: 'DC').single.code, 'PANEL');
    expect(repository.countFor('PANEL')?.min, 2);
    expect(repository.brandsFor('PANEL').single.code, 'W');
    expect(repository.warrantiesFor('PANEL').single.duration, '5');
    expect(repository.rawBomSchemaFor('System'), isNotNull);
    expect(repository.rawBomSchemaFor('Inactive'), isNull);
  });

  test('installation images follow E4H system filtering and ordering', () {
    const response = AssetRegistryMdmsResponse(
      commonMasters: CommonMastersModule(
        installationImages: [
          {
            'isActive': true,
            'data': {
              'InstallationImage': [
                {
                  'code': 'LATER',
                  'active': true,
                  'description': 'Later DC image',
                  'short_title': 'Later',
                  'required_count': 2,
                  'system_types': [
                    {'code': 'DC', 'order': 2},
                    {'code': 'AC', 'order': 1},
                  ],
                },
                {
                  'code': 'FIRST',
                  'active': true,
                  'description': 'First DC image',
                  'required_count': 1,
                  'system_types': [
                    {'code': ' dc ', 'order': 1},
                  ],
                },
                {
                  'code': 'INACTIVE_ITEM',
                  'active': false,
                  'description': 'Inactive',
                  'required_count': 1,
                  'system_types': [
                    {'code': 'DC', 'order': 0},
                  ],
                },
              ],
            },
          },
          {
            'isActive': false,
            'data': {
              'InstallationImage': [
                {
                  'code': 'INACTIVE_DOCUMENT',
                  'active': true,
                  'description': 'Inactive document',
                  'required_count': 1,
                  'system_types': [
                    {'code': 'DC', 'order': 0},
                  ],
                },
              ],
            },
          },
          {
            'code': 'DIRECT_AC',
            'active': true,
            'description': 'Direct AC record',
            'required_count': 1,
            'system_types': [
              {'code': 'AC', 'order': 2},
            ],
          },
        ],
      ),
    );
    final repository = AssetMdmsRepository(initial: response);

    final dc = repository.installationImagesFor(' DC ');
    expect(dc.map((item) => item.code), ['FIRST', 'LATER']);
    expect(dc.last.allowMultiples, isTrue);
    expect(dc.last.requiredLabel, 'Required: 2 images');
    expect(dc.first.orderLabel('dc'), '1');

    final ac = repository.installationImagesFor('ac');
    expect(ac.map((item) => item.code), ['LATER', 'DIRECT_AC']);
  });

  test('required BOM form keys are selected independently by system code', () {
    const response = AssetRegistryMdmsResponse(
      commonMasters: CommonMastersModule(
        requiredBomFormKeys: [
          {
            'isActive': true,
            'data': {
              'systemCode': 'DC',
              'active': true,
              'dialogTitle': 'Required details',
              'rules': [
                {
                  'schemaName': 'AssetForm.System',
                  'fieldName': 'capacity',
                  'label': 'Capacity',
                  'message': 'Enter capacity',
                  'active': true,
                },
              ],
            },
          },
        ],
      ),
    );
    final repository = AssetMdmsRepository(initial: response);

    final config = repository.requiredBomFormKeysFor(' dc ');
    expect(config?.dialogTitle, 'Required details');
    expect(config?.rules.single.fieldName, 'capacity');
    expect(repository.installationImagesFor('DC'), isEmpty);
  });

  test('activity component type alone selects machine or solar', () {
    ActivityFacilityWorkflow workflowFor(String? componentType) =>
        ActivityFacilityWorkflow(
          activityFacility: ActivityFacility(
            additionalDetails: ActivityFacilityAdditionalDetails(
              componentType: componentType,
              assetType: 'MACHINE',
              bom: const {'assetType': 'MACHINE'},
            ),
          ),
        );

    expect(
      workflowFor('  machine ').resolvedAssetCategory,
      FacilityAssetCategory.machine,
    );
    expect(
      workflowFor('SOLAR').resolvedAssetCategory,
      FacilityAssetCategory.solar,
    );
    expect(
      workflowFor(null).resolvedAssetCategory,
      FacilityAssetCategory.solar,
    );
    expect(
      workflowFor('OTHER').resolvedAssetCategory,
      FacilityAssetCategory.solar,
    );
  });

  test('activity facility retains the E4H nested solution design fields', () {
    final activity = ActivityFacility.fromJson({
      'id': 'facility-activity-1',
      'facility': {
        'facility_name': 'Health centre',
        'facilityDetails': {
          'solar_solution_design_type': 'RMS_ACC_OFF_GRID_SINGLE_PHASE',
          'systemType': 'DC',
        },
      },
    });

    expect(activity.facility?.facilityDetails?.solutionDesignType,
        'RMS_ACC_OFF_GRID_SINGLE_PHASE');
    expect(activity.facility?.facilityDetails?.systemType, 'DC');
  });

  test('BOM schema transformer preserves E4H form-engine metadata', () {
    final transformed = transformBomMdmsRecordToSchema({
      'name': 'AssetForm.System',
      'version': 2,
      'pages': {
        'details': {
          'label': 'System details',
          'order': 1,
          'description': 'Configured by MDMS',
          'properties': {
            'systemType': {
              'label': 'System type',
              'type': 'string',
              'format': 'dropdown',
              'order': 2,
              'readOnly': true,
              'includeInForm': true,
              'includeInSummary': true,
              'isMultiSelect': false,
              'enums': [
                {'code': 'DC', 'name': 'DC'}
              ],
              'validations': [
                {'type': 'required', 'value': true}
              ],
              'visibilityCondition': {'expression': 'true'},
              'conditions': {'source': 'system'},
            },
          },
        },
      },
    });

    expect(transformed['name'], 'AssetForm.System');
    expect(transformed['version'], 2);
    final page = (transformed['pages'] as Map)['details'] as Map;
    expect(page['type'], 'object');
    expect(page['description'], 'Configured by MDMS');
    final field = (page['properties'] as Map)['systemType'] as Map;
    expect(field['fieldName'], 'systemType');
    expect(field['readOnly'], isTrue);
    expect(field['includeInSummary'], isTrue);
    expect(field['validations'], isNotEmpty);
    expect(field['visibilityCondition'], {'expression': 'true'});
    expect(field['conditions'], {'source': 'system'});
    final schema = SchemaObject.fromJson(transformed);
    expect(
      schema.pages.values.single.properties?.values.single.label,
      'System type',
    );
  });

  test('clearing search requests the unfiltered first page again', () async {
    final repository = _RecordingActivityRepository();
    final bloc = ActivityFacilityBloc(repository: repository);

    Future<void> waitForLoaded() => bloc.stream.firstWhere(
          (state) => state.maybeWhen(
            paginatedLoaded: (_, __, ___, ____, _____) => true,
            orElse: () => false,
          ),
        );

    bloc.add(const ActivityFacilityEvent.fetchActivityFacilityByWorkflow(
      workflowStatuses: ['ASSIGNED'],
    ));
    await waitForLoaded();
    bloc.add(const ActivityFacilityEvent.fetchActivityFacilityBySearch(
      query: 'solar',
      workflowStatuses: ['ASSIGNED'],
    ));
    await waitForLoaded();
    bloc.add(const ActivityFacilityEvent.clearSearch(
      workflowStatuses: ['ASSIGNED'],
    ));
    await waitForLoaded();

    expect(repository.queries, [null, 'solar', null]);
    expect(repository.offsets, [0, 0, 0]);
    await bloc.close();
  });

  test('AssetSubmissionBloc mirrors job progress: queued -> running -> success',
      () async {
    final progressRepo = _StubOperationProgressRepository();
    final bloc = AssetSubmissionBloc(progressRepository: progressRepo);
    const activityFacilityId = 'activity-facility-submit-1';

    final states = <AssetSubmissionState>[];
    final sub = bloc.stream.listen(states.add);

    bloc.add(const WatchSubmission(activityFacilityId));
    await pumpEventQueue();

    await progressRepo.upsertJob(
      activityFacilityId: activityFacilityId,
      status: OperationStatuses.queued,
      stageKey: submitStages.first.key,
      completedSteps: 0,
      totalSteps: submitStages.length,
    );
    await pumpEventQueue();

    await progressRepo.upsertJob(
      activityFacilityId: activityFacilityId,
      status: OperationStatuses.running,
      stageKey: 'submitting_bom',
      completedSteps: 3,
      totalSteps: submitStages.length,
    );
    await pumpEventQueue();

    await progressRepo.upsertJob(
      activityFacilityId: activityFacilityId,
      status: OperationStatuses.success,
      stageKey: 'submission_successful',
      completedSteps: submitStages.length,
      totalSteps: submitStages.length,
    );
    await pumpEventQueue();

    expect(states, [
      isA<AssetSubmissionInProgress>()
          .having((s) => s.progress.status, 'status', OperationStatuses.queued),
      isA<AssetSubmissionInProgress>().having(
          (s) => s.progress.status, 'status', OperationStatuses.running),
      isA<AssetSubmissionSuccess>(),
    ]);

    await sub.cancel();
    await bloc.close();
  });

  test('AssetSubmissionBloc surfaces a failed stage as a failure state',
      () async {
    final progressRepo = _StubOperationProgressRepository();
    final bloc = AssetSubmissionBloc(progressRepository: progressRepo);
    const activityFacilityId = 'activity-facility-submit-2';

    final states = <AssetSubmissionState>[];
    final sub = bloc.stream.listen(states.add);

    bloc.add(const WatchSubmission(activityFacilityId));
    await pumpEventQueue();

    await progressRepo.upsertJob(
      activityFacilityId: activityFacilityId,
      status: OperationStatuses.running,
      stageKey: 'resolving_vendor_org',
      completedSteps: 1,
      totalSteps: submitStages.length,
    );
    await pumpEventQueue();

    await progressRepo.upsertJob(
      activityFacilityId: activityFacilityId,
      status: OperationStatuses.failed,
      stageKey: 'resolving_vendor_org',
      completedSteps: 1,
      totalSteps: submitStages.length,
      lastError: 'You are not authorized to access this resource',
    );
    await pumpEventQueue();

    expect(states.last, isA<AssetSubmissionFailure>());
    final failure = states.last as AssetSubmissionFailure;
    expect(failure.progress.canRetry, isTrue);
    expect(failure.progress.errorMessage,
        'You are not authorized to access this resource');

    await sub.cancel();
    await bloc.close();
  });

  test('parseWarrantyYears extracts the leading digit count', () {
    expect(parseWarrantyYears('2 Years'), 2);
    expect(parseWarrantyYears('10 Years'), 10);
    expect(parseWarrantyYears('No warranty'), 0);
  });
}

/// In-memory stand-in for [OperationProgressRepository] — writes are
/// immediately visible to [watchJob], mirroring how the real
/// Isar-backed implementation's reactive query behaves.
class _StubOperationProgressRepository implements OperationProgressRepository {
  final _controller = StreamController<OperationProgressModel?>.broadcast();
  OperationProgressModel? _current;

  @override
  Future<void> upsertJob({
    required String activityFacilityId,
    required String status,
    required String stageKey,
    required int completedSteps,
    required int totalSteps,
    int retryCount = 0,
    String? lastError,
  }) async {
    _current = OperationProgressModel(
      activityFacilityId: activityFacilityId,
      operationType: OperationTypes.submit,
      status: status,
      stageKey: stageKey,
      stageLabel: stageForKey(stageKey).label,
      completedSteps: completedSteps,
      totalSteps: totalSteps,
      progressPercent: progressPercent(
        completedSteps: completedSteps,
        totalSteps: totalSteps,
      ),
      retryCount: retryCount,
      errorMessage: lastError,
    );
    _controller.add(_current);
  }

  @override
  Future<OperationProgressModel?> readJob(String activityFacilityId) async =>
      _current;

  @override
  Stream<OperationProgressModel?> watchJob(String activityFacilityId) async* {
    yield _current;
    yield* _controller.stream;
  }

  @override
  Future<void> clearJob(String activityFacilityId) async {
    _current = null;
  }
}

class _RecordingActivityRepository extends ActivityFacilityRepository {
  final List<String?> queries = [];
  final List<int> offsets = [];

  @override
  Future<PaginatedActivityFacilities> fetchByWorkflowPaginated({
    required ActivityFacilitySearchModel body,
    required List<String> workflowStatuses,
    required int limit,
    required int offset,
    required String sortDirection,
  }) async {
    queries.add(body.facilityName);
    offsets.add(offset);
    return const PaginatedActivityFacilities(
      items: [
        ActivityFacilityWorkflow(
          activityFacility: ActivityFacility(id: 'one'),
        )
      ],
      totalCount: 1,
    );
  }
}
