// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'mdms_request.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$MdmsRequestModelImpl _$$MdmsRequestModelImplFromJson(
        Map<String, dynamic> json) =>
    _$MdmsRequestModelImpl(
      mdmsCriteria: MdmsCriteriaModel.fromJson(
          json['MdmsCriteria'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$MdmsRequestModelImplToJson(
        _$MdmsRequestModelImpl instance) =>
    <String, dynamic>{
      'MdmsCriteria': instance.mdmsCriteria,
    };

_$MdmsCriteriaModelImpl _$$MdmsCriteriaModelImplFromJson(
        Map<String, dynamic> json) =>
    _$MdmsCriteriaModelImpl(
      tenantId: json['tenantId'] as String,
      moduleDetails: (json['moduleDetails'] as List<dynamic>)
          .map((e) => MdmsModuleDetailModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$$MdmsCriteriaModelImplToJson(
        _$MdmsCriteriaModelImpl instance) =>
    <String, dynamic>{
      'tenantId': instance.tenantId,
      'moduleDetails': instance.moduleDetails,
    };

_$MdmsModuleDetailModelImpl _$$MdmsModuleDetailModelImplFromJson(
        Map<String, dynamic> json) =>
    _$MdmsModuleDetailModelImpl(
      moduleName: json['moduleName'] as String,
      masterDetails: (json['masterDetails'] as List<dynamic>)
          .map((e) => MdmsMasterDetailModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$$MdmsModuleDetailModelImplToJson(
        _$MdmsModuleDetailModelImpl instance) =>
    <String, dynamic>{
      'moduleName': instance.moduleName,
      'masterDetails': instance.masterDetails,
    };

_$MdmsMasterDetailModelImpl _$$MdmsMasterDetailModelImplFromJson(
        Map<String, dynamic> json) =>
    _$MdmsMasterDetailModelImpl(
      name: json['name'] as String,
    );

Map<String, dynamic> _$$MdmsMasterDetailModelImplToJson(
        _$MdmsMasterDetailModelImpl instance) =>
    <String, dynamic>{
      'name': instance.name,
    };
