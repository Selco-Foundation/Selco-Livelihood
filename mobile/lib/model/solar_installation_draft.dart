import 'activity_facility_workflow/activity_facility_workflow.dart';
import 'facility_report.dart';
import 'mdms/common_masters.dart';

enum SolarAssetType { battery, inverter, panel }

extension SolarAssetTypeLabel on SolarAssetType {
  String get label => switch (this) {
        SolarAssetType.battery => 'Battery',
        SolarAssetType.inverter => 'Inverter / PCU',
        SolarAssetType.panel => 'Solar Panel',
      };

  String get pluralLabel => switch (this) {
        SolarAssetType.battery => 'Batteries',
        SolarAssetType.inverter => 'Inverters',
        SolarAssetType.panel => 'Panels',
      };
}

enum SolarWorkflowMode { newReport, pending, resubmission, approved }

enum SolarFileKind { image, video, pdf }

class SolarFileRef {
  const SolarFileRef({
    required this.name,
    required this.path,
    required this.kind,
    this.remoteId,
    this.mimeType,
    this.documentType,
    this.localPath,
    this.id,
    this.documentUid,
    this.status = 'ACTIVE',
    this.additionalDetails,
    this.geoLocation,
  });

  final String name;
  final String path;
  final SolarFileKind kind;
  final String? remoteId;
  final String? mimeType;
  final String? documentType;
  final String? localPath;
  final String? id;
  final String? documentUid;
  final String status;
  final Map<String, dynamic>? additionalDetails;
  final Map<String, dynamic>? geoLocation;

  bool get isRemote => remoteId?.isNotEmpty == true || path.startsWith('http');

  bool get hasValidLocation {
    final latitude = geoLocation?['latitude']?.toString().trim();
    final longitude = geoLocation?['longitude']?.toString().trim();
    return latitude?.isNotEmpty == true &&
        longitude?.isNotEmpty == true &&
        double.tryParse(latitude!) != null &&
        double.tryParse(longitude!) != null;
  }

  bool get isValidForSubmission => isRemote || hasValidLocation;
  bool get hasCompleteNewDocumentMetadata =>
      isRemote || (hasValidLocation && documentUid?.trim().isNotEmpty == true);

  SolarFileRef copyWith({
    String? localPath,
    String? documentType,
    String? documentUid,
    Map<String, dynamic>? geoLocation,
  }) =>
      SolarFileRef(
        name: name,
        path: path,
        kind: kind,
        remoteId: remoteId,
        mimeType: mimeType,
        documentType: documentType ?? this.documentType,
        localPath: localPath ?? this.localPath,
        id: id,
        documentUid: documentUid ?? this.documentUid,
        status: status,
        additionalDetails: additionalDetails,
        geoLocation: geoLocation ?? this.geoLocation,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'path': path,
        'kind': kind.name,
        if (remoteId != null) 'remoteId': remoteId,
        if (mimeType != null) 'mimeType': mimeType,
        if (documentType != null) 'documentType': documentType,
        if (localPath != null) 'localPath': localPath,
        if (id != null) 'id': id,
        if (documentUid != null) 'documentUid': documentUid,
        'status': status,
        if (additionalDetails != null) 'additionalDetails': additionalDetails,
        if (geoLocation != null) 'geoLocation': geoLocation,
      };

  factory SolarFileRef.fromJson(Map<String, dynamic> json) => SolarFileRef(
        name: (json['name'] ?? '').toString(),
        path: (json['path'] ?? json['fileStoreId'] ?? json['fileStore'] ?? '')
            .toString(),
        kind: SolarFileKind.values.firstWhere(
          (value) => value.name == json['kind'],
          orElse: () => _kindFromName((json['name'] ?? '').toString()),
        ),
        remoteId: json['remoteId']?.toString() ??
            json['fileStoreId']?.toString() ??
            json['fileStore']?.toString(),
        mimeType: json['mimeType']?.toString(),
        documentType: json['documentType']?.toString(),
        localPath: json['localPath']?.toString(),
        id: json['id']?.toString(),
        documentUid: json['documentUid']?.toString(),
        status: json['status']?.toString() ?? 'ACTIVE',
        additionalDetails: json['additionalDetails'] is Map
            ? Map<String, dynamic>.from(json['additionalDetails'] as Map)
            : null,
        geoLocation: json['geoLocation'] is Map
            ? Map<String, dynamic>.from(json['geoLocation'] as Map)
            : null,
      );

