import 'dart:convert';

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
    List<WorkflowTransaction>? transactions,
    @WorkflowFlexConverter() Workflow? workflow,
  }) = _ActivityFacilityWorkflow;

  factory ActivityFacilityWorkflow.fromJson(Map<String, dynamic> json) =>
      _$ActivityFacilityWorkflowFromJson(json);
}

class WorkflowTransaction {
  const WorkflowTransaction({
    this.transactionId,
    this.processInstanceId,
    this.activityFacilityId,
    this.comments = const [],
  });

  final String? transactionId;
  final String? processInstanceId;
  final String? activityFacilityId;
  final List<WorkflowComment> comments;

  factory WorkflowTransaction.fromJson(Map<String, dynamic> json) =>
      WorkflowTransaction(
        transactionId: json['transactionId']?.toString(),
        processInstanceId: json['processInstanceId']?.toString(),
        activityFacilityId: json['activityFacilityId']?.toString(),
        comments: (json['comments'] as List<dynamic>? ?? const [])
            .whereType<Map>()
            .map((item) =>
                WorkflowComment.fromJson(Map<String, dynamic>.from(item)))
            .toList(),
      );

  Map<String, dynamic> toJson() => {
        if (transactionId != null) 'transactionId': transactionId,
        if (processInstanceId != null) 'processInstanceId': processInstanceId,
        if (activityFacilityId != null)
          'activityFacilityId': activityFacilityId,
        'comments': comments.map((comment) => comment.toJson()).toList(),
      };
}

class WorkflowComment {
  const WorkflowComment({
    this.commentId,
    this.commentMessage,
    this.assetType,
    this.transactionId,
  });

  final String? commentId;
  final String? commentMessage;
  final String? assetType;
  final String? transactionId;

  Map<String, dynamic>? get parsedMessage {
    final raw = commentMessage?.trim();
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      return decoded is Map ? Map<String, dynamic>.from(decoded) : null;
    } catch (_) {
      return null;
    }
  }

  String? get reason => parsedMessage?['reason']?.toString().trim();
  String? get reasonCode => parsedMessage?['reasonCode']?.toString().trim();
  String? get sectionLabel => parsedMessage?['sectionLabel']?.toString().trim();
  String get details => parsedMessage?['comment']?.toString().trim() ?? '';

  factory WorkflowComment.fromJson(Map<String, dynamic> json) =>
      WorkflowComment(
        commentId: json['commentId']?.toString(),
        commentMessage: json['commentMessage']?.toString(),
        assetType: json['assetType']?.toString(),
        transactionId: json['transactionId']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        if (commentId != null) 'commentId': commentId,
        if (commentMessage != null) 'commentMessage': commentMessage,
        if (assetType != null) 'assetType': assetType,
        if (transactionId != null) 'transactionId': transactionId,
      };
}

extension ActivityFacilityWorkflowTransactions on ActivityFacilityWorkflow {
  List<WorkflowComment> get latestTransactionComments {
    for (final transaction
        in (transactions ?? const <WorkflowTransaction>[]).reversed) {
      if (transaction.comments.isNotEmpty) return transaction.comments;
    }
    return const [];
  }
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
