// ignore_for_file: non_constant_identifier_names

import 'dart:convert';

/// Plain-JSON ports of the E4H models an AMC `ScheduledVisit` embeds
/// (E4H `Facility`, `Workflow`, `WorkflowAuditDetails`, `Document`,
/// `GeoLocation`, `Transaction`, `Comment`, `AuditDetails`). E4H's versions
/// are Isar `@Embedded`/dart_mappable classes shared with its installation
/// module; this app's installation models of the same names have different
/// fields, so AMC keeps its own `Amc*` copies with E4H's JSON shapes.

/// E4H `Facility` (only the fields AMC reads are typed; the rest are kept
/// in [raw] so a cached/bookmarked visit round-trips unchanged).
class AmcFacility {
  AmcFacility({
    this.tenantId,
    this.facilityId,
    this.boundaryCode,
    this.facilityName,
    this.facilityType,
    this.facility_category,
    this.facility_poc_name,
    this.facility_poc_phone,
    Map<String, dynamic>? raw,
  }) : raw = raw ?? const {};

  final String? tenantId;
  final String? facilityId;
  final String? boundaryCode;
  final String? facilityName;
  final String? facilityType;
  final String? facility_category;
  final String? facility_poc_name;
  final String? facility_poc_phone;
  final Map<String, dynamic> raw;

  factory AmcFacility.fromMap(Map<String, dynamic> m) => AmcFacility(
        tenantId: m['tenant_id']?.toString(),
        facilityId: m['facility_id']?.toString(),
        boundaryCode: m['boundaryCode']?.toString(),
        facilityName: m['facility_name']?.toString(),
        facilityType: m['facility_type']?.toString(),
        facility_category: m['facility_category']?.toString(),
        facility_poc_name: m['facility_poc_name']?.toString(),
        facility_poc_phone: m['facility_poc_phone']?.toString(),
        raw: Map<String, dynamic>.from(m),
      );

  Map<String, dynamic> toMap() => {
        ...raw,
        'tenant_id': tenantId,
        'facility_id': facilityId,
        'boundaryCode': boundaryCode,
        'facility_name': facilityName,
        'facility_type': facilityType,
        'facility_category': facility_category,
        'facility_poc_name': facility_poc_name,
        'facility_poc_phone': facility_poc_phone,
      };
}

/// E4H `WorkflowAuditDetails`.
class AmcWorkflowAuditDetails {
  AmcWorkflowAuditDetails({
    this.createdBy,
    this.lastModifiedBy,
    this.createdTime,
    this.lastModifiedTime,
  });

  final String? createdBy;
  final String? lastModifiedBy;
  final DateTime? createdTime;
  final DateTime? lastModifiedTime;

  factory AmcWorkflowAuditDetails.fromJson(Map<String, dynamic> json) {
    DateTime? toDate(Object? v) {
      if (v == null) return null;
      if (v is int) return DateTime.fromMillisecondsSinceEpoch(v);
      if (v is String) {
        final n = int.tryParse(v);
        if (n != null) return DateTime.fromMillisecondsSinceEpoch(n);
      }
      return null;
    }

    return AmcWorkflowAuditDetails(
      createdBy: json['createdBy']?.toString(),
      lastModifiedBy: json['lastModifiedBy']?.toString(),
      createdTime: toDate(json['createdTime']),
      lastModifiedTime:
          toDate(json['lastModifiedTime'] ?? json['lastModified']),
    );
  }

  Map<String, dynamic> toJson() => {
        'createdBy': createdBy,
        'lastModifiedBy': lastModifiedBy,
        'createdTime': createdTime?.millisecondsSinceEpoch,
        'lastModifiedTime': lastModifiedTime?.millisecondsSinceEpoch,
      };
}

/// E4H `GeoLocation`.
class AmcGeoLocation {
  AmcGeoLocation({this.latitude, this.longitude, this.additionalDetailsJson});

  final String? latitude;
  final String? longitude;
  final String? additionalDetailsJson;

