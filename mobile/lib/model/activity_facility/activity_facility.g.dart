// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'activity_facility.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ActivityFacilityImpl _$$ActivityFacilityImplFromJson(
        Map<String, dynamic> json) =>
    _$ActivityFacilityImpl(
      id: json['id'] as String?,
      tenantId: json['tenantId'] as String?,
      activityId: json['activityId'] as String?,
      facilityId: json['facilityId'] as String?,
      status: json['status'] as String?,
      scheduledAt: (json['scheduledAt'] as num?)?.toInt(),
      activatedAt: (json['activatedAt'] as num?)?.toInt(),
      completedAt: (json['completedAt'] as num?)?.toInt(),
      facility: json['facility'] == null
          ? null
          : Facility.fromJson(json['facility'] as Map<String, dynamic>),
      additionalDetails: json['additionalDetails'] == null
          ? null
          : ActivityFacilityAdditionalDetails.fromJson(
              json['additionalDetails'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$ActivityFacilityImplToJson(
        _$ActivityFacilityImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'tenantId': instance.tenantId,
      'activityId': instance.activityId,
      'facilityId': instance.facilityId,
      'status': instance.status,
      'scheduledAt': instance.scheduledAt,
      'activatedAt': instance.activatedAt,
      'completedAt': instance.completedAt,
      'facility': instance.facility,
      'additionalDetails': instance.additionalDetails,
    };

_$FacilityImpl _$$FacilityImplFromJson(Map<String, dynamic> json) =>
    _$FacilityImpl(
      facilityName: json['facility_name'] as String?,
      boundaryCode: json['boundaryCode'] as String?,
      systemCode: json['systemCode'] as String?,
      systemType: json['systemType'] as String?,
      facilityDetails: json['facilityDetails'] == null
          ? null
          : FacilityDetails.fromJson(
              json['facilityDetails'] as Map<String, dynamic>),
      additionalDetails: json['additionalDetails'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$$FacilityImplToJson(_$FacilityImpl instance) =>
    <String, dynamic>{
      'facility_name': instance.facilityName,
      'boundaryCode': instance.boundaryCode,
      'systemCode': instance.systemCode,
      'systemType': instance.systemType,
      'facilityDetails': instance.facilityDetails,
      'additionalDetails': instance.additionalDetails,
    };

_$FacilityDetailsImpl _$$FacilityDetailsImplFromJson(
        Map<String, dynamic> json) =>
    _$FacilityDetailsImpl(
      solutionDesignType: json['solar_solution_design_type'] as String?,
      systemType: json['systemType'] as String?,
      systemCode: json['systemCode'] as String?,
    );

Map<String, dynamic> _$$FacilityDetailsImplToJson(
        _$FacilityDetailsImpl instance) =>
    <String, dynamic>{
      'solar_solution_design_type': instance.solutionDesignType,
      'systemType': instance.systemType,
      'systemCode': instance.systemCode,
    };

_$ActivityFacilityAdditionalDetailsImpl
    _$$ActivityFacilityAdditionalDetailsImplFromJson(
            Map<String, dynamic> json) =>
        _$ActivityFacilityAdditionalDetailsImpl(
          bom: json['bom'] as Map<String, dynamic>?,
          battery: json['battery'] as Map<String, dynamic>?,
          inverter: json['inverter'] as Map<String, dynamic>?,
          panel: json['panel'] as Map<String, dynamic>?,
          systemCode: json['systemCode'] as String?,
          componentType: json['componentType'] as String?,
          assetType: json['assetType'] as String?,
          documents: (json['documents'] as List<dynamic>?)
              ?.map((e) => e as Map<String, dynamic>)
              .toList(),
        );

Map<String, dynamic> _$$ActivityFacilityAdditionalDetailsImplToJson(
        _$ActivityFacilityAdditionalDetailsImpl instance) =>
    <String, dynamic>{
      'bom': instance.bom,
      'battery': instance.battery,
      'inverter': instance.inverter,
      'panel': instance.panel,
      'systemCode': instance.systemCode,
      'componentType': instance.componentType,
      'assetType': instance.assetType,
      'documents': instance.documents,
    };
