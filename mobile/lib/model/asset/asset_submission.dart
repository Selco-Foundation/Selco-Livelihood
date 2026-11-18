import '../document/submission_document.dart';

/// Typed Asset Registry write model.
///
/// Draft/checkpoint maps are parsed once, while the registry-specific wire
/// format remains owned by this model and the Asset Repository.
class AssetSubmission {
  const AssetSubmission({
    this.assetId,
    this.parentId,
    required this.system,
    required this.assetTypeId,
    required this.serialNumber,
    required this.modelNumber,
    required this.brandId,
    required this.itemCode,
    required this.name,
    this.warrantyStartDate,
    this.warrantyDuration,
    this.assetDetails,
    this.documents = const [],
    this.children = const [],
    this.isOperational = false,
    this.isActive = true,
  });

  final String? assetId;
  final String? parentId;
  final bool isOperational;
  final bool isActive;
  final String system;
  final String assetTypeId;
  final String serialNumber;
  final String modelNumber;
  final String brandId;
  final String itemCode;
  final String name;
  final dynamic warrantyStartDate;
  final dynamic warrantyDuration;
  final Map<String, dynamic>? assetDetails;
  final List<SubmissionDocument> documents;
  final List<AssetSubmission> children;

  bool get isSolarParent => assetTypeId == 'SOLAR';
  Iterable<AssetSubmission> get units => isSolarParent ? children : [this];

  factory AssetSubmission.fromCheckpoint(Map<String, dynamic> json) =>
      AssetSubmission(
        isOperational: json['isOperational'] == true,
        isActive: json['isActive'] != false,
        children: (json['children'] as List<dynamic>? ?? const [])
            .whereType<Map>()
            .map((child) => AssetSubmission.fromCheckpoint(
                Map<String, dynamic>.from(child)))
            .toList(),
        assetId: _text(json['assetId'] ?? json['assetID']),
        parentId: _text(json['parentId']),
        system: _text(json['system']) ?? '',
        assetTypeId: _text(json['assetTypeID']) ?? '',
        serialNumber: _text(json['serialNumber']) ?? '',
        modelNumber: _text(json['modelNumber']) ?? '',
        brandId: _text(json['brandID']) ?? '',
        itemCode: _text(json['itemCode']) ?? '',
        name: _text(json['name']) ?? '',
        warrantyStartDate: json['warrantyStartDate'],
        warrantyDuration:
            json['warrantyDuration'] ?? json['warrantyDurationYears'],
        assetDetails: json['assetDetails'] is Map
            ? Map<String, dynamic>.from(json['assetDetails'] as Map)
            : null,
        documents: (json['documents'] as List<dynamic>? ?? const [])
            .whereType<Map>()
            .map((document) => SubmissionDocument.fromJson(
                  Map<String, dynamic>.from(document),
                ))
            .toList(),
      );

  AssetSubmission copyWith({
    String? assetId,
    String? parentId,
    String? system,
    List<SubmissionDocument>? documents,
    List<AssetSubmission>? children,
  }) =>
      AssetSubmission(
        children: children ?? this.children,
        isOperational: isOperational,
        isActive: isActive,
        assetId: assetId ?? this.assetId,
        parentId: parentId ?? this.parentId,
        system: system ?? this.system,
        assetTypeId: assetTypeId,
        serialNumber: serialNumber,
        modelNumber: modelNumber,
        brandId: brandId,
        itemCode: itemCode,
        name: name,
        warrantyStartDate: warrantyStartDate,
        warrantyDuration: warrantyDuration,
        assetDetails: assetDetails,
        documents: documents ?? this.documents,
      );

  List<String> get missingRequiredFields => isSolarParent
      ? [
          if (system.trim().isEmpty) 'system',
          if (children.isEmpty) 'children',
          for (final child in children)
            for (final field in child.missingRequiredFields
                .where((field) => field != 'system'))
              '${child.assetTypeId} ${child.serialNumber}: $field',
        ]
      : {
          'serial number': serialNumber,
          'brand': brandId,
          'system': system,
        }
          .entries
          .where((entry) => entry.value.trim().isEmpty)
          .map((entry) => entry.key)
          .toList();

  Map<String, dynamic> toRegistryJson({
    required String tenantId,
    required String facilityId,
    required String activityFacilityId,
    required String vendorId,
  }) =>
      {
        if (assetId?.trim().isNotEmpty == true) 'assetId': assetId,
        if (parentId?.trim().isNotEmpty == true) 'parentId': parentId,
        'tenantId': tenantId,
        'system': system,
        'facilityID': facilityId,
        'activityFacilityID': activityFacilityId,
        'assetTypeID': assetTypeId,
        if (!isSolarParent) 'serialNumber': serialNumber,
        if (!isSolarParent) 'modelNumber': modelNumber,
        if (!isSolarParent) 'brandID': brandId,
        if (!isSolarParent)
          'itemCode': itemCode.trim().isEmpty ? null : itemCode,
        'name': name,
        'vendorId': vendorId,
        'isOperational': isOperational,
        'isActive': isActive,
        if (!isSolarParent) 'warrantyStartDate': warrantyStartDate,
        if (!isSolarParent) 'warrantyDuration': warrantyDuration,
        if (!isSolarParent) 'assetDetails': assetDetails,
        if (isSolarParent)
          'children': children.map((child) {
            final json = child.toRegistryJson(
                tenantId: tenantId,
                facilityId: facilityId,
                activityFacilityId: activityFacilityId,
                vendorId: vendorId);
            for (final key in [
              'tenantId',
              'system',
              'facilityID',
              'activityFacilityID',
              'vendorId'
            ]) {
              json.remove(key);
            }
            return json;
          }).toList(),
        'documents':
            documents.map((document) => document.toAssetJson()).toList(),
      };
}

