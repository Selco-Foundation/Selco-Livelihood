import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/data/remote_client.dart';
import 'package:livelihood/model/asset/asset_submission.dart';
import 'package:livelihood/repositories/asset_repository.dart';
import 'package:livelihood/utils/api_paths.dart';
import 'package:livelihood/utils/envConfig.dart';
import 'package:livelihood/utils/submission_media_reconciliation.dart';

Map<String, dynamic> solar() => {
      'assetId': 'solar-1',
      'assetTypeID': 'SOLAR',
      'submitted': true,
      'documents': [],
      'children': [
        {
          'assetId': 'panel-1',
          'assetTypeID': 'PANEL',
          'serialNumber': 'SN-OLD',
          'brandID': 'SELCO',
          'modelNumber': 'model-1',
          'itemCode': 'panel-product',
          'warrantyDurationYears': 5,
          'submitted': true,
          'assetDetails': {'invoiceNumber': 'INV-OLD', 'capacity': '525'},
          'documents': [
            {
              'id': 'document-1',
              'documentUid': 'photo-1',
              'documentType': 'ASSET',
              'fileStore': 'uploaded-photo',
            },
          ],
        },
      ],
    };

Map<String, dynamic> snapshot(Map<String, dynamic> asset) => {
      'kind': 'solar',
      'bom': {
        'remoteId': 'bom-1',
        'submitted': true,
        'data': {'measurement': '100', 'unit_uom': 'V'},
      },
      'assets': [asset],
      'workflowDocuments': [],
    };

Map<String, dynamic> copy(Map<String, dynamic> value) =>
    jsonDecode(jsonEncode(value)) as Map<String, dynamic>;

