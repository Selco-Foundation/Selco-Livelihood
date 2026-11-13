import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:synchronized/synchronized.dart';

import '../../data/network_manager.dart';
import '../../data/secure_storage/secureStore.dart';
import '../../model/amc/scheduled_visit.dart';
import '../../utils/envConfig.dart';
import 'amc_dynamic_form_repo.dart';
import 'amc_remote_data_source.dart';

/// Pre-report "system status" answers for one AMC activity (#247):
/// "Is the end user using the system?" and "Is the system functional?".
///
/// They are not part of the MDMS form. They are kept on the device until the
/// report is submitted, then sent with `SUBMIT_VISIT_REPORT` in
/// `visitReport.additionalDetails.systemStatus`, which is also where they are
/// read back from for rework and read-only views.
///
/// Saving "not functional" sends a status update to the backend so the
/// Program POC is emailed. If the device is offline (or the request cannot
/// reach the server) the update is queued on the device and sent
/// automatically once it is back online, whatever has happened to the
/// activity meanwhile (e.g. reassignment); the backend decides what to do
/// with it.
@immutable
class AmcSystemStatus {
  const AmcSystemStatus({
    this.isSystemInUse,
    this.isSystemFunctional,
    this.nonFunctionalNotified = false,
  });

  final bool? isSystemInUse;
  final bool? isSystemFunctional;

  /// The Program POC notification for this activity was sent, or queued to
  /// be sent when the device is online. Kept (locally and in the submitted
  /// report) so it is never requested twice.
  final bool nonFunctionalNotified;

  static const String inUseKey = 'isSystemInUse';
  static const String functionalKey = 'isSystemFunctional';
  static const String notifiedKey = 'nonFunctionalNotified';

  bool get isComplete => isSystemInUse != null && isSystemFunctional != null;

  Map<String, dynamic> toJson() => {
        inUseKey: isSystemInUse,
        functionalKey: isSystemFunctional,
        notifiedKey: nonFunctionalNotified,
      };

  static AmcSystemStatus? fromJson(Object? json) {
    if (json is! Map) return null;
    final inUse = json[inUseKey];
    final functional = json[functionalKey];
    if (inUse is! bool && functional is! bool) return null;
    return AmcSystemStatus(
      isSystemInUse: inUse is bool ? inUse : null,
      isSystemFunctional: functional is bool ? functional : null,
      nonFunctionalNotified: json[notifiedKey] == true,
    );
  }
}

/// Outcome of saving the answers, for the screen's message.
enum AmcSystemStatusSaveResult {
  /// Saved; no notification needed (functional, or already notified).
  saved,

  /// Saved and the non-functional status was sent to the backend.
  notified,

  /// Saved; the device is offline, so the update was queued and will be
  /// sent automatically when it is back online.
  queued,

  /// Saved, but the server rejected the update (not a connectivity
  /// problem). Not queued: saving again retries.
  notifyFailed,
}

/// Device-wide queue of status updates waiting to be sent. Kept apart from
/// each activity's local data, so it survives the visit's cleanup after the
/// completion code and any reassignment. Not cleared on logout.
abstract class AmcSystemStatusQueueStore {
  Future<List<Map<String, dynamic>>> read();
  Future<void> write(List<Map<String, dynamic>> items);
}

class _SecureStorageQueueStore implements AmcSystemStatusQueueStore {
  static const _key = 'amcPendingSystemStatusUpdates';

  @override
  Future<List<Map<String, dynamic>>> read() async {
    final raw = await SecureStore().storage.read(key: _key);
    if (raw == null || raw.isEmpty) return [];
    final decoded = jsonDecode(raw);
    return decoded is List
        ? decoded
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : [];
  }

  @override
  Future<void> write(List<Map<String, dynamic>> items) =>
      SecureStore().storage.write(key: _key, value: jsonEncode(items));
}

/// True when a failed request should be queued and retried later: no
/// response at all (offline, DNS, timeout), a server error (5xx), or an
/// auth/rate-limit status. A 4xx rejection is final.
bool isRetryableSystemStatusError(Object error) {
  if (error is DioException) {
    final status = error.response?.statusCode;
    if (status == null) return true;
    return status >= 500 || status == 401 || status == 408 || status == 429;
  }
  return error is NetworkException ||
      error is SocketException ||
      error is TimeoutException;
}

