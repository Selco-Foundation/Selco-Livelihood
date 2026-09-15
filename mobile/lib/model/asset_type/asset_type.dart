import 'package:freezed_annotation/freezed_annotation.dart';

part 'asset_type.freezed.dart';
part 'asset_type.g.dart';

@freezed
class AssetType with _$AssetType {
  const factory AssetType({
    required String code,
    required String name,
    required bool active,
  }) = _AssetType;

  factory AssetType.fromJson(Map<String, dynamic> json) =>
      _$AssetTypeFromJson(json);
}

@freezed
class AssetTypeData with _$AssetTypeData {
  const factory AssetTypeData({
    required int id,
    String? module,
    String? tenantId,
    @JsonKey(name: 'AssetType') required List<AssetType> assetType,
  }) = _AssetTypeData;

  factory AssetTypeData.fromJson(Map<String, dynamic> json) =>
      _$AssetTypeDataFromJson(json);
}
