import 'dart:async';
import 'dart:io';
import 'dart:ui' show DartPluginRegistrant;

import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../data/secure_storage/secureStore.dart';
import '../model/asset/asset_submission.dart';
import '../model/bom/bom.dart';
import '../model/document/submission_document.dart';
import '../repositories/activity_facility_repo.dart';
import '../repositories/asset_repository.dart';
import '../repositories/bom_repository.dart';
import '../repositories/filestore_repository.dart';
import '../repositories/installation_cache_repo.dart';
import '../repositories/operation_progress_repo.dart';
import '../repositories/vendor_org_repository.dart';
import 'envConfig.dart';
import 'operation_progress.dart';
import 'submission_payload.dart';

const String kMethodSubmit = 'submit';
const String kEvtDone = 'submission_done';
const String kEvtError = 'submission_error';
const String kEvtReady = 'service_ready';

const String _svcChannelId = 'asset_submission_channel';
const String _svcChannelName = 'Asset Submission';
const int _svcNotifId = 728331;
const String _svcNotifIcon = '@mipmap/ic_launcher';

final FlutterLocalNotificationsPlugin _fln = FlutterLocalNotificationsPlugin();

Future<void> ensureAndroidNotificationPermission() async {
  if (!Platform.isAndroid) return;
  final androidPlugin = _fln.resolvePlatformSpecificImplementation<
      AndroidFlutterLocalNotificationsPlugin>();
  final granted = await androidPlugin?.areNotificationsEnabled() ?? true;
  if (!granted) {
    await androidPlugin?.requestNotificationsPermission();
  }
}

/// Called once from `main.dart` before the app renders. Configures the
/// notification channel Android's foreground-service mode requires, then
/// registers [onStart] as the background isolate's entry point. Mirrors
/// e4h's `setupBackgroundService`, trimmed to this app's submit-only
/// pipeline.
Future<void> setupBackgroundService() async {
  const androidInit = AndroidInitializationSettings(_svcNotifIcon);
  const iosInit = DarwinInitializationSettings();
  await _fln.initialize(
    const InitializationSettings(android: androidInit, iOS: iosInit),
  );
  const androidChannel = AndroidNotificationChannel(
    _svcChannelId,
    _svcChannelName,
    description: 'Submitting installation reports in the background',
    importance: Importance.low,
  );
  await _fln
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(androidChannel);

  await FlutterBackgroundService().configure(
    androidConfiguration: AndroidConfiguration(
      onStart: onStart,
      isForegroundMode: true,
      autoStart: false,
      notificationChannelId: _svcChannelId,
      initialNotificationTitle: 'Submitting installation report',
      initialNotificationContent: 'Preparing…',
      foregroundServiceNotificationId: _svcNotifId,
    ),
    iosConfiguration: IosConfiguration(
      onForeground: onStart,
      onBackground: _onIosBackground,
    ),
  );
}

@pragma('vm:entry-point')
bool _onIosBackground(ServiceInstance service) {
  WidgetsFlutterBinding.ensureInitialized();
  return true;
}

class BackgroundServiceController {
  BackgroundServiceController._();
  static final BackgroundServiceController I = BackgroundServiceController._();

