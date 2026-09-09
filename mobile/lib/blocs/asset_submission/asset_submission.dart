import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../repositories/operation_progress_repo.dart';
import '../../utils/background_service.dart';
import '../../utils/operation_progress.dart';

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
  }

  final OperationProgressRepository _progressRepo;
  StreamSubscription<OperationProgressModel?>? _jobSub;
  String? _activeWatchId;

  @override
  Future<void> close() async {
    await _jobSub?.cancel();
    return super.close();
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
