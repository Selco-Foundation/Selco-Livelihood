import 'package:isar/isar.dart';

part 'cache_pending_submission.g.dart';

/// Durable local index for reports that have entered the OTP/submission
/// lifecycle but have not yet been confirmed by the backend pending list.
@Collection()
class CachePendingSubmission {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: true)
  late String activityFacilityId;

  late String facilityId;
  late String componentType;
  late String state;
  late String workflowMode;
  late String rawWorkflowJson;

  bool otpRequested = false;
  bool otpVerified = false;
  bool submissionCompleted = false;

  DateTime createdAt = DateTime.now();
  DateTime updatedAt = DateTime.now();
}