  /// Persists nothing itself — the caller (`overall_asset_summary.dart` /
  /// `machine_form.dart`) must already have written the submission payload
  /// via `installationCacheRepository.putJson('submission-payload', ...)`
  /// before calling this, since only the UI isolate has the fully
  /// MDMS-hydrated draft needed to build it.
  Future<void> enqueueSubmission({
    required String activityFacilityId,
    required String facilityId,
  }) async {
    final service = FlutterBackgroundService();
    await operationProgressRepository.upsertJob(
      activityFacilityId: activityFacilityId,
      status: OperationStatuses.queued,
      stageKey: submitStages.first.key,
      completedSteps: 0,
      totalSteps: submitStages.length,
    );

    final reqId = DateTime.now().microsecondsSinceEpoch.toString();
    void send() => service.invoke(kMethodSubmit, {
          'activityFacilityId': activityFacilityId,
          'facilityId': facilityId,
          'reqId': reqId,
        });

    // `flutter_background_service`'s platform channel calls can hang
    // indefinitely rather than throwing when there's no responder (observed
    // under `flutter test`, where no platform implementation is registered
    // at all) — bound them so a genuinely unresponsive channel surfaces as
    // a normal, retryable submission failure instead of stalling forever.
    const channelTimeout = Duration(seconds: 5);
    if (!await service.isRunning().timeout(channelTimeout)) {
      await service.startService().timeout(channelTimeout);
      // On a cold start, `startService()` returns as soon as Android's
      // foreground-service call returns — it does not wait for the new
      // engine/isolate inside the service to finish booting and register
      // its `kMethodSubmit` listener, so an invoke sent immediately after
      // can be silently dropped. Send now, again once the isolate signals
      // it's actually ready, and again via a short timer as a safety net;
      // `onStart`'s reqId dedupe means only the first delivery is acted on.
      StreamSubscription? readySub;
      readySub = service.on(kEvtReady).listen((_) {
        send();
        readySub?.cancel();
      });
      send();
      Timer(const Duration(milliseconds: 200), () {
        send();
        readySub?.cancel();
      });
    } else {
      await ensureAndroidNotificationPermission();
      send();
    }
  }
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  WidgetsFlutterBinding.ensureInitialized();
  DartPluginRegistrant.ensureInitialized();
  await envConfig.initialize();

  if (service is AndroidServiceInstance) {
    service.setAsForegroundService();
    await service.setForegroundNotificationInfo(
      title: 'Submitting installation report',
      content: 'Preparing…',
    );
  }

  String? lastHandledReqId;
  service.on(kMethodSubmit).listen((payload) async {
    final activityFacilityId = payload?['activityFacilityId'] as String?;
    final facilityId = payload?['facilityId'] as String?;
    final reqId = payload?['reqId'] as String?;
    if (activityFacilityId == null || facilityId == null) return;
    if (reqId != null && reqId == lastHandledReqId) return;
    lastHandledReqId = reqId;

    if (service is AndroidServiceInstance) {
      await service.setForegroundNotificationInfo(
        title: 'Submitting installation report',
        content: 'Preparing…',
      );
    }

    try {
      await _performSubmission(
        activityFacilityId: activityFacilityId,
        facilityId: facilityId,
        service: service,
      );
      service.invoke(kEvtDone, {'activityFacilityId': activityFacilityId});
    } catch (e) {
      final current =
          await operationProgressRepository.readJob(activityFacilityId);
      await operationProgressRepository.upsertJob(
        activityFacilityId: activityFacilityId,
        status: OperationStatuses.failed,
        stageKey: current?.stageKey ?? 'preparing_submission',
        completedSteps: current?.completedSteps ?? 0,
        totalSteps: submitStages.length,
        retryCount: (current?.retryCount ?? 0) + 1,
        lastError: e.toString(),
      );
      service.invoke(kEvtError, {
        'activityFacilityId': activityFacilityId,
        'message': e.toString(),
      });
    }
  });

  service.invoke(kEvtReady);
}

Future<void> _reportStage({
  required String activityFacilityId,
  required String stageKey,
  required int completedSteps,
  required ServiceInstance service,
}) async {
  await operationProgressRepository.upsertJob(
    activityFacilityId: activityFacilityId,
    status: OperationStatuses.running,
    stageKey: stageKey,
    completedSteps: completedSteps,
    totalSteps: submitStages.length,
  );
  if (service is AndroidServiceInstance) {
    await service.setForegroundNotificationInfo(
      title: 'Submitting installation report',
      content: stageForKey(stageKey).label,
    );
  }
}

