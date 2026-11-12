import 'package:flutter/foundation.dart';

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
@immutable
class AmcSystemStatus {
  const AmcSystemStatus({
    this.isSystemInUse,
    this.isSystemFunctional,
    this.nonFunctionalNotified = false,
  });

  final bool? isSystemInUse;
  final bool? isSystemFunctional;

  /// The Program POC notification was sent successfully for this activity.
  /// Kept (locally and in the submitted report) so it is never sent twice.
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

  /// Saved, but sending the non-functional status failed (e.g. offline).
  /// Not retained: saving again retries.
  notifyFailed,
}

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
    AmcRemoteDataSource? dataSource,
  })  : _store = store ?? _IsarAmcSystemStatusStore(),
        _dataSource = dataSource;

  final AmcSystemStatusLocalStore _store;
  final AmcRemoteDataSource? _dataSource;

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
  /// the submitted report), sends the status update once.
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

    try {
      await _remote.updateSystemStatus(buildSystemStatusRequest(
        visitId: visitId,
        isSystemInUse: isSystemInUse,
        isSystemFunctional: isSystemFunctional,
      ));
    } catch (e) {
      debugPrint('AmcSystemStatusRepository.updateSystemStatus error=$e');
      return AmcSystemStatusSaveResult.notifyFailed;
    }

    status = AmcSystemStatus(
      isSystemInUse: isSystemInUse,
      isSystemFunctional: isSystemFunctional,
      nonFunctionalNotified: true,
    );
    await _store.write(visitId, status.toJson());
    return AmcSystemStatusSaveResult.notified;
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
