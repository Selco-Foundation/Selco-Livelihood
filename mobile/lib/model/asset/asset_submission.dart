import '../document/submission_document.dart';

/// Typed Asset Registry write model.
///
/// Draft/checkpoint maps are parsed once, while the registry-specific wire
/// format remains owned by this model and the Asset Repository.
class AssetSubmission {
  const AssetSubmission({
    this.assetId,
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
    List<SubmissionDocument>? documents,
    List<AssetSubmission>? children,
  }) =>
      AssetSubmission(
        children: children ?? this.children,
        isOperational: isOperational,
        isActive: isActive,
        assetId: assetId ?? this.assetId,
        system: system,
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
    final result = [...saved];
    for (final document in desired) {
      if (!result.any((other) =>
          document.fileStore != null &&
          other.fileStore == document.fileStore)) {
        result.add(document);
      }
    }
    return result;
  }

  return submission.copyWith(
    assetId: existing.assetId,
    documents: mergeDocuments(submission.documents, existing.documents),
    children: submission.children.map((child) {
      final match = existing.children
          .where((other) =>
              (child.assetId != null && child.assetId == other.assetId) ||
              (child.assetTypeId == other.assetTypeId &&
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

/// A parent alone is insufficient: all expected units and photos must persist.
bool assetSubmissionIsPersisted(
    AssetSubmission expected, Map<String, dynamic> remote) {
  final saved = AssetSubmission.fromCheckpoint(remote);
  bool documentsPresent(AssetSubmission unit, AssetSubmission other) =>
      unit.documents.every((document) =>
          document.isUploaded &&
          other.documents
              .any((saved) => saved.fileStore == document.fileStore));
  if (expected.isSolarParent) {
    return saved.isSolarParent &&
        (expected.assetId == null || expected.assetId == saved.assetId) &&
        documentsPresent(expected, saved) &&
        expected.children.every((child) => saved.children.any((other) =>
            child.assetTypeId == other.assetTypeId &&
            child.serialNumber == other.serialNumber &&
            documentsPresent(child, other)));
  }
  return expected.serialNumber == saved.serialNumber;
}
