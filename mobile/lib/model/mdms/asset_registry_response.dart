import 'package:freezed_annotation/freezed_annotation.dart';

import '../asset_count/asset_count.dart';
import '../asset_type/asset_type.dart';
import '../brand/brand.dart';
import '../solution_design_type/solution_design_type.dart';
import '../system/system.dart';
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
    @JsonKey(name: 'facility') FacilityModule? facility,
  }) = _AssetRegistryMdmsResponse;

  factory AssetRegistryMdmsResponse.fromJson(Map<String, dynamic> json) =>
      _$AssetRegistryMdmsResponseFromJson(json);
}

@freezed
class AssetRegistryModule with _$AssetRegistryModule {
  const factory AssetRegistryModule({
    @JsonKey(name: 'AssetCountSchema')
    @Default([])
    List<AssetCountData> assetCountSchema,
    @JsonKey(name: 'AssetTypeSchema')
    @Default([])
    List<AssetTypeData> assetTypeSchema,
    @JsonKey(name: 'SystemSchema') @Default([]) List<SystemData> systemSchema,
    @JsonKey(name: 'WarrantyDurationSchema')
    @Default([])
    List<WarrantyData> warrantyDurationSchema,
    @JsonKey(name: 'BrandSchema') @Default([]) List<BrandData> brandSchema,
  }) = _AssetRegistryModule;

  factory AssetRegistryModule.fromJson(Map<String, dynamic> json) =>
      _$AssetRegistryModuleFromJson(json);
}

@freezed
class FacilityModule with _$FacilityModule {
  const factory FacilityModule({
    @JsonKey(name: 'SolarSolutionDesignType')
    @Default([])
    List<SolutionDesignType> solarSolutionDesignType,
  }) = _FacilityModule;

  factory FacilityModule.fromJson(Map<String, dynamic> json) =>
      _$FacilityModuleFromJson(json);
}