  Map<String, dynamic>? get additionalDetails => additionalDetailsJson == null
      ? null
      : jsonDecode(additionalDetailsJson!) as Map<String, dynamic>?;

  factory AmcGeoLocation.fromJson(Map<String, dynamic> json) {
    return AmcGeoLocation(
      latitude: json['latitude']?.toString(),
      longitude: json['longitude']?.toString(),
      additionalDetailsJson: json['additionalDetails'] != null
          ? jsonEncode(json['additionalDetails'])
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'latitude': latitude,
        'longitude': longitude,
        'additionalDetails': additionalDetails,
      };
}

/// E4H `Document`.
class AmcDocument {
  AmcDocument({
    this.id,
    this.documentType,
    this.fileStore,
    this.documentUid,
    this.additionalDetailsJson,
    this.geoLocation,
  });

  final String? id;
  final String? documentType;
  final String? fileStore;
  final String? documentUid;
  final String? additionalDetailsJson;
  final AmcGeoLocation? geoLocation;

  Map<String, dynamic>? get additionalDetails => additionalDetailsJson == null
      ? null
      : jsonDecode(additionalDetailsJson!) as Map<String, dynamic>?;

  factory AmcDocument.fromJson(Map<String, dynamic> json) {
    final fileStore = json['fileStore'] ?? json['fileStoreId'];
    return AmcDocument(
      id: json['id']?.toString(),
      documentType: json['documentType']?.toString(),
      fileStore: fileStore?.toString(),
      documentUid: json['documentUid']?.toString(),
      additionalDetailsJson: json['additionalDetails'] != null
          ? jsonEncode(json['additionalDetails'])
          : null,
      geoLocation: json['geoLocation'] != null
          ? AmcGeoLocation.fromJson(
              Map<String, dynamic>.from(json['geoLocation'] as Map))
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'documentType': documentType,
        'fileStore': fileStore,
        'documentUid': documentUid,
        'additionalDetails': additionalDetails,
        'geoLocation': geoLocation?.toJson(),
      };

  /// Shape sent in `visitReport.documents` of `workflow/_update`.
  Map<String, dynamic> toJsonForWorkflow() => {
        'id': id,
        'documentType': documentType,
        'fileStoreId': fileStore,
        'documentUid': documentUid,
        'additionalDetails': additionalDetails,
        'geoLocation': geoLocation?.toJson(),
      };
}

/// E4H `Workflow` (a process instance). Keeps the full raw JSON because AMC
/// reads rejection reasons from `rawJson['comment']`.
class AmcWorkflow {
  AmcWorkflow({
    this.documents,
    this.auditDetails,
    this.comment,
    this.rawJson,
  });

  final List<AmcDocument>? documents;
  final AmcWorkflowAuditDetails? auditDetails;
  final String? comment;
  final String? rawJson;

  Map<String, dynamic>? get raw =>
      rawJson == null ? null : (jsonDecode(rawJson!) as Map<String, dynamic>);

  factory AmcWorkflow.fromJson(Map<String, dynamic> json) {
    final docs = json['documents'] is List
        ? (json['documents'] as List)
            .map((d) =>
                AmcDocument.fromJson(Map<String, dynamic>.from(d as Map)))
            .toList()
        : null;
    final details = json['auditDetails'] is Map
        ? AmcWorkflowAuditDetails.fromJson(
            Map<String, dynamic>.from(json['auditDetails'] as Map),
          )
        : null;
    return AmcWorkflow(
      documents: docs,
      auditDetails: details,
      rawJson: json.isNotEmpty ? jsonEncode(json) : null,
      comment: json['comment'] is String
          ? json['comment'] as String
          : json['comment'] == null
              ? null
              : jsonEncode(json['comment']),
    );
  }

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{...?raw};
    json['documents'] = documents?.map((d) => d.toJson()).toList();
    if (!json.containsKey('comment') && comment != null) {
      json['comment'] = comment;
    }
    if (auditDetails != null) {
      json['auditDetails'] = {
        ...?json['auditDetails'] as Map<String, dynamic>?,
        ...auditDetails!.toJson(),
      };
    }
    return json;
  }
}

/// E4H `Comment`. Rejection comments are JSON strings
/// `{"reason": ..., "comment": ...}`.
class AmcComment {
  AmcComment({
    this.commentId,
    this.commentMessage,
    this.assetType,
    this.transactionId,
  });

