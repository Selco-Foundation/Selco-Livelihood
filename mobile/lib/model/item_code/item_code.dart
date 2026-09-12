import 'package:freezed_annotation/freezed_annotation.dart';

part 'item_code.freezed.dart';
part 'item_code.g.dart';

/// Flat leaf model — like `SolutionDesignType`, the live MDMS v1 response
/// for `livelihood.ItemCode` is a plain array of these objects directly,
/// with no id/module/tenantId wrapper.
@freezed
class ItemCode with _$ItemCode {
  const factory ItemCode({
    required String code,
    required String name,
    required bool active,
    required String category,
    required bool solarAsset,
  }) = _ItemCode;

  factory ItemCode.fromJson(Map<String, dynamic> json) =>
      _$ItemCodeFromJson(json);
}
