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
      commonMasters: json['common-masters'] == null
          ? null
          : CommonMastersModule.fromJson(
              json['common-masters'] as Map<String, dynamic>),
      livelihood: json['livelihood'] == null
          ? null
          : LivelihoodModule.fromJson(
              json['livelihood'] as Map<String, dynamic>),
      installation: json['Installation'] == null
          ? null
          : InstallationModule.fromJson(
              json['Installation'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$AssetRegistryMdmsResponseImplToJson(
        _$AssetRegistryMdmsResponseImpl instance) =>
    <String, dynamic>{
      'asset-registry': instance.assetRegistry,
      'common-masters': instance.commonMasters,
      'livelihood': instance.livelihood,
      'Installation': instance.installation,
    };

_$CommonMastersModuleImpl _$$CommonMastersModuleImplFromJson(
        Map<String, dynamic> json) =>
    _$CommonMastersModuleImpl(
      installationImages: (json['InstallationImages'] as List<dynamic>?)
              ?.map((e) => e as Map<String, dynamic>)
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$CommonMastersModuleImplToJson(
        _$CommonMastersModuleImpl instance) =>
    <String, dynamic>{
      'InstallationImages': instance.installationImages,
    };

_$AssetRegistryModuleImpl _$$AssetRegistryModuleImplFromJson(
        Map<String, dynamic> json) =>
    _$AssetRegistryModuleImpl(
      assetTypeSchema: (json['AssetTypeSchema'] as List<dynamic>?)
              ?.map((e) => AssetTypeData.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      warrantyDurationSchema: (json['WarrantyDurationSchema'] as List<dynamic>?)
              ?.map((e) => WarrantyData.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$AssetRegistryModuleImplToJson(
        _$AssetRegistryModuleImpl instance) =>
    <String, dynamic>{
      'AssetTypeSchema': instance.assetTypeSchema,
      'WarrantyDurationSchema': instance.warrantyDurationSchema,
    };

_$LivelihoodModuleImpl _$$LivelihoodModuleImplFromJson(
        Map<String, dynamic> json) =>
    _$LivelihoodModuleImpl(
      bomFormSchema: (json['BOMFormSchema'] as List<dynamic>?)
              ?.map((e) => e as Map<String, dynamic>)
              .toList() ??
          const [],
      solutionBomForms: (json['SolutionBOMForms'] as List<dynamic>?)
              ?.map((e) => e as Map<String, dynamic>)
              .toList() ??
          const [],
      machineFormSchema: (json['MachineFormSchema'] as List<dynamic>?)
              ?.map((e) => e as Map<String, dynamic>)
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$LivelihoodModuleImplToJson(
        _$LivelihoodModuleImpl instance) =>
    <String, dynamic>{
      'BOMFormSchema': instance.bomFormSchema,
      'SolutionBOMForms': instance.solutionBomForms,
      'MachineFormSchema': instance.machineFormSchema,
    };

_$InstallationModuleImpl _$$InstallationModuleImplFromJson(
        Map<String, dynamic> json) =>
    _$InstallationModuleImpl(
      solution: (json['Solution'] as List<dynamic>?)
              ?.map((e) =>
                  InstallationSolution.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      rejectionReasons: (json['RejectionReasons'] as List<dynamic>?)
              ?.map((e) => RejectionReason.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$InstallationModuleImplToJson(
        _$InstallationModuleImpl instance) =>
    <String, dynamic>{
      'Solution': instance.solution,
      'RejectionReasons': instance.rejectionReasons,
    };

_$InstallationSolutionImpl _$$InstallationSolutionImplFromJson(
        Map<String, dynamic> json) =>
    _$InstallationSolutionImpl(
      code: json['code'] as String,
      name: json['name'] as String,
      sectorName: json['sectorName'] as String?,
      sunshineHrsMin: json['sunshineHrsMin'] as num?,
    );

Map<String, dynamic> _$$InstallationSolutionImplToJson(
        _$InstallationSolutionImpl instance) =>
    <String, dynamic>{
      'code': instance.code,
      'name': instance.name,
      'sectorName': instance.sectorName,
      'sunshineHrsMin': instance.sunshineHrsMin,
    };
