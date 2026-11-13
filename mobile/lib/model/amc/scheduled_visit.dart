// ignore_for_file: invalid_annotation_target, constant_identifier_names

import 'package:freezed_annotation/freezed_annotation.dart';

import 'amc_support_models.dart';

export 'amc_support_models.dart';

part 'scheduled_visit.freezed.dart';
part 'scheduled_visit.g.dart';

/// AMC scheduled visit models, ported from E4H
/// `lib/model/scheduled_visit/scheduled_visit.dart`. JSON shapes match the
/// `asset-amc/v1/visit/_search` response.
@freezed
class ScheduledVisitSearchResponse with _$ScheduledVisitSearchResponse {
  const factory ScheduledVisitSearchResponse({
    @JsonKey(name: 'ScheduledVisits')
    @Default(<ScheduledVisit>[])
    List<ScheduledVisit> scheduledVisits,
    @JsonKey(name: 'TotalCount') @Default(0) int totalCount,
  }) = _ScheduledVisitSearchResponse;

  factory ScheduledVisitSearchResponse.fromJson(Map<String, dynamic> json) =>
      _$ScheduledVisitSearchResponseFromJson(json);
}

@freezed
class AmcConfiguration with _$AmcConfiguration {
  const factory AmcConfiguration({
    String? id,
    String? tenantId,
    String? vendorId,
    String? facilityId,
    @AmcFacilityConverter() AmcFacility? facility,
    String? projectId,
    Map<String, dynamic>? project,
    @Default(<AmcAssetType>[]) List<AmcAssetType> assetTypes,
    @Default(<AmcAssignment>[]) List<AmcAssignment> assignments,
    int? durationMonths,
    int? visitFrequencyMonths,
    int? totalVisits,
    @EpochDateTimeConverter() DateTime? configurationStartDate,
    @EpochDateTimeConverter() DateTime? configurationEndDate,
    String? status,
    Map<String, dynamic>? additionalDetails,
    @AmcAuditDetailsConverter() AmcAuditDetails? auditDetails,
  }) = _AmcConfiguration;

  factory AmcConfiguration.fromJson(Map<String, dynamic> json) =>
      _$AmcConfigurationFromJson(json);
}

@freezed
class AmcAssetType with _$AmcAssetType {
  const factory AmcAssetType({
    String? code,
    String? name,
  }) = _AmcAssetType;

  factory AmcAssetType.fromJson(Map<String, dynamic> json) =>
      _$AmcAssetTypeFromJson(json);
}

@freezed
class AmcAssignment with _$AmcAssignment {
  const factory AmcAssignment({
    String? id,
    String? tenantId,
    String? amcConfigurationId,
    String? assignedUser,
    Map<String, dynamic>? additionalDetails,
    @AmcAuditDetailsConverter() AmcAuditDetails? auditDetails,
    bool? isActive,
  }) = _AmcAssignment;

  factory AmcAssignment.fromJson(Map<String, dynamic> json) =>
      _$AmcAssignmentFromJson(json);
}

@freezed
class ScheduledVisit with _$ScheduledVisit {
  const factory ScheduledVisit({
    String? id,
    String? tenantId,
    String? amcConfigurationId,
    AmcConfiguration? amcConfiguration,
    String? facilityId,
    @AmcFacilityConverter() AmcFacility? facility,
    int? visitNumber,
    @EpochDateTimeConverter() DateTime? scheduledDate,
    @EpochDateTimeConverter() DateTime? actualVisitDate,
    String? status,
    ScheduledVisitReport? visitReport,
    @AmcWorkflowFlexConverter() AmcWorkflow? workflow,
    @AmcWorkflowListConverter()
    @Default(<AmcWorkflow>[])
    List<AmcWorkflow> processInstances,
    @AmcTransactionListConverter() List<AmcTransaction>? transactions,
    @Default(<ScheduledVisitAssignment>[])
    List<ScheduledVisitAssignment> assignments,
    Map<String, dynamic>? additionalDetails,
    @AmcAuditDetailsConverter() AmcAuditDetails? auditDetails,
  }) = _ScheduledVisit;

  factory ScheduledVisit.fromJson(Map<String, dynamic> json) =>
      _$ScheduledVisitFromJson(json);
}

@freezed
class ScheduledVisitReport with _$ScheduledVisitReport {
  const factory ScheduledVisitReport({
    String? schemaCode,
    @AnyToStringConverter() String? version,
    String? submittedBy,
    @EpochDateTimeConverter() DateTime? submittedAt,
    String? otpReference,
    @EpochDateTimeConverter() DateTime? otpVerifiedAt,
    Map<String, dynamic>? responses,
    @AmcDocumentListConverter() List<AmcDocument>? documents,
    Map<String, dynamic>? additionalDetails,
  }) = _ScheduledVisitReport;

