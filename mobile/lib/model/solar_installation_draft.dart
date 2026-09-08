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
  });

  final String name;
  final String path;
  final SolarFileKind kind;
  final String? remoteId;
  final String? mimeType;
  final String? documentType;
  final String? localPath;

  bool get isRemote => remoteId?.isNotEmpty == true || path.startsWith('http');

  SolarFileRef copyWith({String? localPath}) => SolarFileRef(
        name: name,
        path: path,
        kind: kind,
        remoteId: remoteId,
        mimeType: mimeType,
        documentType: documentType,
        localPath: localPath ?? this.localPath,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'path': path,
        'kind': kind.name,
        if (remoteId != null) 'remoteId': remoteId,
        if (mimeType != null) 'mimeType': mimeType,
        if (documentType != null) 'documentType': documentType,
        if (localPath != null) 'localPath': localPath,
      };

  factory SolarFileRef.fromJson(Map<String, dynamic> json) => SolarFileRef(
        name: (json['name'] ?? '').toString(),
        path: (json['path'] ?? json['fileStoreId'] ?? '').toString(),
        kind: SolarFileKind.values.firstWhere(
          (value) => value.name == json['kind'],
          orElse: () => _kindFromName((json['name'] ?? '').toString()),
        ),
        remoteId:
            json['remoteId']?.toString() ?? json['fileStoreId']?.toString(),
        mimeType: json['mimeType']?.toString(),
        documentType: json['documentType']?.toString(),
        localPath: json['localPath']?.toString(),
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
    this.serialNumber = '',
    this.capacity = '',
    this.supportingPhoto,
    this.fields = const {},
  });

  String serialNumber;
  String capacity;
  SolarFileRef? supportingPhoto;
  Map<String, dynamic> fields;

  bool get isComplete =>
      serialNumber.trim().isNotEmpty &&
      capacity.trim().isNotEmpty &&
      supportingPhoto != null;
}

class SolarAssetDraft {
  SolarAssetDraft({required this.type});

  final SolarAssetType type;
  String system = '';
  String totalCapacity = '';
  String capacityUnit = '';
  String warrantyStartDate = '';
  String warrantyDuration = '';
  final List<SolarAssetEntry> assets = [];
  final List<SolarFileRef> images = [];
  final List<SolarFileRef> videos = [];
  String? selectedBrandCode;
  final Map<String, List<String>> formOptions = {};
  final List<String> typeOptions = [];

  bool get detailsComplete => warrantyDuration.isNotEmpty;
  bool get isComplete =>
      detailsComplete &&
      assets.isNotEmpty &&
      assets.every((asset) => asset.isComplete) &&
      images.isNotEmpty;
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
  List<SolarAssetType> applicableTypes = const [];
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
  List<String> warrantiesFor(SolarAssetType type) =>
      warrantyOptions[type] ?? const [];
  List<String> brandsFor(SolarAssetType type) => brandOptions[type] ?? const [];

  int countFor(SolarAssetType type) => counts[type] ?? 0;

  void setCount(SolarAssetType type, int count) {
    counts[type] = count.clamp(minimumFor(type), maximumFor(type));
    final entries = assets[type]!.assets;
    while (entries.length < count) {
      entries.add(SolarAssetEntry());
    }
    if (entries.length > count) {
      entries.removeRange(count, entries.length);
    }
  }

  bool completeFor(SolarAssetType type) {
    final count = countFor(type);
    if (count == 0) return minimumFor(type) == 0;
    return assets[type]!.assets.length == count && assets[type]!.isComplete;
  }

  bool get allCountsEntered => applicableTypes.every((type) =>
      countFor(type) >= minimumFor(type) && countFor(type) <= maximumFor(type));
  bool get allAssetTypesComplete => applicableTypes.every(completeFor);
  bool get installationImagesComplete =>
      installationRequirements.isNotEmpty &&
      installationRequirements.every((requirement) =>
          (installationMedia[requirement.code]?.length ?? 0) >=
          requirement.requiredCount);
  bool get canSubmit => allAssetTypesComplete && installationImagesComplete;
  bool get isReadOnly =>
      mode == SolarWorkflowMode.pending || mode == SolarWorkflowMode.approved;
}