void main() {
  setUpAll(() async => envConfig.initialize());

  group('existing registry API', () {
    late Dio dio;
    late List<Interceptor> original;
    final requests = <RequestOptions>[];

    setUp(() {
      dio = DioClient().dio;
      original = dio.interceptors.toList();
      dio.interceptors.clear();
      requests.clear();
    });

    tearDown(() {
      dio.interceptors
        ..clear()
        ..addAll(original);
    });

    test('resubmission updates the child ID with its invoice and parent link',
        () async {
      dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
        requests.add(options);
        handler.resolve(Response(
          requestOptions: options,
          statusCode: 200,
          data: {'asset': options.data['assetDetail']['Asset']},
        ));
      }));
      final desired = solar()..['system'] = 'LIVELIHOOD';
      desired['children'][0]['assetDetails']['invoiceNumber'] = 'INV-NEW';
      final result = await AssetRepository().createOrUpdate(
        asset: AssetSubmission.fromCheckpoint(desired),
        facilityId: 'facility-1',
        activityFacilityId: 'activity-1',
        vendorId: 'vendor-1',
      );
      expect(requests, hasLength(1));
      expect(requests.single.path, ApiPaths.assetUpdate);
      expect(requests.single.queryParameters['assetID'], 'panel-1');
      final sent = requests.single.data['assetDetail']['Asset'];
      expect(sent['parentId'], 'solar-1');
      expect(sent['system'], 'LIVELIHOOD');
      expect(sent['facilityID'], 'facility-1');
      expect(sent['activityFacilityID'], 'activity-1');
      expect(sent['vendorId'], 'vendor-1');
      expect(sent['assetDetails']['invoiceNumber'], 'INV-NEW');
      expect(sent['documents'][0]['fileStore'], 'uploaded-photo');
      expect(result['assetId'], 'solar-1');
      expect(
          assetSubmissionIsPersisted(
              AssetSubmission.fromCheckpoint(desired), result),
          isTrue);
    });

    test('first submission still creates the parent and children together',
        () async {
      dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
        requests.add(options);
        handler.resolve(Response(
          requestOptions: options,
          statusCode: 201,
          data: {
            'asset': {
              ...options.data['assetDetail']['Asset'],
              'assetId': 'new-parent'
            }
          },
        ));
      }));
      final desired = solar()..remove('assetId');
      await AssetRepository().createOrUpdate(
        asset: AssetSubmission.fromCheckpoint(desired),
        facilityId: 'facility-1',
        activityFacilityId: 'activity-1',
        vendorId: 'vendor-1',
      );
      expect(requests, hasLength(1));
      expect(requests.single.path, ApiPaths.assetCreate);
      expect(requests.single.data['assetDetail']['Asset']['children'],
          hasLength(1));
    });

    test('a failed child update stays failed and retries reuse existing IDs',
        () async {
      var failSecond = true;
      dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
        requests.add(options);
        if (failSecond && options.queryParameters['assetID'] == 'panel-2') {
          handler.reject(DioException(
              requestOptions: options, type: DioExceptionType.connectionError));
          return;
        }
        handler.resolve(Response(
          requestOptions: options,
          statusCode: 200,
          data: {'asset': options.data['assetDetail']['Asset']},
        ));
      }));
      final desired = copy(solar());
      final second = copy(desired['children'][0] as Map<String, dynamic>);
      second['assetId'] = 'panel-2';
      second['serialNumber'] = 'SN-2';
      desired['children'].add(second);
      Future<Map<String, dynamic>> submit() => AssetRepository().createOrUpdate(
            asset: AssetSubmission.fromCheckpoint(desired),
            facilityId: 'facility-1',
            activityFacilityId: 'activity-1',
            vendorId: 'vendor-1',
          );
      await expectLater(submit(), throwsA(isA<DioException>()));
      failSecond = false;
      final result = await submit();
      expect(requests.every((request) => request.path == ApiPaths.assetUpdate),
          isTrue);
      expect(requests.map((request) => request.queryParameters['assetID']),
          ['panel-1', 'panel-2', 'panel-1', 'panel-2']);
      expect(result['children'], hasLength(2));
    });
  });

  test('invoice edits must persist before verification succeeds', () {
    final saved = solar();
    final desired = copy(saved);
    desired['children'][0]['assetDetails']['invoiceNumber'] = 'INV-NEW';
    final expected = AssetSubmission.fromCheckpoint(desired);
    expect(assetSubmissionMismatch(expected, saved),
        'PANEL panel-1: assetDetails.invoiceNumber');
    expect(assetSubmissionIsPersisted(expected, saved), isFalse);
    expect(assetSubmissionIsPersisted(expected, desired), isTrue);
  });

  for (final change in {
    'serialNumber': 'SN-CORRECTED',
    'brandID': 'NEW-BRAND',
    'modelNumber': 'model-2',
    'itemCode': 'replacement-product',
    'warrantyDurationYears': 10,
  }.entries) {
    test('verification detects an unsaved ${change.key}', () {
      final saved = solar();
      final desired = copy(saved);
      desired['children'][0][change.key] = change.value;
      final expected = AssetSubmission.fromCheckpoint(desired);
      expect(assetSubmissionIsPersisted(expected, saved), isFalse);
      expect(assetSubmissionIsPersisted(expected, desired), isTrue);
    });
  }

  test('retry preserves corrections and completed uploads', () {
    final old = snapshot(solar());
    final latest = copy(old);
    final child = latest['assets'][0]['children'][0] as Map;
    child['assetDetails']['invoiceNumber'] = 'INV-NEW';
    child['assetDetails']['capacity'] = '550';
    child['serialNumber'] = 'SN-CORRECTED';
    child['warrantyDurationYears'] = 10;
    child['documents'][0].remove('fileStore');
    child['documents'][0].remove('id');
    latest['bom']['data']['measurement'] = '200';
    final merged = reconcileSubmissionMedia(old, latest);
    final parent = merged['assets'][0];
    final corrected = parent['children'][0];
    expect(corrected['assetDetails']['invoiceNumber'], 'INV-NEW');
    expect(corrected['assetDetails']['capacity'], '550');
    expect(corrected['serialNumber'], 'SN-CORRECTED');
    expect(corrected['warrantyDurationYears'], 10);
    expect(corrected['assetId'], 'panel-1');
    expect(corrected['documents'][0]['fileStore'], 'uploaded-photo');
    expect(corrected['documents'][0]['id'], 'document-1');
    expect(corrected['submitted'], isFalse);
    expect(parent['submitted'], isFalse);
    expect(merged['bom']['remoteId'], 'bom-1');
    expect(merged['bom']['data']['measurement'], '200');
    expect(merged['bom']['submitted'], isFalse);
    expect(old['assets'][0]['children'][0]['assetDetails']['invoiceNumber'],
        'INV-OLD');
    expect(reconcileSubmissionMedia(merged, latest), merged);
  });

  test('verification checks photo replacements and removals', () {
    final saved = solar();
    final desired = copy(saved);
    desired['children'][0]['documents'][0]['fileStore'] = 'new-photo';
    expect(
        assetSubmissionIsPersisted(
            AssetSubmission.fromCheckpoint(desired), saved),
        isFalse);
    final reconciled = reconcileSolarSubmission(
        AssetSubmission.fromCheckpoint(desired), saved);
    expect(reconciled.children.single.documents.single.fileStore, 'new-photo');
    final retried =
        reconcileSubmissionMedia(snapshot(saved), snapshot(desired));
    expect(retried['assets'][0]['children'][0]['documents'][0]['fileStore'],
        'new-photo');
    desired['children'][0]['documents'] = [];
    expect(
        assetSubmissionIsPersisted(
            AssetSubmission.fromCheckpoint(desired), saved),
        isFalse);
    expect(
        assetSubmissionIsPersisted(
            AssetSubmission.fromCheckpoint(desired), desired),
        isTrue);
  });

  test('child ID takes precedence over another child with the same serial', () {
    final saved = copy(solar());
    final other = copy(saved['children'][0] as Map<String, dynamic>);
    other['assetId'] = 'another-panel';
    saved['children'].insert(0, other);
    final reconciled = reconcileSolarSubmission(
        AssetSubmission.fromCheckpoint(solar()), saved);
    expect(reconciled.children.single.assetId, 'panel-1');
  });
}
