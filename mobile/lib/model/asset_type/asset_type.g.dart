// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'asset_type.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$AssetTypeImpl _$$AssetTypeImplFromJson(Map<String, dynamic> json) =>
    _$AssetTypeImpl(
      code: json['code'] as String,
      name: json['name'] as String,
      active: json['active'] as bool,
      formFields: (json['form_fields'] as List<dynamic>?)
              ?.map(
                  (e) => AssetTypeFormField.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$AssetTypeImplToJson(_$AssetTypeImpl instance) =>
    <String, dynamic>{
      'code': instance.code,
      'name': instance.name,
      'active': instance.active,
      'form_fields': instance.formFields,
    };

_$AssetTypeFormFieldImpl _$$AssetTypeFormFieldImplFromJson(
        Map<String, dynamic> json) =>
    _$AssetTypeFormFieldImpl(
      types:
          (json['types'] as List<dynamic>?)?.map((e) => e as String).toList() ??
              const [],
    );

Map<String, dynamic> _$$AssetTypeFormFieldImplToJson(
        _$AssetTypeFormFieldImpl instance) =>
    <String, dynamic>{
      'types': instance.types,
    };

_$AssetTypeDataImpl _$$AssetTypeDataImplFromJson(Map<String, dynamic> json) =>
    _$AssetTypeDataImpl(
      id: (json['id'] as num).toInt(),
      module: json['module'] as String?,
      tenantId: json['tenantId'] as String?,
      assetType: (json['AssetType'] as List<dynamic>)
          .map((e) => AssetType.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$$AssetTypeDataImplToJson(_$AssetTypeDataImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'module': instance.module,
      'tenantId': instance.tenantId,
      'AssetType': instance.assetType,
    };