  factory ScheduledVisitReport.fromJson(Map<String, dynamic> json) =>
      _$ScheduledVisitReportFromJson(json);
}

@freezed
class ScheduledVisitAssignment with _$ScheduledVisitAssignment {
  const factory ScheduledVisitAssignment({
    String? id,
    String? tenantId,
    String? scheduledVisitId,
    String? assignedUser,
    Map<String, dynamic>? additionalDetails,
    @AmcAuditDetailsConverter() AmcAuditDetails? auditDetails,
    bool? isActive,
  }) = _ScheduledVisitAssignment;

  factory ScheduledVisitAssignment.fromJson(Map<String, dynamic> json) =>
      _$ScheduledVisitAssignmentFromJson(json);
}

@freezed
class ScheduledVisitSearchCriteria with _$ScheduledVisitSearchCriteria {
  const factory ScheduledVisitSearchCriteria({
    String? tenantId,
    String? facilityId,
    String? facilityName,
    List<String>? assignedUsers,
    String? amcConfigurationId,
    @Default(<String>[]) List<String> statuses,
    int? visitNumber,
    @EpochDateTimeConverter() DateTime? scheduledFrom,
    @EpochDateTimeConverter() DateTime? scheduledTo,
    String? sortDirection,
  }) = _ScheduledVisitSearchCriteria;

  const ScheduledVisitSearchCriteria._();

  static const String TENANT_ID = 'tenantId';
  static const String FACILITY_ID = 'facilityId';
  static const String FACILITY_NAME = 'facilityName';
  static const String ASSIGNED_USERS = 'assignedUsers';
  static const String AMC_CONFIGURATION_ID = 'amcConfigurationId';
  static const String STATUSES = 'statuses';
  static const String VISIT_NUMBER = 'visitNumber';
  // Field names of `amc-scheduler-service` `ScheduledVisitSearchCriteria`
  // (`sv.scheduled_date >= scheduledDateFrom` / `<= scheduledDateTo`).
  static const String SCHEDULED_FROM = 'scheduledDateFrom';
  static const String SCHEDULED_TO = 'scheduledDateTo';
  static const String SORT_DIRECTION = 'sort_direction';

  /// `searchCriteria` body of `asset-amc/v1/visit/_search`, as built by E4H.
  Map<String, dynamic> toApiMap() {
    final out = <String, dynamic>{};
    if (tenantId != null) out[TENANT_ID] = tenantId;
    if (facilityId != null) out[FACILITY_ID] = facilityId;
    if (facilityName != null && facilityName!.trim().isNotEmpty) {
      out[FACILITY_NAME] = facilityName!.trim();
    }
    if (assignedUsers != null && assignedUsers!.isNotEmpty) {
      out[ASSIGNED_USERS] = assignedUsers;
    }
    if (amcConfigurationId != null) {
      out[AMC_CONFIGURATION_ID] = amcConfigurationId;
    }
    if (statuses.isNotEmpty) out[STATUSES] = statuses;
    if (visitNumber != null) out[VISIT_NUMBER] = visitNumber;
    if (scheduledFrom != null) {
      out[SCHEDULED_FROM] = scheduledFrom!.millisecondsSinceEpoch;
    }
    if (scheduledTo != null) {
      out[SCHEDULED_TO] = scheduledTo!.millisecondsSinceEpoch;
    }
    if (sortDirection != null && sortDirection!.trim().isNotEmpty) {
      out[SORT_DIRECTION] = sortDirection!.trim();
    }
    return out;
  }
}

class EpochDateTimeConverter implements JsonConverter<DateTime?, Object?> {
  const EpochDateTimeConverter();

  @override
  DateTime? fromJson(Object? json) {
    if (json == null) return null;

    if (json is int) {
      return DateTime.fromMillisecondsSinceEpoch(json);
    }

    if (json is String && json.isNotEmpty) {
      final asInt = int.tryParse(json);
      if (asInt != null) {
        return DateTime.fromMillisecondsSinceEpoch(asInt);
      }
      return DateTime.tryParse(json);
    }

    return null;
  }

  @override
  Object? toJson(DateTime? date) => date?.millisecondsSinceEpoch;
}

