import 'package:digit_forms_engine/models/schema_object/schema_object.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/blocs/activity_facility/activity_facility.dart';
import 'package:livelihood/model/activity_facility/activity_facility.dart';
import 'package:livelihood/model/activity_facility_workflow/activity_facility_workflow.dart';
import 'package:livelihood/model/asset_count/asset_count.dart';
import 'package:livelihood/model/asset_type/asset_type.dart';
import 'package:livelihood/model/brand/brand.dart';
import 'package:livelihood/model/facility_report.dart';
import 'package:livelihood/model/mdms/asset_registry_response.dart';
import 'package:livelihood/model/mdms/common_masters.dart';
import 'package:livelihood/model/warranty/warranty.dart';
import 'package:livelihood/repositories/activity_facility_repo.dart';
import 'package:livelihood/repositories/asset_mdms_repository.dart';
import 'package:livelihood/utils/envConfig.dart';
import 'package:livelihood/utils/dynamic_form_schema.dart';

void main() {
  setUpAll(() async => envConfig.initialize());

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
