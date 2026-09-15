import 'package:freezed_annotation/freezed_annotation.dart';

part 'asset_type.freezed.dart';
part 'asset_type.g.dart';

@freezed
class AssetType with _$AssetType {
  const factory AssetType({
    required String code,
    required String name,
    required bool active,
    // ignore: invalid_annotation_target
    @JsonKey(name: 'form_fields')
    @Default([])
    List<AssetTypeFormField> formFields,
  }) = _AssetType;

  factory AssetType.fromJson(Map<String, dynamic> json) =>
      _$AssetTypeFromJson(json);
}

/// The new flow only consumes the shared type choices (currently Battery
/// chemistry/type) from AssetTypeSchema. Legacy system/capacity options in
/// the same `form_fields` objects are intentionally not modeled.
@freezed
class AssetTypeFormField with _$AssetTypeFormField {
  const factory AssetTypeFormField({
    @Default([]) List<String> types,
  }) = _AssetTypeFormField;

  factory AssetTypeFormField.fromJson(Map<String, dynamic> json) =>
      _$AssetTypeFormFieldFromJson(json);
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