Future<void> _performSubmission({
  required String activityFacilityId,
  required String facilityId,
  required ServiceInstance service,
}) async {
  await _reportStage(
    activityFacilityId: activityFacilityId,
    stageKey: 'preparing_submission',
    completedSteps: 0,
    service: service,
  );

  final raw = await installationCacheRepository.getJson(
      'submission-payload', activityFacilityId);
  if (raw is! Map) {
    throw Exception(
        'No submission data found for this report. Please reopen and submit again.');
  }
  var payload = Map<String, dynamic>.from(raw);
  if (payload['bom'] == null && payload['boms'] is List) {
    throw Exception(
        'This saved submission uses the old page-level BOM format. Reopen the report and submit again to create one merged BOM.');
  }

  await _reportStage(
    activityFacilityId: activityFacilityId,
    stageKey: 'resolving_vendor_org',
    completedSteps: 1,
    service: service,
  );
  final resolvedVendorId = await vendorOrgRepository.currentUserOrgId();
  if (resolvedVendorId == null || resolvedVendorId.trim().isEmpty) {
    throw Exception(
        'No vendor organization is linked to the signed-in user. Ask an administrator to configure the vendor user mapping.');
  }
  final vendorId = resolvedVendorId.trim();

  await _reportStage(
    activityFacilityId: activityFacilityId,
    stageKey: 'uploading_media',
    completedSteps: 2,
    service: service,
  );
  payload = await _uploadPendingMedia(activityFacilityId, payload);

  await _reportStage(
    activityFacilityId: activityFacilityId,
    stageKey: 'submitting_bom',
    completedSteps: 3,
    service: service,
  );
  final rawBom = payload['bom'];
  if (rawBom is Map) {
    final bomEntry = Map<String, dynamic>.from(rawBom);
    final data = bomEntry['data'] is Map
        ? Map<String, dynamic>.from(bomEntry['data'] as Map)
        : const <String, dynamic>{};
    if (bomEntry['required'] == true && data.isEmpty) {
      throw Exception(
          'The bill of materials has no saved form values. Reopen the BOM forms and try again.');
    }
    final missingRequired = missingRequiredBomFields(
      data,
      bomEntry['requiredKeys'] as List<dynamic>? ?? const [],
    );
    if (missingRequired.isNotEmpty) {
      throw Exception(
          'Complete these required BOM fields before submitting: ${missingRequired.join(', ')}.');
    }
    final currentUserId =
        (await SecureStore().getAccessInfo())?.userRequest?.uuid;
    final name = bomEntry['name']?.toString().trim();
    final componentType =
        payload['componentType']?.toString().trim().toUpperCase() ?? 'SOLAR';
    if (name == null || name.isEmpty) {
      throw Exception('The bill of materials name is missing.');
    }
    BillOfMaterial? existing;
    final checkpointId = bomEntry['remoteId']?.toString();
    if (checkpointId?.trim().isNotEmpty == true) {
      existing = BillOfMaterial(id: checkpointId);
    } else {
      final existingBoms = await bomRepository.search(activityFacilityId);
      existing = bomRepository.matchingForSubmission(
        records: existingBoms,
        componentType: componentType,
        name: name,
      );
    }
    if (bomEntry['submitted'] != true || existing == null) {
      final additionalDetails = bomEntry['additionalDetails'] is Map
          ? Map<String, dynamic>.from(bomEntry['additionalDetails'] as Map)
          : <String, dynamic>{};
      additionalDetails['componentType'] = componentType;
      final bom = BillOfMaterial(
        id: existing?.id,
        tenantId: envConfig.variables.tenantId,
        facilityId: facilityId,
        activityFacilityId: activityFacilityId,
        name: name,
        assignUser: currentUserId,
        isActive: true,
        data: data,
        documents: const [],
        additionalDetails: additionalDetails,
      );
      final submitted = existing == null
          ? await bomRepository.create(bom)
          : await bomRepository.update(bom);
      bomEntry
        ..['remoteId'] = submitted.id
        ..['submitted'] = true;
      payload['bom'] = bomEntry;
      await _saveSubmissionPayload(activityFacilityId, payload);
    }
    try {
      await _waitForBom(
        activityFacilityId: activityFacilityId,
        bomId: bomEntry['remoteId']?.toString(),
      );
    } catch (_) {
      // A successful HTTP response only confirms the Kafka publish. Clear the
      // optimistic checkpoint when the row never becomes searchable so Retry
      // can resolve an eventually persisted row or safely create it again.
      bomEntry
        ..['submitted'] = false
        ..remove('remoteId');
      payload['bom'] = bomEntry;
      await _saveSubmissionPayload(activityFacilityId, payload);
      rethrow;
    }
  }

  await _reportStage(
    activityFacilityId: activityFacilityId,
    stageKey: 'submitting_assets',
    completedSteps: 4,
    service: service,
  );
  final assets = (payload['assets'] as List<dynamic>? ?? const [])
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList();
  for (var index = 0; index < assets.length; index++) {
    final asset = assets[index];
    var submission = AssetSubmission.fromCheckpoint(asset);
    if (submission.missingRequiredFields.isNotEmpty) {
      throw Exception(
          'Asset submission is missing ${submission.missingRequiredFields.join(', ')}. Reopen the asset form and try again.');
    }
    if (submission.documents.any((document) => !document.isUploaded)) {
      throw Exception(
          'One or more supporting photos for asset ${submission.serialNumber} were not uploaded.');
    }

    final checkpointId = submission.assetId?.trim();
    if (asset['submitted'] == true && checkpointId?.isNotEmpty == true) {
      final saved = await assetRepository.searchRemote(
        activityFacilityId: activityFacilityId,
        assetId: checkpointId,
      );
      if (saved.isNotEmpty) continue;
    }

    Map<String, dynamic>? existing;
    final matches = await assetRepository.searchRemote(
      activityFacilityId: activityFacilityId,
      serialNumber: submission.serialNumber,
    );
    if (matches.isNotEmpty) existing = matches.first;
    final remoteAssetId =
        (existing?['assetId'] ?? existing?['assetID'])?.toString();
    if (remoteAssetId?.trim().isNotEmpty == true) {
      final existingFileStores =
          (existing?['documents'] as List<dynamic>? ?? const [])
              .whereType<Map>()
              .map((document) => SubmissionDocument.fromJson(
                    Map<String, dynamic>.from(document),
                  ).fileStore)
              .whereType<String>()
              .toSet();
      submission = submission.copyWith(
        assetId: remoteAssetId,
        documents: submission.documents
            .where((document) =>
                document.fileStore == null ||
                !existingFileStores.contains(document.fileStore))
            .toList(),
      );
    }
    Map<String, dynamic> submittedAsset;
    try {
      submittedAsset = await assetRepository.createOrUpdate(
        asset: submission,
        facilityId: facilityId,
        activityFacilityId: activityFacilityId,
        vendorId: vendorId,
      );
    } catch (_) {
      // Match E4H's duplicate-create recovery. The first create may have
      // reached Kafka before the client received its response.
      final duplicate = await assetRepository.searchRemote(
        activityFacilityId: activityFacilityId,
        serialNumber: submission.serialNumber,
      );
      if (duplicate.isEmpty) rethrow;
      final duplicateId =
          (duplicate.first['assetId'] ?? duplicate.first['assetID'])
              ?.toString();
      if (duplicateId == null || duplicateId.trim().isEmpty) rethrow;
      submittedAsset = Map<String, dynamic>.from(duplicate.first);
    }
    asset
      ..['assetId'] =
          (submittedAsset['assetId'] ?? submittedAsset['assetID']).toString()
      ..['submitted'] = true
      ..['documents'] = submission.documents
          .map((document) => document.toCacheJson())
          .toList();
    assets[index] = asset;
    payload['assets'] = assets;
    await _saveSubmissionPayload(activityFacilityId, payload);
  }

  await _reportStage(
    activityFacilityId: activityFacilityId,
    stageKey: 'verifying_assets',
    completedSteps: 5,
    service: service,
  );
  await _waitForAssets(
    activityFacilityId: activityFacilityId,
    expectedSerialNumbers:
        assets.map((asset) => asset['serialNumber']?.toString() ?? '').toSet(),
  );

  await _reportStage(
    activityFacilityId: activityFacilityId,
    stageKey: 'finalizing_workflow_submission',
    completedSteps: 6,
    service: service,
  );
  if (payload['workflowSubmitted'] != true) {
    final workflowDocuments =
        (payload['workflowDocuments'] as List<dynamic>? ?? const [])
            .whereType<Map>()
            .map((document) => SubmissionDocument.fromJson(
                  Map<String, dynamic>.from(document),
                ))
            .toList();
    if (workflowDocuments.any((document) => !document.isUploaded)) {
      throw Exception('One or more workflow documents were not uploaded.');
    }
    await activityFacilityRepository.remote.transitionWorkflow(
      activityFacilityId: activityFacilityId,
      action: payload['workflowAction']?.toString() ?? 'SUBMIT_REPORT',
      documents: workflowDocuments,
    );
    payload['workflowSubmitted'] = true;
    await _saveSubmissionPayload(activityFacilityId, payload);
  }

  await _reportStage(
    activityFacilityId: activityFacilityId,
    stageKey: 'cleaning_up_local_cache',
    completedSteps: 7,
    service: service,
  );
  final draftNamespace =
      payload['kind'] == 'machine' ? 'machine-draft' : 'solar-draft';
  await installationCacheRepository.putJson(
      draftNamespace, activityFacilityId, null);
  await installationCacheRepository.putJson(
      'submission-payload', activityFacilityId, null);

  await operationProgressRepository.upsertJob(
    activityFacilityId: activityFacilityId,
    status: OperationStatuses.success,
    stageKey: 'submission_successful',
    completedSteps: submitStages.length,
    totalSteps: submitStages.length,
  );
}

