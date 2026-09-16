import 'dart:async';

import 'package:dio/dio.dart';
import 'package:digit_forms_engine/models/schema_object/schema_object.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:livelihood/blocs/activity_facility/activity_facility.dart';
import 'package:livelihood/blocs/asset_submission/asset_submission.dart';
import 'package:livelihood/data/api_interceptors.dart';
import 'package:livelihood/model/activity_facility/activity_facility.dart';
import 'package:livelihood/model/activity_facility_workflow/activity_facility_workflow.dart';
import 'package:livelihood/model/asset_type/asset_type.dart';
import 'package:livelihood/model/asset/asset_submission.dart';
import 'package:livelihood/model/bom/bom.dart';
import 'package:livelihood/model/document/submission_document.dart';
import 'package:livelihood/model/facility_report.dart';
import 'package:livelihood/model/item_code/item_code.dart';
import 'package:livelihood/model/mdms/asset_registry_response.dart';
import 'package:livelihood/model/mdms/common_masters.dart';
import 'package:livelihood/model/warranty/warranty.dart';
import 'package:livelihood/model/solar_installation_draft.dart';
import 'package:livelihood/repositories/activity_facility_repo.dart';
import 'package:livelihood/repositories/asset_mdms_repository.dart';
import 'package:livelihood/repositories/bom_repository.dart';
import 'package:livelihood/repositories/installation_draft_repository.dart';
import 'package:livelihood/repositories/operation_progress_repo.dart';
import 'package:livelihood/repositories/pending_submission_repository.dart';
import 'package:livelihood/utils/envConfig.dart';
import 'package:livelihood/utils/api_paths.dart';
import 'package:livelihood/utils/dynamic_form_schema.dart';
import 'package:livelihood/utils/operation_progress.dart';
import 'package:livelihood/utils/submission_payload.dart';
import 'package:livelihood/utils/document_metadata.dart';
import 'package:livelihood/utils/warranty.dart';

class _TestErrorInterceptorHandler extends ErrorInterceptorHandler {
  Future<void> consumeForwardedError() async {
    try {
      await future;
    } catch (_) {
      // `next` forwards Dio's error as designed; logging tests only need to
      // consume it so it does not become an unhandled asynchronous error.
    }
  }
}