  static SolarFileKind _kindFromName(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.pdf')) return SolarFileKind.pdf;
    if (lower.endsWith('.mp4') ||
        lower.endsWith('.mov') ||
        lower.endsWith('.m4v')) {
      return SolarFileKind.video;
    }
    return SolarFileKind.image;
  }
}

class SolarAssetEntry {
  SolarAssetEntry({
    this.assetId,
    this.itemCode,
    this.serialNumber = '',
    this.capacity = '',
    this.batteryType = '',
    this.supportingPhoto,
    this.fields = const {},
  });

  String? assetId;
  String? itemCode;
  String serialNumber;
  String capacity;
  String batteryType;
  SolarFileRef? supportingPhoto;
  Map<String, dynamic> fields;

  bool get isComplete =>
      serialNumber.trim().isNotEmpty &&
      itemCode?.trim().isNotEmpty == true &&
      capacity.trim().isNotEmpty &&
      supportingPhoto?.hasCompleteNewDocumentMetadata == true;
}

class SolarAssetDraft {
  SolarAssetDraft({required this.type});

  final SolarAssetType type;
  String system = '';
  String totalCapacity = '';
  String capacityUnit = '';
  String warrantyDuration = '';
  final List<SolarAssetEntry> assets = [];
  final List<SolarFileRef> images = [];
  final List<SolarFileRef> videos = [];
  String? selectedBrandCode;
  final Map<String, List<String>> formOptions = {};
  final List<String> typeOptions = [];

  bool get detailsComplete =>
      warrantyDuration.isNotEmpty &&
      selectedBrandCode?.trim().isNotEmpty == true &&
      totalCapacity.trim().isNotEmpty;

  bool entryComplete(SolarAssetEntry entry) =>
      entry.isComplete &&
      (type != SolarAssetType.battery ||
          typeOptions.contains(entry.batteryType));

  bool get isComplete =>
      detailsComplete &&
      assets.isNotEmpty &&
      assets.every(entryComplete) &&
      images.isNotEmpty &&
      images.every((file) => file.hasCompleteNewDocumentMetadata) &&
      videos.every((file) => file.hasCompleteNewDocumentMetadata);
}

class SolarInstallationDraft {
  SolarInstallationDraft({
    required this.workflow,
    required this.mode,
  }) : assets = {
          for (final type in SolarAssetType.values)
            type: SolarAssetDraft(type: type),
        };

  final ActivityFacilityWorkflow workflow;
  final SolarWorkflowMode mode;
  final Map<SolarAssetType, int> counts = {
    for (final type in SolarAssetType.values) type: 0,
  };
  final Map<SolarAssetType, SolarAssetDraft> assets;
  final List<SolarFileRef> completionReportFiles = [];
  List<InstallationImageRequirement> installationRequirements = const [];
  final Map<String, List<SolarFileRef>> installationMedia = {};
  String? systemCode;
  String? solutionId;
  String? remoteBomId;
  String? remoteBomName;
  Map<String, dynamic> remoteBomAdditionalDetails = const {};
  List<SolarAssetType> applicableTypes = SolarAssetType.values;
  final Map<SolarAssetType, int> minimumCounts = {};
  final Map<SolarAssetType, int> maximumCounts = {};
  final Map<SolarAssetType, String> assetTypeCodes = {};
  final Map<SolarAssetType, String> assetTypeLabels = {};
  final Map<SolarAssetType, List<String>> brandOptions = {};
  final Map<SolarAssetType, List<String>> warrantyOptions = {};
  final List<String> bomFormNames = [];
  final Map<String, Map<String, dynamic>> dynamicFormAnswers = {};
  final Map<String, dynamic> mergedBom = {};
  final List<Map<String, dynamic>> backendDocuments = [];
  final List<String> rejectionReasons = [];

