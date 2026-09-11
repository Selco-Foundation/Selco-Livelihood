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
  });

  final String? assetId;
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

  factory AssetSubmission.fromCheckpoint(Map<String, dynamic> json) =>
      AssetSubmission(
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
  }) =>
      AssetSubmission(
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

  List<String> get missingRequiredFields => {
        'serial number': serialNumber,
        'item code': itemCode,
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
        'serialNumber': serialNumber,
        'modelNumber': modelNumber,
        'brandID': brandId,
        'itemCode': itemCode,
        'name': name,
        'vendorId': vendorId,
        'isOperational': false,
        'isActive': true,
        'warrantyStartDate': warrantyStartDate,
        'warrantyDuration': warrantyDuration,
        'assetDetails': assetDetails,
        'documents':
            documents.map((document) => document.toAssetJson()).toList(),
      };
}

String? _text(dynamic value) {
  final text = value?.toString().trim();
  return text == null || text.isEmpty ? null : text;
}
