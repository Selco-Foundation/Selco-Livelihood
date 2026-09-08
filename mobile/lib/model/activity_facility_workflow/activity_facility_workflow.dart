import 'package:freezed_annotation/freezed_annotation.dart';

import '../activity_facility/activity_facility.dart';

part 'activity_facility_workflow.freezed.dart';
part 'activity_facility_workflow.g.dart';

/// One row of the `"facility"` list returned by
/// `POST activity/v1/activities/_search` — the activity-facility itself
/// plus its current `egov-workflow-v2` process-instance snapshot.
@freezed
class ActivityFacilityWorkflow with _$ActivityFacilityWorkflow {
  const factory ActivityFacilityWorkflow({
    required ActivityFacility activityFacility,
    String? status,
    @WorkflowFlexConverter() Workflow? workflow,
  }) = _ActivityFacilityWorkflow;

  factory ActivityFacilityWorkflow.fromJson(Map<String, dynamic> json) =>
      _$ActivityFacilityWorkflowFromJson(json);
}

@freezed
class Workflow with _$Workflow {
  const factory Workflow({
    WorkflowAuditDetails? auditDetails,
  }) = _Workflow;

  factory Workflow.fromJson(Map<String, dynamic> json) =>
      _$WorkflowFromJson(json);
}

@freezed
class WorkflowAuditDetails with _$WorkflowAuditDetails {
  const factory WorkflowAuditDetails({
    int? lastModifiedTime,
  }) = _WorkflowAuditDetails;

  factory WorkflowAuditDetails.fromJson(Map<String, dynamic> json) =>
      _$WorkflowAuditDetailsFromJson(json);
}

/// Tolerates the backend returning `workflow` as `{}`, `[]`, or `null` —
/// only a genuinely populated object is parsed, everything else normalizes
/// to `null` instead of throwing a type-cast error mid-deserialization.
class WorkflowFlexConverter implements JsonConverter<Workflow?, Object?> {
  const WorkflowFlexConverter();

  @override
  Workflow? fromJson(Object? json) {
    if (json is Map<String, dynamic> && json.isNotEmpty) {
      return Workflow.fromJson(json);
    }
    return null;
  }

  @override
  Object? toJson(Workflow? object) => object?.toJson();
}
