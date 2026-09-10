import 'dart:async';
import 'dart:io';
import 'dart:ui' show DartPluginRegistrant;

import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../data/secure_storage/secureStore.dart';
import '../model/bom/bom.dart';
import '../repositories/activity_facility_repo.dart';
import '../repositories/asset_repository.dart';
import '../repositories/bom_repository.dart';
import '../repositories/filestore_repository.dart';
import '../repositories/installation_cache_repo.dart';
import '../repositories/operation_progress_repo.dart';
import '../repositories/vendor_org_repository.dart';
import 'envConfig.dart';
import 'operation_progress.dart';

const String kMethodSubmit = 'submit';
const String kEvtDone = 'submission_done';
const String kEvtError = 'submission_error';

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

    // `flutter_background_service`'s platform channel calls can hang
    // indefinitely rather than throwing when there's no responder (observed
    // under `flutter test`, where no platform implementation is registered
    // at all) — bound them so a genuinely unresponsive channel surfaces as
    // a normal, retryable submission failure instead of stalling forever.
    const channelTimeout = Duration(seconds: 5);
    if (!await service.isRunning().timeout(channelTimeout)) {
      await service.startService().timeout(channelTimeout);
    } else {
      await ensureAndroidNotificationPermission();
    }
    service.invoke(kMethodSubmit, {
      'activityFacilityId': activityFacilityId,
      'facilityId': facilityId,
    });
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

  service.on(kMethodSubmit).listen((payload) async {
    final activityFacilityId = payload?['activityFacilityId'] as String?;
    final facilityId = payload?['facilityId'] as String?;
    if (activityFacilityId == null || facilityId == null) return;

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
      await operationProgressRepository.upsertJob(
        activityFacilityId: activityFacilityId,
        status: OperationStatuses.failed,
        stageKey: 'preparing_submission',
        completedSteps: 0,
        totalSteps: submitStages.length,
        lastError: e.toString(),
      );
      service.invoke(kEvtError, {
        'activityFacilityId': activityFacilityId,
        'message': e.toString(),
      });
    }
  });
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

  final raw =
      await installationCacheRepository.getJson('submission-payload', activityFacilityId);
  if (raw is! Map) {
    throw Exception('No submission data found for this report. Please reopen and submit again.');
  }
  var payload = Map<String, dynamic>.from(raw);

  await _reportStage(
    activityFacilityId: activityFacilityId,
    stageKey: 'resolving_vendor_org',
    completedSteps: 1,
    service: service,
  );
  final vendorId = await vendorOrgRepository.currentUserOrgId();

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
  final boms = (payload['boms'] as List<dynamic>? ?? const [])
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList();
  if (boms.isNotEmpty) {
    final currentUserId =
        (await SecureStore().getAccessInfo())?.userRequest?.uuid;
    final existingBoms = await bomRepository.search(activityFacilityId);
    for (final bomEntry in boms) {
      final name = bomEntry['name']?.toString();
      BillOfMaterial? existing;
      if (name != null) {
        for (final item in existingBoms) {
          if (item.name == name) {
            existing = item;
            break;
          }
        }
      }
      final documents = (bomEntry['documents'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((doc) => {
                'documentType': doc['documentType'],
                'fileStoreId': doc['remoteId'],
              })
          .toList();
      final bom = BillOfMaterial(
        id: existing?.id,
        tenantId: envConfig.variables.tenantId,
        facilityId: facilityId,
        activityFacilityId: activityFacilityId,
        name: name,
        assignUser: currentUserId,
        isActive: true,
        data: bomEntry['data'] is Map
            ? Map<String, dynamic>.from(bomEntry['data'] as Map)
            : const {},
        documents: documents,
      );
      // `_update` rejects an id the backend has never seen — only call it
      // once a matching BOM (by name) was actually found; otherwise create.
      if (existing == null) {
        await bomRepository.create(bom);
      } else {
        await bomRepository.update(bom);
      }
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
  for (final asset in assets) {
    final documents = (asset['documents'] as List<dynamic>? ?? const [])
        .whereType<Map>()
        .map((doc) => {
              'documentType': doc['documentType'],
              'fileStoreId': doc['remoteId'],
            })
        .toList();
    await assetRepository.create({
      'tenantId': envConfig.variables.tenantId,
      'system': asset['system'],
      'facilityID': facilityId,
      'activityFacilityID': activityFacilityId,
      'assetTypeID': asset['assetTypeID'],
      'serialNumber': asset['serialNumber'],
      'modelNumber': asset['modelNumber'],
      'brandID': asset['brandID'],
      'itemCode': asset['itemCode'],
      'name': asset['name'],
      'vendorId': vendorId,
      'isOperational': true,
      'isActive': true,
      'warrantyStartDate': asset['warrantyStartDate'],
      'warrantyDuration': asset['warrantyDurationYears'],
      'assetDetails': asset['assetDetails'],
      'documents': documents,
    });
  }

  await _reportStage(
    activityFacilityId: activityFacilityId,
    stageKey: 'finalizing_workflow_submission',
    completedSteps: 5,
    service: service,
  );
  await activityFacilityRepository.remote.transitionWorkflow(
    activityFacilityId: activityFacilityId,
    action: payload['workflowAction']?.toString() ?? 'SUBMIT_REPORT',
  );

  await _reportStage(
    activityFacilityId: activityFacilityId,
    stageKey: 'cleaning_up_local_cache',
    completedSteps: 6,
    service: service,
  );
  final draftNamespace =
      payload['kind'] == 'machine' ? 'machine-draft' : 'solar-draft';
  await installationCacheRepository.putJson(draftNamespace, activityFacilityId, null);
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
      if (doc['remoteId'] != null) continue;
      final localPath = doc['localPath']?.toString();
      if (localPath == null || localPath.isEmpty) continue;
      final fileStoreId = await filestoreRepository.upload(
        localPath,
        module: 'InstallationReport',
      );
      list[i] = {
        'documentType': doc['documentType'],
        'remoteId': fileStoreId,
      };
      await installationCacheRepository.putJson(
          'submission-payload', activityFacilityId, payload);
    }
  }

  for (final bom in (payload['boms'] as List<dynamic>? ?? const [])) {
    if (bom is Map && bom['documents'] is List) {
      await uploadListInPlace(bom['documents'] as List<dynamic>);
    }
  }
  for (final asset in (payload['assets'] as List<dynamic>? ?? const [])) {
    if (asset is Map && asset['documents'] is List) {
      await uploadListInPlace(asset['documents'] as List<dynamic>);
    }
  }
  return payload;
}