/// Walks every `documents` array in the payload and uploads any entry that
/// still has a `localPath` (no `remoteId` yet), persisting the updated
/// payload back to cache after each successful upload — if the app is
/// killed mid-upload, a retry resumes without re-uploading what already
/// succeeded.
Future<Map<String, dynamic>> _uploadPendingMedia(
  String activityFacilityId,
  Map<String, dynamic> payload,
) async {
  Future<void> uploadListInPlace(List<dynamic> list) async {
    for (var i = 0; i < list.length; i++) {
      final doc = list[i];
      if (doc is! Map) continue;
      final document = SubmissionDocument.fromJson(
        Map<String, dynamic>.from(doc),
      );
      if (document.isUploaded) continue;
      final localPath = document.localPath;
      if (localPath == null || localPath.isEmpty) continue;
      final fileStoreId = await filestoreRepository.upload(
        localPath,
        module: 'InstallationReport',
      );
      list[i] = document.copyWith(fileStore: fileStoreId).toCacheJson()
        ..remove('localPath');
      await _saveSubmissionPayload(activityFacilityId, payload);
    }
  }

  final workflowDocuments = payload['workflowDocuments'];
  if (workflowDocuments is List) {
    await uploadListInPlace(workflowDocuments);
  }
  for (final asset in (payload['assets'] as List<dynamic>? ?? const [])) {
    if (asset is Map && asset['documents'] is List) {
      await uploadListInPlace(asset['documents'] as List<dynamic>);
    }
  }
  return payload;
}