Future<bool> _defaultIsOnline() async {
  try {
    return await NetworkService().hasNetwork();
  } catch (_) {
    return false;
  }
}

Future<bool> _defaultHasSession() async {
  try {
    final token = await SecureStore().getAccessToken();
    return token != null && token.isNotEmpty;
  } catch (_) {
    return false;
  }
}

enum _SendOutcome { sent, retryLater, rejected }

/// Where the answers live on the device. The default stores them in the
/// AMC form-values table under their own entry key
/// (`<visitId>::AMC_SYSTEM_STATUS`), separate from the MDMS form answers
/// (`<visitId>::AMC`), so the form, its "Resume" state and its submission
/// are unaffected. They are cleared with the rest of the visit's local data
/// after the completion code is verified.
abstract class AmcSystemStatusLocalStore {
  Future<Map<String, dynamic>?> read(String visitId);
  Future<void> write(String visitId, Map<String, dynamic> value);
}

const String amcSystemStatusUserType = 'AMC_SYSTEM_STATUS';

/// Key inside `visitReport.additionalDetails`.
const String amcSystemStatusDetailsKey = 'systemStatus';

class _IsarAmcSystemStatusStore implements AmcSystemStatusLocalStore {
  final _repo = AmcDynamicFormRepository();

  @override
  Future<Map<String, dynamic>?> read(String visitId) =>
      _repo.getScheduledVisitFormKV(
          scheduledVisitId: visitId, userType: amcSystemStatusUserType);

  @override
  Future<void> write(String visitId, Map<String, dynamic> value) =>
      _repo.mergeKvForEntryKey(
          scheduledVisitId: visitId,
          userType: amcSystemStatusUserType,
          kvUpdate: value);
}

class AmcSystemStatusRepository {
  AmcSystemStatusRepository({
    AmcSystemStatusLocalStore? store,
    AmcSystemStatusQueueStore? queue,
    AmcRemoteDataSource? dataSource,
    Future<bool> Function()? isOnline,
    Future<bool> Function()? hasSession,
  })  : _store = store ?? _IsarAmcSystemStatusStore(),
        _queue = queue ?? _SecureStorageQueueStore(),
        _dataSource = dataSource,
        _isOnline = isOnline ?? _defaultIsOnline,
        _hasSession = hasSession ?? _defaultHasSession;

  final AmcSystemStatusLocalStore _store;
  final AmcSystemStatusQueueStore _queue;
  final AmcRemoteDataSource? _dataSource;
  final Future<bool> Function() _isOnline;
  final Future<bool> Function() _hasSession;

  /// Serialises queue reads/writes and flushes within this isolate.
  static final _queueLock = Lock();

  AmcRemoteDataSource get _remote => _dataSource ?? amcRemoteDataSource;

  /// Answers from the last submitted report (rework / read-only views).
  static AmcSystemStatus? fromSubmittedReport(ScheduledVisit visit) =>
      AmcSystemStatus.fromJson(
          visit.visitReport?.additionalDetails?[amcSystemStatusDetailsKey]);

  /// Answers saved on this device for [visitId], if any.
  Future<AmcSystemStatus?> readLocal(String visitId) async {
    try {
      return AmcSystemStatus.fromJson(await _store.read(visitId));
    } catch (e) {
      debugPrint('AmcSystemStatusRepository.readLocal error=$e');
      return null;
    }
  }

  /// Answers to show when the screen opens: this device's unsent answers
  /// first, otherwise those from the last submitted report.
  Future<AmcSystemStatus?> load(ScheduledVisit visit) async {
    final id = visit.id;
    final local = id == null ? null : await readLocal(id);
    return local ?? fromSubmittedReport(visit);
  }

