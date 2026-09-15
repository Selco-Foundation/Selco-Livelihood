import 'package:freezed_annotation/freezed_annotation.dart';

import '../asset_type/asset_type.dart';
import '../item_code/item_code.dart';
import '../warranty/warranty.dart';

part 'asset_registry_response.freezed.dart';
part 'asset_registry_response.g.dart';

/// The `MdmsRes` envelope for a batched MDMS v1 `_search` covering the
/// `asset-registry` and `facility` modules. Same convention as the existing
/// `MdmsResponseModel`/`AppConfig` (`lib/model/appconfig/mdmsResponse.dart`)
/// — one hardcoded field per known module/master, matching what every
/// sibling DIGIT app in this org does too (none of them use a fully
/// generic module->master->records wrapper either).
@freezed
class AssetRegistryMdmsResponse with _$AssetRegistryMdmsResponse {
  const factory AssetRegistryMdmsResponse({
    @JsonKey(name: 'asset-registry') AssetRegistryModule? assetRegistry,
    @JsonKey(name: 'common-masters') CommonMastersModule? commonMasters,
    @JsonKey(name: 'livelihood') LivelihoodModule? livelihood,
    @JsonKey(name: 'Installation') InstallationModule? installation,
  }) = _AssetRegistryMdmsResponse;

  factory AssetRegistryMdmsResponse.fromJson(Map<String, dynamic> json) =>
      _$AssetRegistryMdmsResponseFromJson(json);
}

@freezed
class CommonMastersModule with _$CommonMastersModule {
  const factory CommonMastersModule({
    @JsonKey(name: 'InstallationImages')
    @Default([])
    List<Map<String, dynamic>> installationImages,
  }) = _CommonMastersModule;

  factory CommonMastersModule.fromJson(Map<String, dynamic> json) =>
      _$CommonMastersModuleFromJson(json);
}

@freezed
class AssetRegistryModule with _$AssetRegistryModule {
  const factory AssetRegistryModule({
    @JsonKey(name: 'AssetTypeSchema')
    @Default([])
    List<AssetTypeData> assetTypeSchema,
    @JsonKey(name: 'WarrantyDurationSchema')
    @Default([])
    List<WarrantyData> warrantyDurationSchema,
  }) = _AssetRegistryModule;

  factory AssetRegistryModule.fromJson(Map<String, dynamic> json) =>
      _$AssetRegistryModuleFromJson(json);
}

@freezed
class LivelihoodModule with _$LivelihoodModule {
  const factory LivelihoodModule({
    @JsonKey(name: 'ItemCode') @Default([]) List<ItemCode> itemCode,
    @JsonKey(name: 'BOMFormSchema')
    @Default([])
    List<Map<String, dynamic>> bomFormSchema,
    @JsonKey(name: 'SolutionBOMForms')
    @Default([])
    List<Map<String, dynamic>> solutionBomForms,
  }) = _LivelihoodModule;

  factory LivelihoodModule.fromJson(Map<String, dynamic> json) =>
      _$LivelihoodModuleFromJson(json);
}

@freezed
class InstallationModule with _$InstallationModule {
  const factory InstallationModule({
    @JsonKey(name: 'Solution') @Default([]) List<InstallationSolution> solution,
  }) = _InstallationModule;

  factory InstallationModule.fromJson(Map<String, dynamic> json) =>
      _$InstallationModuleFromJson(json);
}

@freezed
class InstallationSolution with _$InstallationSolution {
  const factory InstallationSolution({
    required String code,
    required String name,
    String? sectorName,
    num? sunshineHrsMin,
  }) = _InstallationSolution;

  factory InstallationSolution.fromJson(Map<String, dynamic> json) =>
      _$InstallationSolutionFromJson(json);
}