void main() {
  setUpAll(() async => envConfig.initialize());

  setUp(() => pendingSubmissionRepository.clearForTests());

  test('successful OTP generate and resend responses expose the DEV OTP log',
      () {
    final lines = <String>[];
    final interceptor = LoggingInterceptor(
      otpResponseLoggingEnabled: () => true,
      logSink: lines.add,
    );

    for (final path in [ApiPaths.otpGenerate, ApiPaths.otpResend]) {
      lines.clear();
      final request = RequestOptions(
        baseUrl: 'https://dev.example.org/',
        path: path,
        method: 'POST',
      );
      interceptor.onResponse(
        Response(
          requestOptions: request,
          statusCode: 200,
          data: const {
            'otp': {'otp': '123456'}
          },
        ),
        ResponseInterceptorHandler(),
      );

      final log = lines.join('\n');
      expect(log, contains('HTTP OTP RESPONSE'));
      expect(log, contains('POST ${request.uri}'));
      expect(log, contains('Status: 200'));
      expect(log, contains('123456'));
    }
  });

  test('successful response logging excludes validation and unrelated calls',
      () {
    final lines = <String>[];
    final interceptor = LoggingInterceptor(
      otpResponseLoggingEnabled: () => true,
      logSink: lines.add,
    );

    for (final path in [
      ApiPaths.otpValidate,
      ApiPaths.activitySearch,
      '${ApiPaths.otpGenerate}/unexpected',
    ]) {
      interceptor.onResponse(
        Response(
          requestOptions: RequestOptions(path: path, method: 'POST'),
          statusCode: 200,
          data: const {
            'otp': {'otp': 'must-not-be-logged'}
          },
        ),
        ResponseInterceptorHandler(),
      );
    }

    expect(lines, isEmpty);
  });

  test('OTP response logging requires both a debug build and DEV environment',
      () {
    expect(
      LoggingInterceptor.allowsOtpResponseLogging(
        isDebugBuild: true,
        environment: EnvType.dev,
      ),
      isTrue,
    );
    expect(
      LoggingInterceptor.allowsOtpResponseLogging(
        isDebugBuild: false,
        environment: EnvType.dev,
      ),
      isFalse,
    );
    for (final environment in [EnvType.qa, EnvType.uat, EnvType.prod]) {
      expect(
        LoggingInterceptor.allowsOtpResponseLogging(
          isDebugBuild: true,
          environment: environment,
        ),
        isFalse,
      );
    }
  });

  test('submission failure stages map to safe user-facing localization keys',
      () {
    expect(
      failureMessageKeyForStage('preparing_submission'),
      'SYNC_LOADING_FAILURE_PREPARATION',
    );
    expect(
      failureMessageKeyForStage('resolving_vendor_org'),
      'SYNC_LOADING_FAILURE_PREPARATION',
    );
    expect(
      failureMessageKeyForStage('uploading_media'),
      'SYNC_LOADING_FAILURE_MEDIA',
    );
    expect(
      failureMessageKeyForStage('submitting_bom'),
      'SYNC_LOADING_FAILURE_BOM',
    );
    expect(
      failureMessageKeyForStage('submitting_assets'),
      'SYNC_LOADING_FAILURE_ASSETS',
    );
    expect(
      failureMessageKeyForStage('verifying_assets'),
      'SYNC_LOADING_FAILURE_ASSET_VERIFICATION',
    );
    expect(
      failureMessageKeyForStage('finalizing_workflow_submission'),
      'SYNC_LOADING_FAILURE_WORKFLOW',
    );
    expect(
      failureMessageKeyForStage('cleaning_up_local_cache'),
      'SYNC_LOADING_FAILURE_CLEANUP',
    );
    expect(
      failureMessageKeyForStage('unexpected_stage'),
      'SYNC_LOADING_FAILURE_GENERIC',
    );
  });

  test('HTTP error diagnostics redact response auth tokens', () async {
    final lines = <String>[];
    final interceptor = LoggingInterceptor(logSink: lines.add);
    final request = RequestOptions(
      baseUrl: 'https://dev.example.org/',
      path: ApiPaths.workflowUpdate,
      method: 'POST',
    );
    final response = Response(
      requestOptions: request,
      statusCode: 400,
      data: const {
        'ResponseInfo': {'authToken': 'secret-response-token'},
        'message': 'error while publishing to kafka',
      },
    );

    final handler = _TestErrorInterceptorHandler();
    interceptor.onError(
      DioException(
        requestOptions: request,
        response: response,
        type: DioExceptionType.badResponse,
      ),
      handler,
    );
    await handler.consumeForwardedError();

    final log = lines.join('\n');
    expect(log, contains('error while publishing to kafka'));
    expect(log, contains('"authToken": "***"'));
    expect(log, isNot(contains('secret-response-token')));
  });

  test('pending submission lifecycle persists OTP approval without OTP data',
      () async {
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'pending-lifecycle-1',
        facilityId: 'facility-1',
        componentType: 'MACHINE',
        facility: Facility(facilityName: 'Machine facility'),
      ),
    );

    await pendingSubmissionRepository.markOtpRequested(workflow);
    var record = await pendingSubmissionRepository.read('pending-lifecycle-1');
    expect(record?.state, PendingSubmissionState.pendingOtpApproval);
    expect(record?.otpRequested, isTrue);
    expect(record?.otpVerified, isFalse);

    await pendingSubmissionRepository.markOtpVerified(workflow);
    record = await pendingSubmissionRepository.read('pending-lifecycle-1');
    expect(record?.state, PendingSubmissionState.pendingApproval);
    expect(record?.otpVerified, isTrue);
    expect(record?.canSync, isTrue);

    await pendingSubmissionRepository
        .markSubmissionCompleted('pending-lifecycle-1');
    record = await pendingSubmissionRepository.read('pending-lifecycle-1');
    expect(record?.submissionCompleted, isTrue);
    expect(record?.canSync, isFalse);

    await pendingSubmissionRepository.removeConfirmed(['pending-lifecycle-1']);
    expect(
        await pendingSubmissionRepository.read('pending-lifecycle-1'), isNull);
  });

  test('saving a Solar draft queues it for OTP without approving OTP',
      () async {
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'solar-draft-1',
        facilityId: 'facility-1',
        componentType: 'SOLAR',
        facility: Facility(facilityName: 'Solar facility'),
      ),
    );

    await pendingSubmissionRepository.saveDraft(
      workflow,
      workflowMode: 'newReport',
    );

    final record = await pendingSubmissionRepository.read('solar-draft-1');
    expect(record?.state, PendingSubmissionState.pendingOtpApproval);
    expect(record?.otpRequested, isFalse);
    expect(record?.otpVerified, isFalse);
    expect(record?.workflowMode, 'newReport');
  });

  test('activity facility reads top-level component, solution and BOM', () {
    final workflow = ActivityFacilityWorkflow.fromJson({
      'activityFacility': {
        'id': 'solar-1',
        'componentType': 'SOLAR',
        'componentSequence': 1,
        'solutionId': '202526PASF0000141',
        'additionalDetails': {'componentType': 'MACHINE'},
        'billOfMaterial': {
          'id': 'bom-1',
          'name': 'Solar',
          'solutionId': '202526PASF0000141',
          'data': {'bom_battery_quantity': 2},
        },
      },
    });
    expect(workflow.activityFacility.componentType, 'SOLAR');
    expect(workflow.activityFacility.solutionId, '202526PASF0000141');
    expect(workflow.activityFacility.billOfMaterial?.id, 'bom-1');
    expect(workflow.resolvedAssetCategory, FacilityAssetCategory.solar);
  });

  test('Solar draft uses BOM quantities only as initial asset counts', () {
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'solar-1',
        componentType: 'SOLAR',
        solutionId: '202526PASF0000141',
        billOfMaterial: BillOfMaterial(
          id: 'bom-1',
          name: 'Solar',
          solutionId: '202526PASF0000141',
          data: {
            'bom_battery_product': 'BATTERY-ITEM',
            'bom_battery_make': 'Battery Make',
            'bom_battery_capacity': '20 Ah',
            'bom_battery_quantity': 2,
            'bom_solar_panel_product': 'PANEL-ITEM',
            'bom_solar_panel_make': 'Panel Make',
            'bom_solar_panel_capacity': '330 Wp',
            'bom_solar_panel_quantity': '3',
          },
        ),
      ),
    );

    final repository = InstallationDraftRepository();
    final draft = repository.createSolar(workflow, SolarWorkflowMode.newReport);

    expect(draft.countFor(SolarAssetType.battery), 2);
    expect(draft.assets[SolarAssetType.battery]!.selectedBrandCode,
        'Battery Make');
    expect(draft.assets[SolarAssetType.battery]!.assets.first.itemCode,
        'BATTERY-ITEM');
    expect(
        draft.assets[SolarAssetType.battery]!.assets.first.capacity, '20 Ah');
    expect(draft.countFor(SolarAssetType.panel), 3);
    expect(draft.countFor(SolarAssetType.inverter), 0);
    expect(draft.allCountsEntered, isFalse);

    draft.setCount(SolarAssetType.battery, 5);
    draft.mergedBom['bom_battery_quantity'] = 1;
    repository.applyBomDerivedValues(draft);
    expect(draft.countFor(SolarAssetType.battery), 5);
    expect(draft.mergedBom['bom_battery_quantity'], 5);

    draft.setCount(SolarAssetType.inverter, 1);
    expect(draft.countFor(SolarAssetType.inverter), 1);
    expect(draft.allCountsEntered, isTrue);
  });

  test('fresh BOM metadata overrides stale blank Solar draft values', () {
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'solar-refresh',
        componentType: 'SOLAR',
        solutionId: 'solution-141',
      ),
    );
    final repository = InstallationDraftRepository();
    final draft = repository.createSolar(workflow, SolarWorkflowMode.newReport)
      ..mergedBom.addAll({
        'bom_battery_make': '',
        'bom_battery_capacity': '',
        'bom_battery_quantity': 0,
        'bom_inverter_pcu_make': '',
        'bom_inverter_pcu_capacity': '',
        'bom_inverter_pcu_quantity': 0,
        'bom_solar_panel_make': '',
        'bom_solar_panel_capacity': '',
        'bom_solar_panel_quantity': 0,
      });
    for (final asset in draft.assets.values) {
      asset.selectedBrandCode = '';
      asset.totalCapacity = '';
    }

    repository.applyFreshBomDerivedValues(draft, const [
      BillOfMaterial(
        id: 'solar-bom',
        name: 'Solar',
        additionalDetails: {'componentType': 'SOLAR'},
        data: {
          'bom_battery_product': 'BATTERY-ITEM',
          'bom_battery_make': 'Battery Make',
          'bom_battery_capacity': '20 Ah',
          'bom_battery_quantity': 1,
          'bom_inverter_pcu_product': 'INVERTER-ITEM',
          'bom_inverter_pcu_make': 'Inverter Make',
          'bom_inverter_pcu_capacity': '1 kVA',
          'bom_inverter_pcu_quantity': 1,
          'bom_solar_panel_product': 'PANEL-ITEM',
          'bom_solar_panel_make': 'Panel Make',
          'bom_solar_panel_capacity': '330 Wp',
          'bom_solar_panel_quantity': 1,
        },
      ),
    ]);
    repository.applyBomDerivedValues(draft);

    expect(draft.assets[SolarAssetType.battery]!.selectedBrandCode,
        'Battery Make');
    expect(draft.assets[SolarAssetType.inverter]!.selectedBrandCode,
        'Inverter Make');
    expect(draft.assets[SolarAssetType.panel]!.selectedBrandCode, 'Panel Make');
    for (final type in SolarAssetType.values) {
      expect(draft.countFor(type), 1);
      expect(draft.assets[type]!.totalCapacity, isNotEmpty);
      expect(draft.assets[type]!.assets.single.itemCode, isNotEmpty);
    }
  });

  test('asset counts activate from zero, have no BOM cap, and stop at one', () {
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(id: 'count-1'),
    );
    final draft = SolarInstallationDraft(
      workflow: workflow,
      mode: SolarWorkflowMode.newReport,
    )..applicableTypes = const [SolarAssetType.battery];

    expect(draft.countFor(SolarAssetType.battery), 0);
    expect(draft.allCountsEntered, isFalse);
    draft.setCount(SolarAssetType.battery, 1);
    expect(draft.countFor(SolarAssetType.battery), 1);
    expect(draft.assets[SolarAssetType.battery]!.assets, hasLength(1));
    draft.setCount(SolarAssetType.battery, 0);
    expect(draft.countFor(SolarAssetType.battery), 1);
    expect(draft.assets[SolarAssetType.battery]!.assets, hasLength(1));
    draft.setCount(SolarAssetType.battery, 10);
    expect(draft.countFor(SolarAssetType.battery), 10);
    expect(draft.assets[SolarAssetType.battery]!.assets, hasLength(10));
    expect(draft.mergedBom['bom_battery_quantity'], 10);
    draft.setCount(SolarAssetType.battery, 1);
    expect(draft.assets[SolarAssetType.battery]!.assets, hasLength(1));
  });

  test('invalid BOM quantities stay at an editable zero', () {
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'invalid-counts',
        componentType: 'SOLAR',
        billOfMaterial: BillOfMaterial(
          name: 'Solar',
          data: {
            'bom_battery_quantity': 0,
            'bom_inverter_pcu_quantity': -2,
            'bom_solar_panel_quantity': 'not-a-number',
          },
        ),
      ),
    );
    final draft = InstallationDraftRepository()
        .createSolar(workflow, SolarWorkflowMode.newReport);

    for (final type in SolarAssetType.values) {
      expect(draft.countFor(type), 0);
      draft.setCount(type, 1);
      expect(draft.countFor(type), 1);
      expect(draft.mergedBom[type.bomQuantityField], 1);
    }
    expect(draft.allCountsEntered, isTrue);
  });

  test('selected counts synchronize into dynamic answers and submission BOM',
      () {
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'selected-counts',
        facilityId: 'facility-1',
        componentType: 'SOLAR',
      ),
    );
    final draft = SolarInstallationDraft(
      workflow: workflow,
      mode: SolarWorkflowMode.newReport,
    )..dynamicFormAnswers['SOLAR_FORM'] = {
        'bom_battery_quantity': 1,
        'bom_inverter_pcu_quantity': 1,
        'bom_solar_panel_quantity': 1,
      };

    draft.setCount(SolarAssetType.battery, 2);
    draft.setCount(SolarAssetType.inverter, 3);
    draft.setCount(SolarAssetType.panel, 4);
    final payload = buildSolarSubmissionPayload(draft);
    final bomData = (payload['bom'] as Map)['data'] as Map;

    expect(bomData['bom_battery_quantity'], 2);
    expect(bomData['bom_inverter_pcu_quantity'], 3);
    expect(bomData['bom_solar_panel_quantity'], 4);
    expect(
      draft.dynamicFormAnswers['SOLAR_FORM'],
      containsPair('bom_solar_panel_quantity', 4),
    );
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

  test('new asset entries inherit BOM defaults and shared Battery Type', () {
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(id: 'reconcile-defaults'),
    );
    final draft = SolarInstallationDraft(
      workflow: workflow,
      mode: SolarWorkflowMode.newReport,
    )..mergedBom.addAll({
        'bom_battery_product': 'BATTERY-ITEM',
        'bom_battery_capacity': '125 Ah',
      });
    final battery = draft.assets[SolarAssetType.battery]!
      ..totalCapacity = '125 Ah';

    draft.setCount(SolarAssetType.battery, 1);
    expect(battery.assets.single.itemCode, 'BATTERY-ITEM');
    expect(battery.assets.single.capacity, '125 Ah');

    battery.assets.single
      ..batteryType = 'Lead Acid'
      ..serialNumber = 'BATTERY-1';
    draft.setCount(SolarAssetType.battery, 2);

    expect(battery.assets, hasLength(2));
    expect(battery.assets.last.itemCode, 'BATTERY-ITEM');
    expect(battery.assets.last.capacity, '125 Ah');
    expect(battery.assets.last.batteryType, 'Lead Acid');
    expect(battery.assets.first.serialNumber, 'BATTERY-1');
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
    expect(mapping.solutionCode, 'DC');
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

  test('Machine form MDMS parses active required fields in order', () {
    final schema = MachineFormSchema.fromJson({
      'uniqueIdentifier': 'MACHINE_FORM',
      'data': {
        'title': 'Machine Report',
        'fields': [
          {
            'title': 'Hidden',
            'fieldName': 'hidden',
            'type': 'text',
            'order': 1,
            'active': false
          },
          {
            'title': 'Photo',
            'fieldName': 'PHOTO',
            'type': 'image',
            'order': 3,
            'required': true,
            'requiredCount': 2
          },
          {
            'title': 'Serial',
            'fieldName': 'serialNumber',
            'type': 'text',
            'order': 2,
            'required': true
          },
        ],
      },
    });

    expect(schema.name, 'MACHINE_FORM');
    expect(schema.fields.map((field) => field.fieldName),
        ['serialNumber', 'PHOTO']);
    expect(schema.fields.last.isMedia, isTrue);
    expect(schema.fields.every((field) => field.requiredField), isTrue);
    expect(schema.fields.last.requiredCount, 2);
    expect(schema.fields.last.allowMultiples, isTrue);
    expect(schema.fields.last.requiredLabel, 'Required: 2 images');
    expect(schema.fields.last.mediaCountComplete(1), isFalse);
    expect(schema.fields.last.mediaCountComplete(2), isTrue);

    final optionalMedia = MachineFormField.fromJson(const {
      'title': 'Civil Work (If any)',
      'fieldName': 'MACHINE_CIVIL_WORK',
      'type': 'image',
      'order': 4,
      'required': false,
      'requiredCount': 2,
    });
    expect(optionalMedia.mediaCountComplete(0), isTrue);
    expect(optionalMedia.mediaCountComplete(1), isFalse);
    expect(optionalMedia.mediaCountComplete(2), isTrue);

    final text = MachineFormField.fromJson(const {
      'title': 'Text',
      'fieldName': 'text',
      'type': 'text',
      'order': 5,
      'required': true,
      'requiredCount': 20,
    });
    expect(text.requiredCount, 1);
  });

  testWidgets('new document identity and location stay stable', (tester) async {
    documentLocationOverride = () => const {
          'latitude': '6.5108074',
          'longitude': '3.606173',
          'additionalDetails': null,
        };
    late SolarFileRef committed;
    late SolarFileRef second;
    await tester.pumpWidget(MaterialApp(home: Builder(builder: (context) {
      committed = commitDocumentMetadata(
        context,
        const SolarFileRef(
          name: 'board.jpg',
          path: '/tmp/board.jpg',
          kind: SolarFileKind.image,
        ),
        documentType: 'MACHINE_ELECTRIC_BOARD',
        uidPrefix: 'DOC-MACHINE-MACHINE_ELECTRIC_BOARD',
      );
      second = commitDocumentMetadata(
        context,
        const SolarFileRef(
          name: 'board-2.jpg',
          path: '/tmp/board-2.jpg',
          kind: SolarFileKind.image,
        ),
        documentType: 'MACHINE_ELECTRIC_BOARD',
        uidPrefix: 'DOC-MACHINE-MACHINE_ELECTRIC_BOARD',
      );
      return const SizedBox.shrink();
    })));
    final retry = SubmissionDocument.fromJson(
      SubmissionDocument(
        id: 'backend-document-id',
        documentType: committed.documentType!,
        documentUid: committed.documentUid,
        localPath: committed.path,
        geoLocation: committed.geoLocation,
      ).toCacheJson(),
    );

    expect(committed.documentUid,
        startsWith('DOC-MACHINE-MACHINE_ELECTRIC_BOARD-'));
    expect(committed.hasValidLocation, isTrue);
    expect(second.documentUid, isNot(committed.documentUid));
    expect(retry.id, 'backend-document-id');
    expect(retry.documentUid, committed.documentUid);
    expect(retry.geoLocation, committed.geoLocation);
    documentLocationOverride = null;
  });

  test('media display titles round-trip without replacing file names', () {
    const media = SolarFileRef(
      name: 'raw-material-demo.mp4',
      path: '/tmp/raw-material-demo.mp4',
      kind: SolarFileKind.video,
      displayTitle: 'Raw Material Demo',
      documentType: 'MACHINE_DEMO_VIDEO',
    );

    final restored = SolarFileRef.fromJson(media.toJson());

    expect(restored.name, 'raw-material-demo.mp4');
    expect(restored.displayTitle, 'Raw Material Demo');
    expect(restored.viewerTitle, 'Raw Material Demo');
    expect(
      restored.copyWith(displayTitle: 'Updated MDMS Title').name,
      'raw-material-demo.mp4',
    );
    expect(
      const SolarFileRef(
        name: 'solar-panel.jpg',
        path: '/tmp/solar-panel.jpg',
        kind: SolarFileKind.image,
      ).viewerTitle,
      'solar-panel.jpg',
    );
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
      ..remoteBomName = 'RMS_ACC_OFF_GRID_SINGLE_PHASE'
      ..applicableTypes = const [SolarAssetType.panel]
      ..bomFormNames.addAll(['DC_BOM_Solar', 'DC_BOM_system'])
      ..mergedBom.addAll({'panelCount': 4, 'weather': 'CLEAR'});
    draft.setCount(SolarAssetType.panel, 1);
    draft.assetTypeCodes[SolarAssetType.panel] = 'PANEL';
    draft.assets[SolarAssetType.panel]!
      ..selectedBrandCode = 'RENEW'
      ..warrantyDuration = '5 Years'
      ..images.add(const SolarFileRef(
        name: 'overview.jpg',
        path: 'workflow-filestore',
        remoteId: 'workflow-filestore',
        kind: SolarFileKind.image,
      ));
    draft.assets[SolarAssetType.panel]!.assets.single
      ..itemCode = 'SP-330WP'
      ..serialNumber = 'SERIAL-1'
      ..capacity = '330'
      ..supportingPhoto = const SolarFileRef(
        name: 'asset.jpg',
        path: 'asset-filestore',
        remoteId: 'asset-filestore',
        kind: SolarFileKind.image,
        documentUid: 'DOC-BATTERY-IMAGE-1',
        geoLocation: {'latitude': '6.5', 'longitude': '3.6'},
      );

    final payload = buildSolarSubmissionPayload(draft);
    final bom = payload['bom'] as Map;
    final asset = (payload['assets'] as List).single as Map;
    final workflowDocument =
        (payload['workflowDocuments'] as List).single as Map;

    expect(payload.containsKey('boms'), isFalse);
    expect(bom['name'], 'RMS_ACC_OFF_GRID_SINGLE_PHASE');
    expect(bom['data'], {
      'panelCount': 4,
      'weather': 'CLEAR',
      'bom_solar_panel_quantity': 1,
    });
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
          documentUid: 'DOC-BATTERY-IMAGE-2',
          geoLocation: {'latitude': '6.5', 'longitude': '3.6'},
        ),
      ));

    final payload = buildSolarSubmissionPayload(draft);
    final asset = (payload['assets'] as List).single as Map;
    final details = asset['assetDetails'] as Map;
    expect(details['batteryType'], 'LITHIUM_ION');
    expect(details, isNot(contains('type')));
    expect(details, isNot(contains('battery_type')));
  });

  test('machine assetTypeID resolves from the ItemCode MDMS catalog', () async {
    await assetMdmsRepository.store(const AssetRegistryMdmsResponse(
      livelihood: LivelihoodModule(
        itemCode: [
          ItemCode(
            code: 'HULLER-RICE-3HP',
            name: 'Huller Rice 3HP AC 150 kgs/hr',
            active: true,
            category: 'RICE HULLER',
            solarAsset: false,
          ),
          ItemCode(
            code: 'SP-300WP',
            name: 'Solar Panel 300Wp',
            active: true,
            category: 'SOLAR PANEL',
            solarAsset: true,
          ),
        ],
      ),
    ));
    addTearDown(
        () => assetMdmsRepository.store(const AssetRegistryMdmsResponse()));

    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'activity-facility-1',
        facilityId: 'facility-1',
        additionalDetails: ActivityFacilityAdditionalDetails(
          componentType: 'MACHINE',
          bom: {
            'components': [
              {'itemCode': 'HULLER-RICE-3HP'},
            ],
          },
        ),
      ),
    );

    final payload = buildMachineSubmissionPayload(
      workflow: workflow,
      values: const {
        'poNumber': 'PO-1',
        'serialNumber': 'SER-1',
        'invoiceNumber': 'INV-1',
        'capacity': '3',
        'warrantyDuration': '5',
        'trainedEndUser': true,
      },
      media: const {
        'MACHINE_CIVIL_WORK': [
          SolarFileRef(
            name: 'civil-1.jpg',
            path: 'filestore-civil-1',
            remoteId: 'filestore-civil-1',
            kind: SolarFileKind.image,
            documentType: 'MACHINE_CIVIL_WORK',
            documentUid: 'DOC-MACHINE-MACHINE_CIVIL_WORK-1',
            geoLocation: {'latitude': '6.5', 'longitude': '3.6'},
          ),
          SolarFileRef(
            name: 'civil-2.jpg',
            path: 'filestore-civil-2',
            remoteId: 'filestore-civil-2',
            kind: SolarFileKind.image,
            documentType: 'MACHINE_CIVIL_WORK',
            documentUid: 'DOC-MACHINE-MACHINE_CIVIL_WORK-2',
            geoLocation: {'latitude': '6.6', 'longitude': '3.7'},
          ),
        ],
      },
    );
    final asset = (payload['assets'] as List).single as Map;
    expect(asset['assetTypeID'], 'RICE HULLER');
    expect(asset['itemCode'], 'HULLER-RICE-3HP');
    final documents = asset['documents'] as List;
    expect(documents, hasLength(2));
    expect(documents.map((item) => (item as Map)['documentUid']), [
      'DOC-MACHINE-MACHINE_CIVIL_WORK-1',
      'DOC-MACHINE-MACHINE_CIVIL_WORK-2',
    ]);
    expect((documents.first as Map)['documentType'], 'MACHINE_CIVIL_WORK');
    expect((documents.first as Map)['geoLocation'], {
      'latitude': '6.5',
      'longitude': '3.6',
    });
    expect(payload['workflowDocuments'], isEmpty);
  });

  test(
      'solar itemCode stays unset when the catalog has no entry for the '
      'asset type', () async {
    await assetMdmsRepository.store(const AssetRegistryMdmsResponse(
      livelihood: LivelihoodModule(
        itemCode: [
          ItemCode(
            code: 'SP-300WP',
            name: 'Solar Panel 300Wp',
            active: true,
            category: 'SOLAR PANEL',
            solarAsset: true,
          ),
          ItemCode(
            code: 'SP-330WP',
            name: 'Solar Panel 330Wp',
            active: true,
            category: 'SOLAR PANEL',
            solarAsset: true,
          ),
        ],
      ),
    ));
    addTearDown(
        () => assetMdmsRepository.store(const AssetRegistryMdmsResponse()));

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
        serialNumber: 'BATTERY-1',
        capacity: '125',
        batteryType: 'LITHIUM_ION',
      ));

    final payload = buildSolarSubmissionPayload(draft);
    final asset = (payload['assets'] as List).single as Map;
    expect(asset.containsKey('itemCode'), isFalse);
  });

  test(
      'battery image and panel video round-trip through submit and reopen '
      'using the E4H-matching lowercase documentType', () {
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
      ..applicableTypes = const [SolarAssetType.battery, SolarAssetType.panel];
    draft.assetTypeCodes[SolarAssetType.battery] = 'BATTERY';
    draft.assetTypeCodes[SolarAssetType.panel] = 'PANEL';
    draft.assets[SolarAssetType.battery]!
      ..selectedBrandCode = 'NED'
      ..warrantyDuration = '5 Years'
      ..assets.add(SolarAssetEntry(
        serialNumber: 'BATTERY-1',
        capacity: '125',
        batteryType: 'LITHIUM_ION',
      ))
      ..images.add(const SolarFileRef(
        name: 'battery.jpg',
        path: 'battery-filestore',
        remoteId: 'battery-filestore',
        kind: SolarFileKind.image,
      ));
    draft.assets[SolarAssetType.panel]!
      ..selectedBrandCode = 'RENEW'
      ..warrantyDuration = '5 Years'
      ..assets.add(SolarAssetEntry(
        serialNumber: 'PANEL-1',
        capacity: '330',
      ))
      ..videos.add(const SolarFileRef(
        name: 'panel.mp4',
        path: 'panel-filestore',
        remoteId: 'panel-filestore',
        kind: SolarFileKind.video,
      ));

    final payload = buildSolarSubmissionPayload(draft);
    final workflowDocuments = payload['workflowDocuments'] as List;
    final batteryDoc = workflowDocuments
        .cast<Map>()
        .firstWhere((document) => document['fileStore'] == 'battery-filestore');
    final panelDoc = workflowDocuments
        .cast<Map>()
        .firstWhere((document) => document['fileStore'] == 'panel-filestore');
    expect(batteryDoc['documentType'], 'battery-image');
    expect(panelDoc['documentType'], 'panel-video');

    final reopenedWorkflow = ActivityFacilityWorkflow(
      activityFacility: workflow.activityFacility,
      workflow: Workflow(
        documents: [
          {
            'documentType': batteryDoc['documentType'],
            'fileStoreId': batteryDoc['fileStore'],
          },
          {
            'documentType': panelDoc['documentType'],
            'fileStoreId': panelDoc['fileStore'],
          },
        ],
      ),
    );
    final reopenedDraft = InstallationDraftRepository()
        .createSolar(reopenedWorkflow, SolarWorkflowMode.pending);
    expect(
        reopenedDraft.assets[SolarAssetType.battery]!.images
            .map((file) => file.remoteId),
        contains('battery-filestore'));
    expect(
        reopenedDraft.assets[SolarAssetType.panel]!.videos
            .map((file) => file.remoteId),
        contains('panel-filestore'));
  });

  test(
      'INSTALLATION_IMAGE- hydration keeps the full hyphenated MDMS code '
      'instead of truncating it', () {
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'activity-facility-1',
        facilityId: 'facility-1',
      ),
    );
    final reopenedWorkflow = ActivityFacilityWorkflow(
      activityFacility: workflow.activityFacility,
      workflow: const Workflow(
        documents: [
          {
            'documentType': 'INSTALLATION_IMAGE-roof-mount-photo',
            'fileStoreId': 'roof-filestore',
          },
        ],
      ),
    );
    final reopenedDraft = InstallationDraftRepository()
        .createSolar(reopenedWorkflow, SolarWorkflowMode.pending);
    expect(
        reopenedDraft.installationMedia['roof-mount-photo']
            ?.map((file) => file.remoteId),
        contains('roof-filestore'));
    expect(reopenedDraft.installationMedia['roof'], isNull);
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
      name: 'RMS_ACC_OFF_GRID_SINGLE_PHASE',
    );

    expect(result?.id, 'solar');
  });

  test('asset MDMS selectors use livelihood BOM records and asset codes', () {
    final parsedBattery = AssetType.fromJson({
      'code': 'BATTERY',
      'name': 'Battery',
      'active': true,
      'form_fields': [
        {
          'key': 'capacity',
          'system': 'DC',
          'options': ['125'],
        },
        {
          'types': ['Lithium', 'Lead Acid', 'VRLA'],
        },
      ],
    });
    expect(parsedBattery.formFields.expand((field) => field.types),
        ['Lithium', 'Lead Acid', 'VRLA']);

    const response = AssetRegistryMdmsResponse(
      livelihood: LivelihoodModule(
        machineFormSchema: [
          {
            'isActive': true,
            'data': {
              'name': 'MACHINE_FORM',
              'title': 'Machine Report',
              'fields': [
                {
                  'title': 'Serial',
                  'fieldName': 'serialNumber',
                  'type': 'text',
                  'order': 1,
                  'required': true,
                  'active': true,
                },
              ],
            },
          },
        ],
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
        solutionBomForms: [
          {
            'active': true,
            'solutionCode': '202526PASF0000141',
            'bomForms': [
              {'name': 'LIVELIHOOD_BOM_solar'},
              {'name': 'LIVELIHOOD_BOM_machines'},
              {'name': 'LIVELIHOOD_COMMON_BOM_system'},
            ],
          },
        ],
      ),
      assetRegistry: AssetRegistryModule(
        assetTypeSchema: [
          AssetTypeData(
            id: 1,
            assetType: [
              AssetType(
                code: 'BATTERY',
                name: 'Battery',
                active: true,
                formFields: [
                  AssetTypeFormField(
                    types: ['Lithium', '', 'Lead Acid', 'Lithium', 'VRLA'],
                  ),
                ],
              ),
              AssetType(
                code: 'PANEL',
                name: 'Panel',
                active: true,
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
    expect(
        repository.assetTypes.map((item) => item.code), ['BATTERY', 'PANEL']);
    expect(repository.typesFor('battery'), ['Lithium', 'Lead Acid', 'VRLA']);
    expect(repository.typesFor('PANEL'), isEmpty);
    expect(repository.warrantiesFor('PANEL').single.duration, '5');
    expect(repository.rawBomSchemaFor('System'), isNotNull);
    expect(repository.rawBomSchemaFor('Inactive'), isNull);
    expect(repository.machineFormSchema?.name, 'MACHINE_FORM');
    expect(repository.formsFor('202526PASF0000141'), [
      'LIVELIHOOD_BOM_solar',
      'LIVELIHOOD_BOM_machines',
      'LIVELIHOOD_COMMON_BOM_system',
    ]);
  });

  test('Battery type options validate and reconcile cached selections', () {
    const mdms = AssetRegistryMdmsResponse(
      assetRegistry: AssetRegistryModule(
        assetTypeSchema: [
          AssetTypeData(
            id: 1,
            assetType: [
              AssetType(
                code: 'BATTERY',
                name: 'Battery',
                active: true,
                formFields: [
                  AssetTypeFormField(
                    types: ['Lithium', 'Lead Acid', 'VRLA'],
                  ),
                ],
              ),
              AssetType(code: 'INVERTER', name: 'Inverter', active: true),
              AssetType(code: 'PANEL', name: 'Panel', active: true),
            ],
          ),
        ],
      ),
    );
    const workflow = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'battery-types',
        componentType: 'SOLAR',
        billOfMaterial: BillOfMaterial(
          name: 'Solar',
          data: {
            'bom_battery_product': 'BATTERY-ITEM',
            'bom_battery_make': 'Battery Make',
            'bom_battery_capacity': '20 Ah',
            'bom_battery_quantity': 1,
          },
        ),
      ),
    );
    final repository = InstallationDraftRepository(
      mdmsRepository: AssetMdmsRepository(initial: mdms),
    );
    final draft = repository.createSolar(workflow, SolarWorkflowMode.newReport);
    final battery = draft.assets[SolarAssetType.battery]!;
    final entry = battery.assets.single
      ..serialNumber = 'BATTERY-1'
      ..supportingPhoto = const SolarFileRef(
        name: 'battery.jpg',
        path: '/tmp/battery.jpg',
        kind: SolarFileKind.image,
        documentUid: 'DOC-BATTERY-IMAGE-3',
        geoLocation: {'latitude': '6.5', 'longitude': '3.6'},
      );

    expect(battery.typeOptions, ['Lithium', 'Lead Acid', 'VRLA']);
    expect(draft.assets[SolarAssetType.inverter]!.typeOptions, isEmpty);
    expect(draft.assets[SolarAssetType.panel]!.typeOptions, isEmpty);
    expect(battery.entryComplete(entry), isFalse);

    entry.batteryType = 'Lead Acid';
    repository.applyBomDerivedValues(draft);
    expect(entry.batteryType, 'Lead Acid');
    expect(battery.entryComplete(entry), isTrue);

    entry.batteryType = 'OBSOLETE';
    repository.applyBomDerivedValues(draft);
    expect(entry.batteryType, isEmpty);
    expect(battery.entryComplete(entry), isFalse);
  });

  test('installation images include every active item in response order', () {
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

    final images = repository.installationImages;
    expect(images.map((item) => item.code), ['LATER', 'FIRST', 'DIRECT_AC']);
    expect(images.first.allowMultiples, isTrue);
    expect(images.first.requiredLabel, 'Required: 2 images');
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

  test('bulk submission aggregates only OTP-approved local jobs', () async {
    const first = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'bulk-1',
        facilityId: 'facility-1',
        componentType: 'MACHINE',
      ),
    );
    const second = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'bulk-2',
        facilityId: 'facility-2',
        componentType: 'SOLAR',
      ),
    );
    const otpOnly = ActivityFacilityWorkflow(
      activityFacility: ActivityFacility(
        id: 'bulk-otp-only',
        facilityId: 'facility-3',
        componentType: 'SOLAR',
      ),
    );
    await pendingSubmissionRepository.markOtpVerified(first);
    await pendingSubmissionRepository.markOtpVerified(second);
    await pendingSubmissionRepository.markOtpRequested(otpOnly);

    final progressRepo = _MultiStubOperationProgressRepository();
    await progressRepo.upsertJob(
      activityFacilityId: 'bulk-1',
      status: OperationStatuses.running,
      stageKey: 'submitting_assets',
      completedSteps: 4,
      totalSteps: submitStages.length,
    );
    await progressRepo.upsertJob(
      activityFacilityId: 'bulk-2',
      status: OperationStatuses.running,
      stageKey: 'uploading_media',
      completedSteps: 2,
      totalSteps: submitStages.length,
    );
    final bloc = AssetSubmissionBloc(progressRepository: progressRepo);
    bloc.add(const SubmitAllPending());
    await pumpEventQueue();

    final terminalFuture = bloc.stream
        .where((state) => state is BulkSubmissionProgress)
        .cast<BulkSubmissionProgress>()
        .firstWhere((state) => state.isTerminal);

    await progressRepo.upsertJob(
      activityFacilityId: 'bulk-1',
      status: OperationStatuses.success,
      stageKey: 'submission_successful',
      completedSteps: submitStages.length,
      totalSteps: submitStages.length,
    );
    await progressRepo.upsertJob(
      activityFacilityId: 'bulk-2',
      status: OperationStatuses.failed,
      stageKey: 'uploading_media',
      completedSteps: 2,
      totalSteps: submitStages.length,
      lastError: 'offline',
    );

    final terminal = await terminalFuture;
    expect(terminal.total, 2);
    expect(terminal.completed, 1);
    expect(terminal.failedCount, 1);
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

class _MultiStubOperationProgressRepository
    implements OperationProgressRepository {
  final _controller = StreamController<OperationProgressModel>.broadcast();
  final _jobs = <String, OperationProgressModel>{};

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
    final job = OperationProgressModel(
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
    _jobs[activityFacilityId] = job;
    _controller.add(job);
  }

  @override
  Future<OperationProgressModel?> readJob(String activityFacilityId) async =>
      _jobs[activityFacilityId];

  @override
  Stream<OperationProgressModel?> watchJob(String activityFacilityId) async* {
    yield _jobs[activityFacilityId];
    yield* _controller.stream
        .where((job) => job.activityFacilityId == activityFacilityId);
  }

  @override
  Future<void> clearJob(String activityFacilityId) async {
    _jobs.remove(activityFacilityId);
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
