import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../repositories/operation_progress_repo.dart';
import '../../utils/background_service.dart';
import '../../utils/operation_progress.dart';
import '../../repositories/pending_submission_repository.dart';

sealed class AssetSubmissionEvent {
  const AssetSubmissionEvent();
}

class SubmitAll extends AssetSubmissionEvent {
  const SubmitAll({required this.activityFacilityId, required this.facilityId});

  final String activityFacilityId;
  final String facilityId;
}

class RetrySubmission extends AssetSubmissionEvent {
  const RetrySubmission({
    required this.activityFacilityId,
    required this.facilityId,
  });

  final String activityFacilityId;
  final String facilityId;
}

class WatchSubmission extends AssetSubmissionEvent {
  const WatchSubmission(this.activityFacilityId);

  final String activityFacilityId;
}

class _JobChanged extends AssetSubmissionEvent {
  const _JobChanged(this.job);

  final OperationProgressModel? job;
}

class DismissSubmission extends AssetSubmissionEvent {
  const DismissSubmission();
}

class SubmitAllPending extends AssetSubmissionEvent {
  const SubmitAllPending();
}

class _BulkJobsChanged extends AssetSubmissionEvent {
  const _BulkJobsChanged(this.jobs);
  final List<OperationProgressModel> jobs;
}

class DismissBulkSubmission extends AssetSubmissionEvent {
  const DismissBulkSubmission();
}

sealed class AssetSubmissionState {
  const AssetSubmissionState();
}

class AssetSubmissionInitial extends AssetSubmissionState {
  const AssetSubmissionInitial();
}

class AssetSubmissionInProgress extends AssetSubmissionState {
  const AssetSubmissionInProgress(this.progress);

  final OperationProgressModel progress;
}

class AssetSubmissionFailure extends AssetSubmissionState {
  const AssetSubmissionFailure(this.progress);

  final OperationProgressModel progress;
}

class AssetSubmissionSuccess extends AssetSubmissionState {
  const AssetSubmissionSuccess();
}

class BulkSubmissionProgress extends AssetSubmissionState {
  const BulkSubmissionProgress({
    required this.completed,
    required this.total,
    required this.progressPercent,
    required this.activeCount,
    required this.failedCount,
    required this.label,
  });

  final int completed;
  final int total;
  final int progressPercent;
  final int activeCount;
  final int failedCount;
  final String label;

  bool get isTerminal => total > 0 && completed + failedCount >= total;
  bool get isSuccessful => total > 0 && completed == total;
}

