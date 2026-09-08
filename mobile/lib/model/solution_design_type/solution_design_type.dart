import 'package:freezed_annotation/freezed_annotation.dart';

part 'solution_design_type.freezed.dart';
part 'solution_design_type.g.dart';

/// Flat leaf model — unlike the other asset-registry schemas, the live MDMS
/// v1 response for `facility.SolarSolutionDesignType` is a plain array of
/// these objects directly, with no id/module/tenantId wrapper.
@freezed
class SolutionDesignType with _$SolutionDesignType {
  const factory SolutionDesignType({
    required bool active,
    required String code,
    required String name,
    required String url,
    @JsonKey(name: 'system_code') required String systemCode,
  }) = _SolutionDesignType;

  factory SolutionDesignType.fromJson(Map<String, dynamic> json) =>
      _$SolutionDesignTypeFromJson(json);
}
