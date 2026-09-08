import 'package:freezed_annotation/freezed_annotation.dart';

part 'activity_facility.freezed.dart';
part 'activity_facility.g.dart';

/// One `facility_activities` row returned by
/// `POST activity/v1/activities/_search`, scoped to the `INS` (Installation)
/// activity for this app's Field Staff role.
@freezed
class ActivityFacility with _$ActivityFacility {
  const factory ActivityFacility({
    String? id,
    String? tenantId,
    String? activityId,
    String? facilityId,
    String? status,
    int? scheduledAt,
    int? activatedAt,
    int? completedAt,
    Facility? facility,
    ActivityFacilityAdditionalDetails? additionalDetails,
  }) = _ActivityFacility;

  factory ActivityFacility.fromJson(Map<String, dynamic> json) =>
      _$ActivityFacilityFromJson(json);
}

@freezed
class Facility with _$Facility {
  const factory Facility({
    @JsonKey(name: 'facility_name') String? facilityName,
    String? boundaryCode,
  }) = _Facility;

  factory Facility.fromJson(Map<String, dynamic> json) =>
      _$FacilityFromJson(json);
}

/// `additionalDetails` is a freeform JSONB blob on the backend (per the LLD,
/// `bom.data`/`facility_activities` carry no fixed schema) — only the `bom`
/// sub-map is read here, for the New-Report-vs-in-progress asset-category
/// routing decision in `_handleFacilityAction`.
@freezed
class ActivityFacilityAdditionalDetails
    with _$ActivityFacilityAdditionalDetails {
  const factory ActivityFacilityAdditionalDetails({
    Map<String, dynamic>? bom,
  }) = _ActivityFacilityAdditionalDetails;

  factory ActivityFacilityAdditionalDetails.fromJson(
          Map<String, dynamic> json) =>
      _$ActivityFacilityAdditionalDetailsFromJson(json);
}

/// Request-criteria builder for the `ActivityFacility` search body — plain
/// (not freezed) since it is write-only, mirroring the reference app's
/// `ActivityFacilitySearchModel`.
class ActivityFacilitySearchModel {
  const ActivityFacilitySearchModel({
    required this.tenantId,
    this.facilityName,
  });

  final String tenantId;
  final String? facilityName;

  Map<String, dynamic> toMap() => {
        'tenantId': tenantId,
        if (facilityName != null && facilityName!.isNotEmpty)
          'facilityName': facilityName,
      };
}