/// E4H's `version` is a String in the model but the backend may send a
/// number; accept either.
class AnyToStringConverter implements JsonConverter<String?, Object?> {
  const AnyToStringConverter();

  @override
  String? fromJson(Object? json) => json?.toString();

  @override
  Object? toJson(String? value) => value;
}

/// E4H `WorkflowFlexConverter` (renamed: this app's installation model
/// already declares one).
class AmcWorkflowFlexConverter implements JsonConverter<AmcWorkflow?, Object?> {
  const AmcWorkflowFlexConverter();

  @override
  AmcWorkflow? fromJson(Object? json) {
    if (json == null) return null;

    if (json is Map) {
      if (json.isEmpty) return null;
      return AmcWorkflow.fromJson(Map<String, dynamic>.from(json));
    }

    if (json is List && json.isNotEmpty) {
      final first = json.first;
      if (first is Map) {
        return AmcWorkflow.fromJson(Map<String, dynamic>.from(first));
      }
    }

    return null;
  }

  @override
  Object? toJson(AmcWorkflow? value) => value?.toJson();
}

class AmcWorkflowListConverter
    implements JsonConverter<List<AmcWorkflow>, Object?> {
  const AmcWorkflowListConverter();

  @override
  List<AmcWorkflow> fromJson(Object? json) => json is List
      ? json
          .whereType<Map>()
          .map((e) => AmcWorkflow.fromJson(Map<String, dynamic>.from(e)))
          .toList()
      : const <AmcWorkflow>[];

  @override
  Object? toJson(List<AmcWorkflow> value) =>
      value.map((e) => e.toJson()).toList();
}

class AmcTransactionListConverter
    implements JsonConverter<List<AmcTransaction>?, Object?> {
  const AmcTransactionListConverter();

  @override
  List<AmcTransaction>? fromJson(Object? json) => json is List
      ? json
          .whereType<Map>()
          .map((e) => AmcTransaction.fromJson(Map<String, dynamic>.from(e)))
          .toList()
      : null;

  @override
  Object? toJson(List<AmcTransaction>? value) =>
      value?.map((e) => e.toJson()).toList();
}

class AmcDocumentListConverter
    implements JsonConverter<List<AmcDocument>?, Object?> {
  const AmcDocumentListConverter();

  @override
  List<AmcDocument>? fromJson(Object? json) => json is List
      ? json
          .whereType<Map>()
          .map((e) => AmcDocument.fromJson(Map<String, dynamic>.from(e)))
          .toList()
      : null;

  @override
  Object? toJson(List<AmcDocument>? value) =>
      value?.map((e) => e.toJson()).toList();
}

class AmcAuditDetailsConverter
    implements JsonConverter<AmcAuditDetails?, Object?> {
  const AmcAuditDetailsConverter();

  @override
  AmcAuditDetails? fromJson(Object? json) => json is Map
      ? AmcAuditDetails.fromJson(Map<String, dynamic>.from(json))
      : null;

  @override
  Object? toJson(AmcAuditDetails? value) => value?.toJson();
}

/// E4H `FacilityConverter`.
class AmcFacilityConverter implements JsonConverter<AmcFacility?, Object?> {
  const AmcFacilityConverter();

  @override
  AmcFacility? fromJson(Object? json) => json is Map
      ? AmcFacility.fromMap(Map<String, dynamic>.from(json))
      : null;

  @override
  Object? toJson(AmcFacility? value) => value?.toMap();
}

/// Date of the latest workflow event, matching the web AMC audit trail.
extension ScheduledVisitDisplayDate on ScheduledVisit {
  DateTime? get displayDate => processInstances.isEmpty
      ? null
      : processInstances.first.auditDetails?.lastModifiedTime;
}

/// Latest instant that still counts as "Scheduled AMC Date has passed":
/// the last millisecond of yesterday, on the device's calendar. Delay is
/// decided by date, not time, so an activity due today is never delayed.
DateTime amcDelayedScheduledBefore([DateTime? now]) {
  final today = now ?? DateTime.now();
  return DateTime(today.year, today.month, today.day)
      .subtract(const Duration(milliseconds: 1));
}

/// "AMC delayed": still `SCHEDULED` (no report saved, so not waiting for a
/// completion code and not finally submitted) and its Scheduled AMC Date is
/// before today.
extension ScheduledVisitDelay on ScheduledVisit {
  bool isAmcDelayed([DateTime? now]) {
    final date = scheduledDate;
    if (date == null || status != 'SCHEDULED') return false;
    return !date.toLocal().isAfter(amcDelayedScheduledBefore(now));
  }
}