  String get cacheKey => workflow.activityFacilityCacheKey;
  String get facilityName => workflow.facilityTitle;

  String labelFor(SolarAssetType type) => assetTypeLabels[type] ?? type.label;
  int minimumFor(SolarAssetType type) => minimumCounts[type] ?? 1;
  int maximumFor(SolarAssetType type) => maximumCounts[type] ?? 10;
  int activationCountFor(SolarAssetType type) =>
      minimumFor(type) > 0 ? minimumFor(type) : 1;
  List<String> warrantiesFor(SolarAssetType type) =>
      warrantyOptions[type] ?? const [];
  List<String> brandsFor(SolarAssetType type) => brandOptions[type] ?? const [];

  int countFor(SolarAssetType type) => counts[type] ?? 0;

  void setCount(SolarAssetType type, int count) {
    final maximum = maximumFor(type);
    if (maximum <= 0) {
      counts[type] = 0;
      assets[type]!.assets.clear();
      return;
    }
    if (count <= 0) {
      if (countFor(type) == 0) {
        counts[type] = 0;
        assets[type]!.assets.clear();
      }
      return;
    }
    final lowerBound = activationCountFor(type);
    final normalized = count.clamp(lowerBound, maximum);
    counts[type] = normalized;
    reconcileEntries(type);
  }

  /// Keeps the selected count and its editable unit slots in lockstep.
  /// Cached drafts created by older app versions can contain a count without
  /// the corresponding entry maps; padding those slots prevents an otherwise
  /// empty Add New Asset page while preserving every entry that does exist.
  void reconcileEntries(SolarAssetType type) {
    final selectedCount = countFor(type);
    final entries = assets[type]!.assets;
    while (entries.length < selectedCount) {
      entries.add(SolarAssetEntry());
    }
    if (entries.length > selectedCount) {
      entries.removeRange(selectedCount, entries.length);
    }
  }

  void resetCount(SolarAssetType type) {
    counts[type] = 0;
    assets[type]!.assets.clear();
  }

  bool completeFor(SolarAssetType type) {
    final count = countFor(type);
    if (count == 0) return false;
    return assets[type]!.assets.length == count && assets[type]!.isComplete;
  }

  bool get allCountsEntered => applicableTypes.every((type) =>
      maximumFor(type) > 0 &&
      countFor(type) >= activationCountFor(type) &&
      countFor(type) <= maximumFor(type));
  bool get allAssetTypesComplete => applicableTypes.every(completeFor);
  bool get installationImagesComplete =>
      installationRequirements.isNotEmpty &&
      installationRequirements.every((requirement) =>
          (installationMedia[requirement.code]?.length ?? 0) >=
              requirement.requiredCount &&
          (installationMedia[requirement.code] ?? const <SolarFileRef>[])
              .every((file) => file.hasCompleteNewDocumentMetadata));
  bool get canSubmit =>
      allAssetTypesComplete &&
      installationImagesComplete &&
      completionReportFiles
          .every((file) => file.hasCompleteNewDocumentMetadata);
  bool get allDocumentsMetadataComplete => [
        ...completionReportFiles,
        for (final files in installationMedia.values) ...files,
        for (final asset in assets.values) ...[
          ...asset.images,
          ...asset.videos,
          for (final entry in asset.assets)
            if (entry.supportingPhoto != null) entry.supportingPhoto!,
        ],
      ].every((file) => file.hasCompleteNewDocumentMetadata);
  bool get isReadOnly =>
      mode == SolarWorkflowMode.pending || mode == SolarWorkflowMode.approved;
}