  /// Saves both answers. When the system is not functional and the Program
  /// POC was not already notified for this activity (on this device or in
  /// the submitted report), sends the status update once, or queues it if
  /// the device is offline.
  Future<AmcSystemStatusSaveResult> save({
    required ScheduledVisit visit,
    required bool isSystemInUse,
    required bool isSystemFunctional,
  }) async {
    final visitId = visit.id!;
    final local = await readLocal(visitId);
    final alreadyNotified = local?.nonFunctionalNotified == true ||
        fromSubmittedReport(visit)?.nonFunctionalNotified == true;

    var status = AmcSystemStatus(
      isSystemInUse: isSystemInUse,
      isSystemFunctional: isSystemFunctional,
      nonFunctionalNotified: alreadyNotified,
    );
    await _store.write(visitId, status.toJson());

    if (isSystemFunctional || alreadyNotified) {
      return AmcSystemStatusSaveResult.saved;
    }

    final body = buildSystemStatusRequest(
      visitId: visitId,
      isSystemInUse: isSystemInUse,
      isSystemFunctional: isSystemFunctional,
    );
    final outcome =
        await _isOnline() ? await _send(body) : _SendOutcome.retryLater;
    if (outcome == _SendOutcome.rejected) {
      return AmcSystemStatusSaveResult.notifyFailed;
    }
    if (outcome == _SendOutcome.retryLater) await _enqueue(body);

    status = AmcSystemStatus(
      isSystemInUse: isSystemInUse,
      isSystemFunctional: isSystemFunctional,
      nonFunctionalNotified: true,
    );
    await _store.write(visitId, status.toJson());
    return outcome == _SendOutcome.sent
        ? AmcSystemStatusSaveResult.notified
        : AmcSystemStatusSaveResult.queued;
  }

  Future<_SendOutcome> _send(Map<String, dynamic> body) async {
    try {
      await _remote.updateSystemStatus(body);
      return _SendOutcome.sent;
    } catch (e) {
      debugPrint('AmcSystemStatusRepository.updateSystemStatus error=$e');
      return isRetryableSystemStatusError(e)
          ? _SendOutcome.retryLater
          : _SendOutcome.rejected;
    }
  }

  Future<void> _enqueue(Map<String, dynamic> body) =>
      _queueLock.synchronized(() async {
        final items = await _queue.read();
        // One pending update per activity.
        items.removeWhere((i) => i['visitId'] == body['visitId']);
        items.add(body);
        await _queue.write(items);
      });

  /// Status updates still waiting to be sent from this device.
  Future<List<Map<String, dynamic>>> pendingUpdates() =>
      _queueLock.synchronized(_queue.read);

  /// Sends queued updates, oldest first, if the device is online and a user
  /// is logged in. Stops at the first connectivity failure and keeps the
  /// rest; drops an update the server rejects outright. Returns how many
  /// were sent.
  Future<int> flushQueue() async {
    if (!await _hasSession() || !await _isOnline()) return 0;
    return _queueLock.synchronized(() async {
      final items = await _queue.read();
      if (items.isEmpty) return 0;
      var sent = 0;
      final remaining = <Map<String, dynamic>>[];
      for (var i = 0; i < items.length; i++) {
        final outcome = await _send(items[i]);
        if (outcome == _SendOutcome.retryLater) {
          remaining.addAll(items.sublist(i));
          break;
        }
        if (outcome == _SendOutcome.sent) sent++;
        if (outcome == _SendOutcome.rejected) {
          debugPrint('Dropping rejected AMC system status update '
              'for visit ${items[i]['visitId']}');
        }
      }
      await _queue.write(remaining);
      return sent;
    });
  }

  /// `visitReport.additionalDetails` for `SUBMIT_VISIT_REPORT`, or null if
  /// no answers were saved on this device.
  Future<Map<String, dynamic>?> reportAdditionalDetails(String visitId) async {
    final local = await readLocal(visitId);
    if (local == null) return null;
    return {amcSystemStatusDetailsKey: local.toJson()};
  }
}

/// DUMMY-BACKEND: request body for the system-status update. The backend
/// contract is not defined yet; replace the fields here (and the path in
/// `ApiPaths.amcVisitSystemStatusUpdate`) when it is.
Map<String, dynamic> buildSystemStatusRequest({
  required String visitId,
  required bool isSystemInUse,
  required bool isSystemFunctional,
}) =>
    {
      'tenantId': envConfig.variables.tenantId,
      'visitId': visitId,
      amcSystemStatusDetailsKey: {
        AmcSystemStatus.inUseKey: isSystemInUse,
        AmcSystemStatus.functionalKey: isSystemFunctional,
      },
    };