String? _text(dynamic value) {
  final text = value?.toString().trim();
  return text == null || text.isEmpty ? null : text;
}

/// Reuses server identities and document metadata when updating solar children.
AssetSubmission reconcileSolarSubmission(
    AssetSubmission submission, Map<String, dynamic> remote) {
  final existing = AssetSubmission.fromCheckpoint(remote);
  List<SubmissionDocument> mergeDocuments(
      List<SubmissionDocument> desired, List<SubmissionDocument> saved) {
    // The current payload owns the selected document list. Reintroducing all
    // backend documents here would undo removals/replacements made on Retry.
    return desired.map((document) {
      final match = saved
          .where((other) =>
              (document.fileStore != null &&
                  other.fileStore == document.fileStore) ||
              (document.fileStore == null &&
                  document.documentUid?.trim().isNotEmpty == true &&
                  document.documentUid == other.documentUid &&
                  document.documentType == other.documentType))
          .firstOrNull;
      if (match == null) return document;
      return SubmissionDocument.fromJson({
        ...document.toCacheJson(),
        if (match.id != null) 'id': match.id,
        if (match.fileStore != null) 'fileStore': match.fileStore,
      });
    }).toList();
  }

  return submission.copyWith(
    assetId: existing.assetId,
    documents: mergeDocuments(submission.documents, existing.documents),
    children: submission.children.map((child) {
      final match = existing.children
          .where((other) =>
              (child.assetId != null && child.assetId == other.assetId) ||
              (child.assetId == null &&
                  child.assetTypeId == other.assetTypeId &&
                  child.serialNumber == other.serialNumber))
          .firstOrNull;
      return match == null
          ? child
          : child.copyWith(
              assetId: match.assetId,
              documents: mergeDocuments(child.documents, match.documents),
            );
    }).toList(),
  );
}

/// Returns the first saved field that differs from the submitted asset.
String? assetSubmissionMismatch(
        AssetSubmission expected, Map<String, dynamic> remote) =>
    _assetMismatch(expected, AssetSubmission.fromCheckpoint(remote));

String? _assetMismatch(AssetSubmission expected, AssetSubmission saved) {
  if (expected.assetId != null && expected.assetId != saved.assetId) {
    return 'assetId';
  }
  if (expected.assetTypeId != saved.assetTypeId) return 'assetTypeID';
  if (!expected.isSolarParent) {
    for (final entry in <String, (Object?, Object?)>{
      'serialNumber': (expected.serialNumber, saved.serialNumber),
      'modelNumber': (expected.modelNumber, saved.modelNumber),
      'brandID': (expected.brandId, saved.brandId),
      'itemCode': (expected.itemCode, saved.itemCode),
      'warrantyDuration': (expected.warrantyDuration, saved.warrantyDuration),
    }.entries) {
      if (_text(entry.value.$1) != _text(entry.value.$2)) return entry.key;
    }
    for (final entry
        in (expected.assetDetails ?? const <String, dynamic>{}).entries) {
      if (!_containsValue(entry.value, saved.assetDetails?[entry.key])) {
        return 'assetDetails.${entry.key}';
      }
    }
  }
  if (expected.documents.length != saved.documents.length ||
      expected.documents.any((document) =>
          !document.isUploaded ||
          !saved.documents.any((other) =>
              document.documentType == other.documentType &&
              document.fileStore == other.fileStore))) {
    return 'documents';
  }
  if (expected.isSolarParent) {
    if (expected.children.length != saved.children.length) return 'children';
    for (final child in expected.children) {
      final match = saved.children
          .where((other) => child.assetId != null
              ? child.assetId == other.assetId
              : child.assetTypeId == other.assetTypeId &&
                  child.serialNumber == other.serialNumber)
          .firstOrNull;
      final mismatch =
          match == null ? 'missing asset' : _assetMismatch(child, match);
      if (mismatch != null) {
        return '${child.assetTypeId} ${child.assetId ?? child.serialNumber}: $mismatch';
      }
    }
  }
  return null;
}

bool _containsValue(Object? expected, Object? saved) {
  if (expected is Map && saved is Map) {
    return expected.entries
        .every((entry) => _containsValue(entry.value, saved[entry.key]));
  }
  if (expected is List && saved is List) {
    return expected.length == saved.length &&
        List.generate(expected.length, (index) => index)
            .every((index) => _containsValue(expected[index], saved[index]));
  }
  return expected == saved;
}

/// A parent alone is insufficient: all submitted edits and photos must persist.
bool assetSubmissionIsPersisted(
        AssetSubmission expected, Map<String, dynamic> remote) =>
    assetSubmissionMismatch(expected, remote) == null;