/// Drives one submission job's lifecycle end to end: kicks off the
/// background service, then watches `CacheSubmissionJob` (via
/// [OperationProgressRepository.watchJob]) to mirror its progress into bloc
/// states the sync-loading screen renders. One job at a time — this app has
/// no bulk "sync all drafts" surface yet.
class AssetSubmissionBloc
    extends Bloc<AssetSubmissionEvent, AssetSubmissionState> {
  AssetSubmissionBloc({OperationProgressRepository? progressRepository})
      : _progressRepo = progressRepository ?? operationProgressRepository,
        super(const AssetSubmissionInitial()) {
    on<SubmitAll>(_onSubmitAll);
    on<RetrySubmission>(_onRetry);
    on<WatchSubmission>(_onWatch);
    on<_JobChanged>(_onJobChanged);
    on<DismissSubmission>(_onDismiss);
    on<SubmitAllPending>(_onSubmitAllPending);
    on<_BulkJobsChanged>(_onBulkJobsChanged);
    on<DismissBulkSubmission>(_onDismissBulk);
  }

  final OperationProgressRepository _progressRepo;
  StreamSubscription<OperationProgressModel?>? _jobSub;
  String? _activeWatchId;
  Set<String> _bulkIds = const {};
  final List<StreamSubscription<OperationProgressModel?>> _bulkSubs = [];
  final Map<String, OperationProgressModel> _bulkJobs = {};

  @override
  Future<void> close() async {
    await _jobSub?.cancel();
    for (final subscription in _bulkSubs) {
      await subscription.cancel();
    }
    return super.close();
  }

  Future<void> _onSubmitAllPending(
    SubmitAllPending event,
    Emitter<AssetSubmissionState> emit,
  ) async {
    final records = (await pendingSubmissionRepository.readAll(
            state: PendingSubmissionState.pendingApproval))
        .where((record) => record.canSync)
        .toList();
    _bulkIds = records.map((record) => record.activityFacilityId).toSet();
    await _jobSub?.cancel();
    for (final subscription in _bulkSubs) {
      await subscription.cancel();
    }
    _bulkSubs.clear();
    _bulkJobs.clear();
    if (_bulkIds.isEmpty) {
      emit(const BulkSubmissionProgress(
        completed: 0,
        total: 0,
        progressPercent: 0,
        activeCount: 0,
        failedCount: 0,
        label: '',
      ));
      return;
    }
    emit(BulkSubmissionProgress(
      completed: 0,
      total: records.length,
      progressPercent: 0,
      activeCount: records.length,
      failedCount: 0,
      label: submitStages.first.label,
    ));
    for (final id in _bulkIds) {
      _bulkSubs.add(_progressRepo.watchJob(id).listen((job) {
        if (job == null) {
          _bulkJobs.remove(id);
        } else {
          _bulkJobs[id] = job;
        }
        add(_BulkJobsChanged(_bulkJobs.values.toList()));
      }));
    }
    for (final record in records) {
      final job = await _progressRepo.readJob(record.activityFacilityId);
      if (job?.isActive == true) continue;
      if (job?.isSuccess == true) {
        await pendingSubmissionRepository
            .markSubmissionCompleted(record.activityFacilityId);
        continue;
      }
      try {
        await BackgroundServiceController.I.enqueueSubmission(
          activityFacilityId: record.activityFacilityId,
          facilityId: record.facilityId,
        );
      } catch (e) {
        await _progressRepo.upsertJob(
          activityFacilityId: record.activityFacilityId,
          status: OperationStatuses.failed,
          stageKey: submitStages.first.key,
          completedSteps: 0,
          totalSteps: submitStages.length,
          lastError: e.toString(),
        );
      }
    }
  }

  Future<void> _onBulkJobsChanged(
    _BulkJobsChanged event,
    Emitter<AssetSubmissionState> emit,
  ) async {
    if (_bulkIds.isEmpty) return;
    final byId = {for (final job in event.jobs) job.activityFacilityId: job};
    final jobs = _bulkIds
        .map((id) => byId[id])
        .whereType<OperationProgressModel>()
        .toList();
    final completed = jobs.where((job) => job.isSuccess).length;
    final failed = jobs.where((job) => job.isFailure).length;
    final active = jobs.where((job) => job.isActive).length;
    final percent = _bulkIds.isEmpty
        ? 0
        : (jobs.fold<int>(0, (sum, job) => sum + job.progressPercent) /
                _bulkIds.length)
            .round();
    final current = jobs.where((job) => job.isActive).firstOrNull ??
        jobs.where((job) => job.isFailure).firstOrNull;
    emit(BulkSubmissionProgress(
      completed: completed,
      total: _bulkIds.length,
      progressPercent: percent,
      activeCount: active,
      failedCount: failed,
      label: current?.stageLabel ?? '',
    ));
  }

  Future<void> _onDismissBulk(
    DismissBulkSubmission event,
    Emitter<AssetSubmissionState> emit,
  ) async {
    for (final subscription in _bulkSubs) {
      await subscription.cancel();
    }
    _bulkSubs.clear();
    _bulkJobs.clear();
    _bulkIds = const {};
    emit(const AssetSubmissionInitial());
  }

  Future<void> _onWatch(
    WatchSubmission event,
    Emitter<AssetSubmissionState> emit,
  ) async {
    _activeWatchId = event.activityFacilityId;
    await _jobSub?.cancel();
    _jobSub = _progressRepo.watchJob(event.activityFacilityId).listen((job) {
      add(_JobChanged(job));
    });
  }

  Future<void> _onSubmitAll(
    SubmitAll event,
    Emitter<AssetSubmissionState> emit,
  ) async {
    add(WatchSubmission(event.activityFacilityId));
    try {
      await BackgroundServiceController.I.enqueueSubmission(
        activityFacilityId: event.activityFacilityId,
        facilityId: event.facilityId,
      );
    } catch (e) {
      // Starting the OS-level background service can genuinely fail (e.g.
      // Android background-start restrictions) — surface it the same way a
      // failed pipeline stage would, rather than crashing the bloc.
      await _progressRepo.upsertJob(
        activityFacilityId: event.activityFacilityId,
        status: OperationStatuses.failed,
        stageKey: submitStages.first.key,
        completedSteps: 0,
        totalSteps: submitStages.length,
        lastError: e.toString(),
      );
    }
  }

  Future<void> _onRetry(
    RetrySubmission event,
    Emitter<AssetSubmissionState> emit,
  ) =>
      _onSubmitAll(
        SubmitAll(
          activityFacilityId: event.activityFacilityId,
          facilityId: event.facilityId,
        ),
        emit,
      );

  Future<void> _onDismiss(
    DismissSubmission event,
    Emitter<AssetSubmissionState> emit,
  ) async {
    emit(const AssetSubmissionInitial());
  }

  Future<void> _onJobChanged(
    _JobChanged event,
    Emitter<AssetSubmissionState> emit,
  ) async {
    final job = event.job;
    if (job == null || job.activityFacilityId != _activeWatchId) return;

    if (job.isFailure) {
      emit(AssetSubmissionFailure(job));
    } else if (job.isSuccess) {
      emit(const AssetSubmissionSuccess());
    } else {
      emit(AssetSubmissionInProgress(job));
    }
  }
}
