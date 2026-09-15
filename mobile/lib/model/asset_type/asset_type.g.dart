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
    );

Map<String, dynamic> _$$AssetTypeImplToJson(_$AssetTypeImpl instance) =>
    <String, dynamic>{
      'code': instance.code,
      'name': instance.name,
      'active': instance.active,
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
