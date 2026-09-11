/// A filestore-backed document with endpoint-specific serialization.
///
/// Asset Registry calls the reference `fileStore`, while the activity
/// workflow contract calls the same value `fileStoreId`. Keeping one
/// canonical field prevents submission code from mixing the two contracts.
class SubmissionDocument {
  const SubmissionDocument({
    required this.documentType,
    this.fileStore,
    this.localPath,
    this.documentUid,
    this.status = 'ACTIVE',
    this.additionalDetails,
    this.geoLocation,
  });

  final String documentType;
  final String? fileStore;
  final String? localPath;
  final String? documentUid;
  final String status;
  final Map<String, dynamic>? additionalDetails;
  final Map<String, dynamic>? geoLocation;

  bool get isUploaded => fileStore?.trim().isNotEmpty == true;

  SubmissionDocument copyWith({String? fileStore, String? localPath}) =>
      SubmissionDocument(
        documentType: documentType,
        fileStore: fileStore ?? this.fileStore,
        localPath: localPath ?? this.localPath,
        documentUid: documentUid,
        status: status,
        additionalDetails: additionalDetails,
        geoLocation: geoLocation,
      );

  factory SubmissionDocument.fromJson(Map<String, dynamic> json) =>
      SubmissionDocument(
        documentType: (json['documentType'] ?? '').toString(),
        fileStore:
            (json['fileStore'] ?? json['fileStoreId'] ?? json['remoteId'])
                ?.toString(),
        localPath: json['localPath']?.toString(),
        documentUid: json['documentUid']?.toString(),
        status: json['status']?.toString() ?? 'ACTIVE',
        additionalDetails: json['additionalDetails'] is Map
            ? Map<String, dynamic>.from(json['additionalDetails'] as Map)
            : null,
        geoLocation: json['geoLocation'] is Map
            ? Map<String, dynamic>.from(json['geoLocation'] as Map)
            : null,
      );

  /// Persistent draft/checkpoint representation.
  Map<String, dynamic> toCacheJson() => {
        'documentType': documentType,
        if (fileStore != null) 'fileStore': fileStore,
        if (localPath != null) 'localPath': localPath,
        if (documentUid != null) 'documentUid': documentUid,
        'status': status,
        if (additionalDetails != null) 'additionalDetails': additionalDetails,
        if (geoLocation != null) 'geoLocation': geoLocation,
      };

  Map<String, dynamic> toAssetJson() => {
        'documentType': documentType,
        'fileStore': fileStore,
        if (documentUid != null) 'documentUid': documentUid,
        if (additionalDetails != null) 'additionalDetails': additionalDetails,
        if (geoLocation != null) 'geoLocation': geoLocation,
      };

  Map<String, dynamic> toWorkflowJson() => {
        'documentType': documentType,
        'fileStoreId': fileStore,
        if (documentUid != null) 'documentUid': documentUid,
        'status': status,
        if (additionalDetails != null) 'additionalDetails': additionalDetails,
        if (geoLocation != null) 'geoLocation': geoLocation,
      };
}
