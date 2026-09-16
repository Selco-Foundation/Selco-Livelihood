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
    String? state,
    String? action,
    String? businessService,
    String? comment,
    List<Map<String, dynamic>>? documents,
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

/// Tolerates the backend returning `workflow` as an object, a history list,
/// an empty value, or `null`. The activity API returns the current workflow
/// first and nests its state details inside a separate object.
class WorkflowFlexConverter implements JsonConverter<Workflow?, Object?> {
  const WorkflowFlexConverter();

  @override
  Workflow? fromJson(Object? json) {
    final raw = switch (json) {
      final Map value when value.isNotEmpty => Map<String, dynamic>.from(value),
      final List value when value.isNotEmpty && value.first is Map =>
        Map<String, dynamic>.from(value.first as Map),
      _ => null,
    };
    if (raw == null || raw.isEmpty) return null;

    final state = raw['state'];
    if (state is Map) {
      raw['state'] =
          state['state']?.toString() ?? state['applicationStatus']?.toString();
    }
    return Workflow.fromJson(raw);
  }

  @override
  Object? toJson(Workflow? object) => object?.toJson();
}
