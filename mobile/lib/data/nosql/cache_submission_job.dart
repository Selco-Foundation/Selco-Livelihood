import 'package:isar/isar.dart';

part 'cache_submission_job.g.dart';

/// One row per in-flight/most-recent submission job for an activity
/// facility, written directly by the background isolate
/// (`lib/utils/background_service.dart`) and watched reactively by the UI
/// isolate (`lib/repositories/operation_progress_repo.dart`). Isar supports
/// concurrent multi-isolate access to the same named instance, so no
/// isolate-to-isolate message passing is needed to keep this in sync.
@Collection()
class CacheSubmissionJob {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: true)
  late String activityFacilityId;

  late String operationType;

  late String status;

  late String stageKey;

  late String stageLabel;

  int completedSteps = 0;

  int totalSteps = 0;

  int progressPercent = 0;

  int retryCount = 0;

  String? lastError;

  DateTime updatedAt = DateTime.now();
}