  final String? commentId;
  final String? commentMessage;
  final String? assetType;
  final String? transactionId;

  Map<String, dynamic>? get _maybeParsedJson {
    final raw = commentMessage;
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) {
        final map = decoded.cast<String, dynamic>();
        if (map.containsKey('reason') ||
            map.containsKey('comment') ||
            map.containsKey('sectionLabel')) {
          return map;
        }
      }
    } catch (_) {}
    return null;
  }

  String? get reason => _maybeParsedJson?['reason']?.toString();

  String? get sectionLabel => _maybeParsedJson?['sectionLabel']?.toString();

  String get displayComment {
    final parsed = _maybeParsedJson;
    if (parsed != null) {
      final val = parsed['comment'];
      return (val is String) ? val : '';
    }
    return commentMessage ?? '';
  }

  factory AmcComment.fromJson(Map<String, dynamic> json) => AmcComment(
        commentId: json['commentId']?.toString(),
        commentMessage: json['commentMessage']?.toString(),
        assetType: json['assetType']?.toString(),
        transactionId: json['transactionId']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'commentId': commentId,
        'commentMessage': commentMessage,
        'assetType': assetType,
        'transactionId': transactionId,
      };
}

/// E4H `Transaction`.
class AmcTransaction {
  AmcTransaction({
    this.transactionId,
    this.processInstanceId,
    this.activityFacilityId,
    this.comments,
  });

  final String? transactionId;
  final String? processInstanceId;
  final String? activityFacilityId;
  final List<AmcComment>? comments;

  factory AmcTransaction.fromJson(Map<String, dynamic> json) => AmcTransaction(
        transactionId: json['transactionId']?.toString(),
        processInstanceId: json['processInstanceId']?.toString(),
        activityFacilityId: json['activityFacilityId']?.toString(),
        comments: json['comments'] is List
            ? (json['comments'] as List)
                .map((e) =>
                    AmcComment.fromJson(Map<String, dynamic>.from(e as Map)))
                .toList()
            : null,
      );

  Map<String, dynamic> toJson() => {
        'transactionId': transactionId,
        'processInstanceId': processInstanceId,
        'activityFacilityId': activityFacilityId,
        'comments': comments?.map((c) => c.toJson()).toList(),
      };
}

/// E4H `AuditDetails` (note the `lastModified` key, as in E4H).
class AmcAuditDetails {
  AmcAuditDetails({
    this.createdBy,
    this.lastModifiedBy,
    this.createdTime,
    this.lastModified,
  });

  final String? createdBy;
  final String? lastModifiedBy;
  final DateTime? createdTime;
  final DateTime? lastModified;

  static DateTime? _intToDateTime(Object? v) {
    if (v is num) return DateTime.fromMillisecondsSinceEpoch(v.toInt());
    if (v is String) {
      final parsed = int.tryParse(v);
      if (parsed != null) return DateTime.fromMillisecondsSinceEpoch(parsed);
    }
    return null;
  }

  factory AmcAuditDetails.fromJson(Map<String, dynamic> json) =>
      AmcAuditDetails(
        createdBy: json['createdBy']?.toString(),
        lastModifiedBy: json['lastModifiedBy']?.toString(),
        createdTime: _intToDateTime(json['createdTime']),
        lastModified: _intToDateTime(json['lastModified']),
      );

  Map<String, dynamic> toJson() => {
        'createdBy': createdBy,
        'lastModifiedBy': lastModifiedBy,
        'createdTime': createdTime?.millisecondsSinceEpoch,
        'lastModified': lastModified?.millisecondsSinceEpoch,
      };
}
