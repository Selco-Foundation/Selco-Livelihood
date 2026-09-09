/// Trimmed, submit-only port of e4h's `operation_progress.dart` — this app
/// has no reject/send-back/AMC operations yet, so only the submit pipeline
/// is modeled.
class OperationTypes {
  static const submit = 'submit';
}

class OperationStatuses {
  static const queued = 'queued';
  static const running = 'running';
  static const success = 'success';
  static const failed = 'failed';
}

class OperationStage {
  const OperationStage(this.key, this.label);

  final String key;
  final String label;
}

class OperationProgressModel {
  const OperationProgressModel({
    required this.activityFacilityId,
    required this.operationType,
    required this.status,
    required this.stageKey,
    required this.stageLabel,
    required this.completedSteps,
    required this.totalSteps,
    required this.progressPercent,
    required this.retryCount,
    this.errorMessage,
  });

  final String activityFacilityId;
  final String operationType;
  final String status;
  final String stageKey;
  final String stageLabel;
  final int completedSteps;
  final int totalSteps;
  final int progressPercent;
  final int retryCount;
  final String? errorMessage;

  bool get isActive =>
      status == OperationStatuses.queued || status == OperationStatuses.running;
  bool get isSuccess => status == OperationStatuses.success;
  bool get isFailure => status == OperationStatuses.failed;
  bool get canRetry => isFailure;
}

/// Order here drives both `totalSteps` and the fraction shown on the sync
/// screen. `resolving_vendor_org` and `uploading_media` are skipped at
/// runtime when there's nothing to do for that submission (no media, or the
/// org id is already cached) — the background service still reports them so
/// the stage list stays a stable reference for `stageForKey`.
const List<OperationStage> submitStages = [
  OperationStage('preparing_submission', 'Preparing submission'),
  OperationStage('resolving_vendor_org', 'Resolving vendor organization'),
  OperationStage('uploading_media', 'Uploading photos and videos'),
  OperationStage('submitting_bom', 'Submitting bill of materials'),
  OperationStage('submitting_assets', 'Submitting assets'),
  OperationStage(
      'finalizing_workflow_submission', 'Finalizing workflow submission'),
  OperationStage('cleaning_up_local_cache', 'Cleaning up local cache'),
  OperationStage('submission_successful', 'Submission successful'),
];

OperationStage stageForKey(String stageKey) => submitStages.firstWhere(
      (stage) => stage.key == stageKey,
      orElse: () => OperationStage(stageKey, stageKey),
    );

int progressPercent({
  required int completedSteps,
  required int totalSteps,
}) {
  if (totalSteps <= 0) return 0;
  final raw = ((completedSteps / totalSteps) * 100).round();
  if (raw < 0) return 0;
  if (raw > 100) return 100;
  return raw;
}
