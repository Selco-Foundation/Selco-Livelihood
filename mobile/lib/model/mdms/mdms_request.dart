import 'package:freezed_annotation/freezed_annotation.dart';

part 'mdms_request.freezed.dart';
part 'mdms_request.g.dart';

/// `RequestInfo` is deliberately not a field here — `DioClient`'s
/// `AuthTokenInterceptor` already auto-injects it into any Map-bodied POST,
/// so this model only needs to carry `MdmsCriteria`.
@freezed
class MdmsRequestModel with _$MdmsRequestModel {
  const factory MdmsRequestModel({
    @JsonKey(name: 'MdmsCriteria') required MdmsCriteriaModel mdmsCriteria,
  }) = _MdmsRequestModel;

  factory MdmsRequestModel.fromJson(Map<String, dynamic> json) =>
      _$MdmsRequestModelFromJson(json);
}

@freezed
class MdmsCriteriaModel with _$MdmsCriteriaModel {
  const factory MdmsCriteriaModel({
    required String tenantId,
    required List<MdmsModuleDetailModel> moduleDetails,
  }) = _MdmsCriteriaModel;

  factory MdmsCriteriaModel.fromJson(Map<String, dynamic> json) =>
      _$MdmsCriteriaModelFromJson(json);
}

@freezed
class MdmsModuleDetailModel with _$MdmsModuleDetailModel {
  const factory MdmsModuleDetailModel({
    required String moduleName,
    required List<MdmsMasterDetailModel> masterDetails,
  }) = _MdmsModuleDetailModel;

  factory MdmsModuleDetailModel.fromJson(Map<String, dynamic> json) =>
      _$MdmsModuleDetailModelFromJson(json);
}

@freezed
class MdmsMasterDetailModel with _$MdmsMasterDetailModel {
  const factory MdmsMasterDetailModel({
    required String name,
  }) = _MdmsMasterDetailModel;

  factory MdmsMasterDetailModel.fromJson(Map<String, dynamic> json) =>
      _$MdmsMasterDetailModelFromJson(json);
}
