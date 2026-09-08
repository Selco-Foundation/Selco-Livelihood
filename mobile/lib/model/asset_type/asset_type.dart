import 'package:freezed_annotation/freezed_annotation.dart';

part 'asset_type.freezed.dart';
part 'asset_type.g.dart';

@freezed
class AssetType with _$AssetType {
  const factory AssetType({
    required String code,
    required String name,
    required bool active,
    @JsonKey(name: 'form_fields')
    required List<AssetTypeFormField> formFields,
  }) = _AssetType;

  factory AssetType.fromJson(Map<String, dynamic> json) =>
      _$AssetTypeFromJson(json);
}

/// Named `AssetTypeFormField`, not `FormField` — that name collides with
/// Flutter's own `FormField<T>` widget class in `package:flutter/widgets.dart`.
@freezed
class AssetTypeFormField with _$AssetTypeFormField {
  const factory AssetTypeFormField({
    String? key,
    String? name,
    String? system,
    List<String>? options,
    List<String>? types,
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
