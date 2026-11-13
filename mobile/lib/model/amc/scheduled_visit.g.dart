// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'scheduled_visit.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ScheduledVisitSearchResponseImpl _$$ScheduledVisitSearchResponseImplFromJson(
        Map<String, dynamic> json) =>
    _$ScheduledVisitSearchResponseImpl(
      scheduledVisits: (json['ScheduledVisits'] as List<dynamic>?)
              ?.map((e) => ScheduledVisit.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ScheduledVisit>[],
      totalCount: (json['TotalCount'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$$ScheduledVisitSearchResponseImplToJson(
        _$ScheduledVisitSearchResponseImpl instance) =>
    <String, dynamic>{
      'ScheduledVisits': instance.scheduledVisits,
      'TotalCount': instance.totalCount,
    };

_$AmcConfigurationImpl _$$AmcConfigurationImplFromJson(
        Map<String, dynamic> json) =>
    _$AmcConfigurationImpl(
      id: json['id'] as String?,
      tenantId: json['tenantId'] as String?,
      vendorId: json['vendorId'] as String?,
      facilityId: json['facilityId'] as String?,
      facility: const AmcFacilityConverter().fromJson(json['facility']),
      projectId: json['projectId'] as String?,
      project: json['project'] as Map<String, dynamic>?,
      assetTypes: (json['assetTypes'] as List<dynamic>?)
              ?.map((e) => AmcAssetType.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <AmcAssetType>[],
      assignments: (json['assignments'] as List<dynamic>?)
              ?.map((e) => AmcAssignment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <AmcAssignment>[],
      durationMonths: (json['durationMonths'] as num?)?.toInt(),
      visitFrequencyMonths: (json['visitFrequencyMonths'] as num?)?.toInt(),
      totalVisits: (json['totalVisits'] as num?)?.toInt(),
      configurationStartDate: const EpochDateTimeConverter()
          .fromJson(json['configurationStartDate']),
      configurationEndDate:
          const EpochDateTimeConverter().fromJson(json['configurationEndDate']),
      status: json['status'] as String?,
      additionalDetails: json['additionalDetails'] as Map<String, dynamic>?,
      auditDetails:
          const AmcAuditDetailsConverter().fromJson(json['auditDetails']),
    );

Map<String, dynamic> _$$AmcConfigurationImplToJson(
        _$AmcConfigurationImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'tenantId': instance.tenantId,
      'vendorId': instance.vendorId,
      'facilityId': instance.facilityId,
      'facility': const AmcFacilityConverter().toJson(instance.facility),
      'projectId': instance.projectId,
      'project': instance.project,
      'assetTypes': instance.assetTypes,
      'assignments': instance.assignments,
      'durationMonths': instance.durationMonths,
      'visitFrequencyMonths': instance.visitFrequencyMonths,
      'totalVisits': instance.totalVisits,
      'configurationStartDate': const EpochDateTimeConverter()
          .toJson(instance.configurationStartDate),
      'configurationEndDate':
          const EpochDateTimeConverter().toJson(instance.configurationEndDate),
      'status': instance.status,
      'additionalDetails': instance.additionalDetails,
      'auditDetails':
          const AmcAuditDetailsConverter().toJson(instance.auditDetails),
    };

_$AmcAssetTypeImpl _$$AmcAssetTypeImplFromJson(Map<String, dynamic> json) =>
    _$AmcAssetTypeImpl(
      code: json['code'] as String?,
      name: json['name'] as String?,
    );

Map<String, dynamic> _$$AmcAssetTypeImplToJson(_$AmcAssetTypeImpl instance) =>
    <String, dynamic>{
      'code': instance.code,
      'name': instance.name,
    };

_$AmcAssignmentImpl _$$AmcAssignmentImplFromJson(Map<String, dynamic> json) =>
    _$AmcAssignmentImpl(
      id: json['id'] as String?,
      tenantId: json['tenantId'] as String?,
      amcConfigurationId: json['amcConfigurationId'] as String?,
      assignedUser: json['assignedUser'] as String?,
      additionalDetails: json['additionalDetails'] as Map<String, dynamic>?,
      auditDetails:
          const AmcAuditDetailsConverter().fromJson(json['auditDetails']),
      isActive: json['isActive'] as bool?,
    );

Map<String, dynamic> _$$AmcAssignmentImplToJson(_$AmcAssignmentImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'tenantId': instance.tenantId,
      'amcConfigurationId': instance.amcConfigurationId,
      'assignedUser': instance.assignedUser,
      'additionalDetails': instance.additionalDetails,
      'auditDetails':
          const AmcAuditDetailsConverter().toJson(instance.auditDetails),
      'isActive': instance.isActive,
    };

_$ScheduledVisitImpl _$$ScheduledVisitImplFromJson(Map<String, dynamic> json) =>
    _$ScheduledVisitImpl(
      id: json['id'] as String?,
      tenantId: json['tenantId'] as String?,
      amcConfigurationId: json['amcConfigurationId'] as String?,
      amcConfiguration: json['amcConfiguration'] == null
          ? null
          : AmcConfiguration.fromJson(
              json['amcConfiguration'] as Map<String, dynamic>),
      facilityId: json['facilityId'] as String?,
      facility: const AmcFacilityConverter().fromJson(json['facility']),
      visitNumber: (json['visitNumber'] as num?)?.toInt(),
      scheduledDate:
          const EpochDateTimeConverter().fromJson(json['scheduledDate']),
      actualVisitDate:
          const EpochDateTimeConverter().fromJson(json['actualVisitDate']),
      status: json['status'] as String?,
      visitReport: json['visitReport'] == null
          ? null
          : ScheduledVisitReport.fromJson(
              json['visitReport'] as Map<String, dynamic>),
      workflow: const AmcWorkflowFlexConverter().fromJson(json['workflow']),
      processInstances: json['processInstances'] == null
          ? const <AmcWorkflow>[]
          : const AmcWorkflowListConverter().fromJson(json['processInstances']),
      transactions:
          const AmcTransactionListConverter().fromJson(json['transactions']),
      assignments: (json['assignments'] as List<dynamic>?)
              ?.map((e) =>
                  ScheduledVisitAssignment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ScheduledVisitAssignment>[],
      additionalDetails: json['additionalDetails'] as Map<String, dynamic>?,
      auditDetails:
          const AmcAuditDetailsConverter().fromJson(json['auditDetails']),
    );

Map<String, dynamic> _$$ScheduledVisitImplToJson(
        _$ScheduledVisitImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'tenantId': instance.tenantId,
      'amcConfigurationId': instance.amcConfigurationId,
      'amcConfiguration': instance.amcConfiguration,
      'facilityId': instance.facilityId,
      'facility': const AmcFacilityConverter().toJson(instance.facility),
      'visitNumber': instance.visitNumber,
      'scheduledDate':
          const EpochDateTimeConverter().toJson(instance.scheduledDate),
      'actualVisitDate':
          const EpochDateTimeConverter().toJson(instance.actualVisitDate),
      'status': instance.status,
      'visitReport': instance.visitReport,
      'workflow': const AmcWorkflowFlexConverter().toJson(instance.workflow),
      'processInstances':
          const AmcWorkflowListConverter().toJson(instance.processInstances),
      'transactions':
          const AmcTransactionListConverter().toJson(instance.transactions),
      'assignments': instance.assignments,
      'additionalDetails': instance.additionalDetails,
      'auditDetails':
          const AmcAuditDetailsConverter().toJson(instance.auditDetails),
    };

_$ScheduledVisitReportImpl _$$ScheduledVisitReportImplFromJson(
        Map<String, dynamic> json) =>
    _$ScheduledVisitReportImpl(
      schemaCode: json['schemaCode'] as String?,
      version: const AnyToStringConverter().fromJson(json['version']),
      submittedBy: json['submittedBy'] as String?,
      submittedAt: const EpochDateTimeConverter().fromJson(json['submittedAt']),
      otpReference: json['otpReference'] as String?,
      otpVerifiedAt:
          const EpochDateTimeConverter().fromJson(json['otpVerifiedAt']),
      responses: json['responses'] as Map<String, dynamic>?,
      documents: const AmcDocumentListConverter().fromJson(json['documents']),
      additionalDetails: json['additionalDetails'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$$ScheduledVisitReportImplToJson(
        _$ScheduledVisitReportImpl instance) =>
    <String, dynamic>{
      'schemaCode': instance.schemaCode,
      'version': const AnyToStringConverter().toJson(instance.version),
      'submittedBy': instance.submittedBy,
      'submittedAt':
          const EpochDateTimeConverter().toJson(instance.submittedAt),
      'otpReference': instance.otpReference,
      'otpVerifiedAt':
          const EpochDateTimeConverter().toJson(instance.otpVerifiedAt),
      'responses': instance.responses,
      'documents': const AmcDocumentListConverter().toJson(instance.documents),
      'additionalDetails': instance.additionalDetails,
    };

_$ScheduledVisitAssignmentImpl _$$ScheduledVisitAssignmentImplFromJson(
        Map<String, dynamic> json) =>
    _$ScheduledVisitAssignmentImpl(
      id: json['id'] as String?,
      tenantId: json['tenantId'] as String?,
      scheduledVisitId: json['scheduledVisitId'] as String?,
      assignedUser: json['assignedUser'] as String?,
      additionalDetails: json['additionalDetails'] as Map<String, dynamic>?,
      auditDetails:
          const AmcAuditDetailsConverter().fromJson(json['auditDetails']),
      isActive: json['isActive'] as bool?,
    );

Map<String, dynamic> _$$ScheduledVisitAssignmentImplToJson(
        _$ScheduledVisitAssignmentImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'tenantId': instance.tenantId,
      'scheduledVisitId': instance.scheduledVisitId,
      'assignedUser': instance.assignedUser,
      'additionalDetails': instance.additionalDetails,
      'auditDetails':
          const AmcAuditDetailsConverter().toJson(instance.auditDetails),
      'isActive': instance.isActive,
    };
