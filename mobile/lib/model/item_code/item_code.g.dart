// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'item_code.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ItemCodeImpl _$$ItemCodeImplFromJson(Map<String, dynamic> json) =>
    _$ItemCodeImpl(
      code: json['code'] as String,
      name: json['name'] as String,
      active: json['active'] as bool,
      category: json['category'] as String,
      solarAsset: json['solarAsset'] as bool,
    );

Map<String, dynamic> _$$ItemCodeImplToJson(_$ItemCodeImpl instance) =>
    <String, dynamic>{
      'code': instance.code,
      'name': instance.name,
      'active': instance.active,
      'category': instance.category,
      'solarAsset': instance.solarAsset,
    };
