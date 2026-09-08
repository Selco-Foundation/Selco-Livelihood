// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'asset_registry_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$AssetRegistryMdmsResponseImpl _$$AssetRegistryMdmsResponseImplFromJson(
        Map<String, dynamic> json) =>
    _$AssetRegistryMdmsResponseImpl(
      assetRegistry: json['asset-registry'] == null
          ? null
          : AssetRegistryModule.fromJson(
              json['asset-registry'] as Map<String, dynamic>),
      facility: json['facility'] == null
          ? null
          : FacilityModule.fromJson(json['facility'] as Map<String, dynamic>),
      commonMasters: json['common-masters'] == null
          ? null
          : CommonMastersModule.fromJson(
              json['common-masters'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$AssetRegistryMdmsResponseImplToJson(
        _$AssetRegistryMdmsResponseImpl instance) =>
    <String, dynamic>{
      'asset-registry': instance.assetRegistry,
      'facility': instance.facility,
      'common-masters': instance.commonMasters,
    };

_$CommonMastersModuleImpl _$$CommonMastersModuleImplFromJson(
        Map<String, dynamic> json) =>
    _$CommonMastersModuleImpl(
      bomFormSchema: (json['BOMFormSchema'] as List<dynamic>?)
              ?.map((e) => e as Map<String, dynamic>)
              .toList() ??
          const [],
      solutionDesignTypeBomForms:
          (json['SolutionDesignTypeBOMForms'] as List<dynamic>?)
                  ?.map((e) => e as Map<String, dynamic>)
                  .toList() ??
              const [],
      installationImages: (json['InstallationImages'] as List<dynamic>?)
              ?.map((e) => e as Map<String, dynamic>)
              .toList() ??
          const [],
      requiredBomFormKeys: (json['RequiredBomFormKeys'] as List<dynamic>?)
              ?.map((e) => e as Map<String, dynamic>)
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$CommonMastersModuleImplToJson(
        _$CommonMastersModuleImpl instance) =>
    <String, dynamic>{
      'BOMFormSchema': instance.bomFormSchema,
      'SolutionDesignTypeBOMForms': instance.solutionDesignTypeBomForms,
      'InstallationImages': instance.installationImages,
      'RequiredBomFormKeys': instance.requiredBomFormKeys,
    };

_$AssetRegistryModuleImpl _$$AssetRegistryModuleImplFromJson(
        Map<String, dynamic> json) =>
    _$AssetRegistryModuleImpl(
      assetCountSchema: (json['AssetCountSchema'] as List<dynamic>?)
              ?.map((e) => AssetCountData.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      assetTypeSchema: (json['AssetTypeSchema'] as List<dynamic>?)
              ?.map((e) => AssetTypeData.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      systemSchema: (json['SystemSchema'] as List<dynamic>?)
              ?.map((e) => SystemData.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      warrantyDurationSchema: (json['WarrantyDurationSchema'] as List<dynamic>?)
              ?.map((e) => WarrantyData.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      brandSchema: (json['BrandSchema'] as List<dynamic>?)
              ?.map((e) => BrandData.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$AssetRegistryModuleImplToJson(
        _$AssetRegistryModuleImpl instance) =>
    <String, dynamic>{
      'AssetCountSchema': instance.assetCountSchema,
      'AssetTypeSchema': instance.assetTypeSchema,
      'SystemSchema': instance.systemSchema,
      'WarrantyDurationSchema': instance.warrantyDurationSchema,
      'BrandSchema': instance.brandSchema,
    };

_$FacilityModuleImpl _$$FacilityModuleImplFromJson(Map<String, dynamic> json) =>
    _$FacilityModuleImpl(
      solarSolutionDesignType: (json['SolarSolutionDesignType']
                  as List<dynamic>?)
              ?.map(
                  (e) => SolutionDesignType.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$FacilityModuleImplToJson(
        _$FacilityModuleImpl instance) =>
    <String, dynamic>{
      'SolarSolutionDesignType': instance.solarSolutionDesignType,
    };