Future<void> _saveSubmissionPayload(
  String activityFacilityId,
  Map<String, dynamic> payload,
) =>
    installationCacheRepository.putJson(
      'submission-payload',
      activityFacilityId,
      payload,
    );

Future<void> _waitForAssets({
  required String activityFacilityId,
  required Set<String> expectedSerialNumbers,
}) async {
  final expected =
      expectedSerialNumbers.where((value) => value.isNotEmpty).toSet();
  if (expected.isEmpty) return;

  for (var attempt = 0; attempt < 10; attempt++) {
    final remote = await assetRepository.searchRemote(
      activityFacilityId: activityFacilityId,
    );
    final persisted = remote
        .map((asset) => asset['serialNumber']?.toString() ?? '')
        .where((value) => value.isNotEmpty)
        .toSet();
    if (persisted.containsAll(expected)) return;
    if (attempt < 9) await Future<void>.delayed(const Duration(seconds: 1));
  }
  throw Exception(
      'Asset Registry accepted the request but the assets are not searchable yet. Retry will resume safely.');
}

Future<void> _waitForBom({
  required String activityFacilityId,
  required String? bomId,
}) async {
  if (bomId == null || bomId.trim().isEmpty) {
    throw Exception('The submitted bill of materials has no server id.');
  }
  for (var attempt = 0; attempt < 10; attempt++) {
    final records = await bomRepository.searchRemote(activityFacilityId);
    if (records.any((record) => record.id == bomId)) return;
    if (attempt < 9) await Future<void>.delayed(const Duration(seconds: 1));
  }
  throw Exception(
      'The backend accepted the bill of materials but it is not searchable yet. Retry will resume safely.');
}
