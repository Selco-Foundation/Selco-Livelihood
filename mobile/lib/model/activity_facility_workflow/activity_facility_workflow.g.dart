// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'activity_facility_workflow.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ActivityFacilityWorkflowImpl _$$ActivityFacilityWorkflowImplFromJson(
        Map<String, dynamic> json) =>
    _$ActivityFacilityWorkflowImpl(
      activityFacility: ActivityFacility.fromJson(
          json['activityFacility'] as Map<String, dynamic>),
      status: json['status'] as String?,
      workflow: const WorkflowFlexConverter().fromJson(json['workflow']),
    );

Map<String, dynamic> _$$ActivityFacilityWorkflowImplToJson(
        _$ActivityFacilityWorkflowImpl instance) =>
    <String, dynamic>{
      'activityFacility': instance.activityFacility,
      'status': instance.status,
      'workflow': const WorkflowFlexConverter().toJson(instance.workflow),
    };

_$WorkflowImpl _$$WorkflowImplFromJson(Map<String, dynamic> json) =>
    _$WorkflowImpl(
      auditDetails: json['auditDetails'] == null
          ? null
          : WorkflowAuditDetails.fromJson(
              json['auditDetails'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$WorkflowImplToJson(_$WorkflowImpl instance) =>
    <String, dynamic>{
      'auditDetails': instance.auditDetails,
    };

_$WorkflowAuditDetailsImpl _$$WorkflowAuditDetailsImplFromJson(
        Map<String, dynamic> json) =>
    _$WorkflowAuditDetailsImpl(
      lastModifiedTime: (json['lastModifiedTime'] as num?)?.toInt(),
    );

Map<String, dynamic> _$$WorkflowAuditDetailsImplToJson(
        _$WorkflowAuditDetailsImpl instance) =>
    <String, dynamic>{
      'lastModifiedTime': instance.lastModifiedTime,
    };
