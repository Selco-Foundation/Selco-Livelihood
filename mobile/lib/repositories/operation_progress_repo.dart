import 'package:isar/isar.dart';

import '../data/nosql/cache_submission_job.dart';
import '../utils/constants.dart';
import '../utils/operation_progress.dart';

/// Reads/writes `CacheSubmissionJob` rows. Called from both isolates: the
/// background isolate (`lib/utils/background_service.dart`) writes as the
/// pipeline advances; the UI isolate watches via [watchJob]. Isar's named
/// instance is safely shared across isolates, so no message-passing layer
/// sits between the two.
class OperationProgressRepository {
  /// Capped like `ActivityFacilityRepository._isar` so a slow/unavailable
  /// Isar instance degrades quickly rather than hanging the caller.
  Future<Isar> get _isar =>
      Constants().isar.timeout(const Duration(seconds: 2));

  /// Best-effort: a write failure (e.g. Isar unavailable) shouldn't crash
  /// the submission pipeline over a progress row it can't persist.
  Future<void> upsertJob({
    required String activityFacilityId,
    required String status,
    required String stageKey,
    required int completedSteps,
    required int totalSteps,
    int retryCount = 0,
    String? lastError,
  }) async {
    try {
      final isar = await _isar;
      await isar.writeTxn(() async {
        final existing = await isar.cacheSubmissionJobs
            .filter()
            .activityFacilityIdEqualTo(activityFacilityId)
            .findFirst();
        final row = existing ?? CacheSubmissionJob();
        row
          ..activityFacilityId = activityFacilityId
          ..operationType = OperationTypes.submit
          ..status = status
          ..stageKey = stageKey
          ..stageLabel = stageForKey(stageKey).label
          ..completedSteps = completedSteps
          ..totalSteps = totalSteps
          ..progressPercent = progressPercent(
            completedSteps: completedSteps,
            totalSteps: totalSteps,
          )
          ..retryCount = retryCount
          ..lastError = lastError
          ..updatedAt = DateTime.now();
        await isar.cacheSubmissionJobs.put(row);
      });
    } catch (_) {
      // Best-effort — see doc comment above.
    }
  }

  Future<OperationProgressModel?> readJob(String activityFacilityId) async {
    try {
      final isar = await _isar;
      final row = await isar.cacheSubmissionJobs
          .filter()
          .activityFacilityIdEqualTo(activityFacilityId)
          .findFirst();
      return row == null ? null : _toModel(row);
    } catch (_) {
      return null;
    }
  }

  /// A broken/unavailable Isar degrades to a stream that reports `null`
  /// once and then stays silent, rather than throwing into the caller
  /// (`AssetSubmissionBloc`'s subscription would otherwise crash the bloc).
  Stream<OperationProgressModel?> watchJob(String activityFacilityId) async* {
    try {
      final isar = await _isar;
      final query = isar.cacheSubmissionJobs
          .filter()
          .activityFacilityIdEqualTo(activityFacilityId);
      final initial = await query.findFirst();
      yield initial == null ? null : _toModel(initial);
      yield* query
          .watch(fireImmediately: false)
          .asyncMap((rows) => rows.isEmpty ? null : rows.first)
          .map((row) => row == null ? null : _toModel(row));
    } catch (_) {
      yield null;
    }
  }

  Future<void> clearJob(String activityFacilityId) async {
    try {
      final isar = await _isar;
      await isar.writeTxn(() async {
        final existing = await isar.cacheSubmissionJobs
            .filter()
            .activityFacilityIdEqualTo(activityFacilityId)
            .findFirst();
        if (existing != null) {
          await isar.cacheSubmissionJobs.delete(existing.id);
        }
      });
    } catch (_) {
      // Best-effort — see upsertJob's doc comment.
    }
  }

  OperationProgressModel _toModel(CacheSubmissionJob row) =>
      OperationProgressModel(
        activityFacilityId: row.activityFacilityId,
        operationType: row.operationType,
        status: row.status,
        stageKey: row.stageKey,
        stageLabel: row.stageLabel,
        completedSteps: row.completedSteps,
        totalSteps: row.totalSteps,
        progressPercent: row.progressPercent,
        retryCount: row.retryCount,
        errorMessage: row.lastError,
      );
}

final operationProgressRepository = OperationProgressRepository();
