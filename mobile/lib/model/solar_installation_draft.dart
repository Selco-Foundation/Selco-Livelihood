import 'activity_facility_workflow/activity_facility_workflow.dart';
import 'facility_report.dart';
import 'mdms/common_masters.dart';

enum SolarAssetType { battery, inverter, panel }

typedef SolarBomFields = ({
  List<String> product,
  List<String> make,
  List<String> capacity,
  List<String> quantity,
});

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

  SolarBomFields get bomFields => switch (this) {
        SolarAssetType.battery => (
            product: const ['bom_battery_product'],
            make: const ['bom_battery_make'],
            capacity: const ['bom_battery_capacity'],
            quantity: const ['bom_battery_quantity'],
          ),
        SolarAssetType.inverter => (
            product: const [
              'bom_inverter_pcu_product',
              'bom_charge_controller_product',
            ],
            make: const [
              'bom_inverter_pcu_make',
              'bom_charge_controller_make',
            ],
            capacity: const [
              'bom_inverter_pcu_capacity',
              'bom_charge_controller_capacity',
            ],
            quantity: const [
              'bom_inverter_pcu_quantity',
              'bom_charge_controller_quantity',
            ],
          ),
        SolarAssetType.panel => (
            product: const ['bom_solar_panel_product'],
            make: const ['bom_solar_panel_make'],
            capacity: const ['bom_solar_panel_capacity'],
            quantity: const ['bom_solar_panel_quantity'],
          ),
      };

  String get bomQuantityField => bomFields.quantity.first;
  String get bomProductField => bomFields.product.first;
}

enum SolarWorkflowMode { newReport, pending, resubmission, approved }

enum SolarFileKind { image, video, pdf }

class SolarFileRef {
  const SolarFileRef({
    required this.name,
    required this.path,
    required this.kind,
    this.displayTitle,
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
  final String? displayTitle;
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
  String get viewerTitle =>
      displayTitle?.trim().isNotEmpty == true ? displayTitle!.trim() : name;

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
    String? displayTitle,
    String? localPath,
    String? documentType,
    String? documentUid,
    Map<String, dynamic>? geoLocation,
  }) =>
      SolarFileRef(
        name: name,
        path: path,
        kind: kind,
        displayTitle: displayTitle ?? this.displayTitle,
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
        if (displayTitle != null) 'displayTitle': displayTitle,
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
        displayTitle: json['displayTitle']?.toString(),
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
  final Set<SolarAssetType> _userSelectedCounts = {};
  final Map<SolarAssetType, String> assetTypeCodes = {};
  final Map<SolarAssetType, String> assetTypeLabels = {};
  final Map<SolarAssetType, List<String>> brandOptions = {};
  final Map<SolarAssetType, List<String>> warrantyOptions = {};
  final List<String> bomFormNames = [];
  final Map<String, Map<String, dynamic>> dynamicFormAnswers = {};
  final Map<String, dynamic> mergedBom = {};
  final List<Map<String, dynamic>> backendDocuments = [];
  final List<WorkflowComment> rejectionComments = [];

  List<WorkflowComment> rejectionCommentsFor(SolarAssetType type) {
    final code = (assetTypeCodes[type] ?? type.name).trim().toUpperCase();
    return rejectionComments
        .where((comment) =>
            comment.assetType?.trim().toUpperCase() == code ||
            comment.assetType?.trim().toUpperCase() == type.name.toUpperCase())
        .toList();
  }

  List<WorkflowComment> installationRejectionComments(String code) {
    final expected = 'INSTALLATION_IMAGE_${code.trim().toUpperCase()}';
    return rejectionComments
        .where((comment) => comment.assetType?.trim().toUpperCase() == expected)
        .toList();
  }

  List<WorkflowComment> get otherRejectionComments => rejectionComments.where(
        (comment) {
          final type = comment.assetType?.trim().toUpperCase() ?? '';
          final isAsset = SolarAssetType.values.any((assetType) {
            final code =
                (assetTypeCodes[assetType] ?? assetType.name).toUpperCase();
            return type == code || type == assetType.name.toUpperCase();
          });
          return !isAsset && !type.startsWith('INSTALLATION_IMAGE_');
        },
      ).toList();

  String get cacheKey => workflow.activityFacilityCacheKey;
  String get facilityName => workflow.facilityTitle;

  String labelFor(SolarAssetType type) => assetTypeLabels[type] ?? type.label;
  List<String> warrantiesFor(SolarAssetType type) =>
      warrantyOptions[type] ?? const [];
  List<String> brandsFor(SolarAssetType type) => brandOptions[type] ?? const [];

  int countFor(SolarAssetType type) => counts[type] ?? 0;
  bool hasUserSelectedCount(SolarAssetType type) =>
      _userSelectedCounts.contains(type);

  void setCount(SolarAssetType type, int count) {
    if (count <= 0) {
      if (countFor(type) == 0) {
        counts[type] = 0;
        assets[type]!.assets.clear();
      }
      return;
    }
    counts[type] = count;
    _userSelectedCounts.add(type);
    reconcileEntries(type);
    syncCountToBom(type);
  }

  void seedCountFromBom(SolarAssetType type, int count) {
    if (hasUserSelectedCount(type)) {
      syncCountToBom(type);
      return;
    }
    counts[type] = count > 0 ? count : 0;
    reconcileEntries(type);
  }

  void syncCountToBom(SolarAssetType type) {
    final fieldName = _quantityFieldForWrite(type);
    final count = countFor(type);
    mergedBom[fieldName] = count;
    for (final answers in dynamicFormAnswers.values) {
      if (answers.containsKey(fieldName)) answers[fieldName] = count;
    }
  }

  void syncCountsToBom() {
    for (final type in applicableTypes) {
      syncCountToBom(type);
    }
  }

  /// Keeps the selected count and its editable unit slots in lockstep.
  /// Cached drafts created by older app versions can contain a count without
  /// the corresponding entry maps; padding those slots prevents an otherwise
  /// empty Add New Asset page while preserving every entry that does exist.
  void reconcileEntries(SolarAssetType type) {
    final selectedCount = countFor(type);
    final asset = assets[type]!;
    final entries = asset.assets;
    final batteryType = entries.isEmpty ? '' : entries.first.batteryType;
    final product = resolvedBomText(type.bomFields.product);
    while (entries.length < selectedCount) {
      entries.add(SolarAssetEntry(
        itemCode: product.isEmpty ? null : product,
        capacity: asset.totalCapacity,
        batteryType: type == SolarAssetType.battery ? batteryType : '',
      ));
    }
    if (entries.length > selectedCount) {
      entries.removeRange(selectedCount, entries.length);
    }
  }

  void resetCount(SolarAssetType type) {
    counts[type] = 0;
    _userSelectedCounts.remove(type);
    assets[type]!.assets.clear();
  }

  bool completeFor(SolarAssetType type) {
    final count = countFor(type);
    if (count == 0) return false;
    return assets[type]!.assets.length == count && assets[type]!.isComplete;
  }

  bool get allCountsEntered =>
      applicableTypes.every((type) => countFor(type) > 0);
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

  String resolvedBomText(Iterable<String> fields) {
    for (final field in fields) {
      final value = (mergedBom[field] ?? '').toString().trim();
      if (value.isNotEmpty) return value;
    }
    return '';
  }

  int resolvedBomQuantity(Iterable<String> fields) {
    for (final field in fields) {
      final value = _positiveWholeNumber(mergedBom[field]);
      if (value != null) return value;
    }
    return 0;
  }

  String _quantityFieldForWrite(SolarAssetType type) {
    final fields = type.bomFields;
    final primary = fields.quantity.first;
    final fallback = fields.quantity.length > 1 ? fields.quantity[1] : null;
    if (_positiveWholeNumber(mergedBom[primary]) != null) return primary;
    if (fallback != null && _positiveWholeNumber(mergedBom[fallback]) != null) {
      return fallback;
    }
    if (mergedBom.containsKey(primary)) return primary;
    if (fallback != null && mergedBom.containsKey(fallback)) return fallback;

    final primaryFamily = [
      fields.product.first,
      fields.make.first,
      fields.capacity.first,
    ];
    if (primaryFamily.any(mergedBom.containsKey)) return primary;
    if (fallback != null) {
      final fallbackFamily = [
        fields.product[1],
        fields.make[1],
        fields.capacity[1],
      ];
      if (fallbackFamily.any(mergedBom.containsKey)) return fallback;
    }
    return primary;
  }

  int? _positiveWholeNumber(dynamic value) {
    final parsed = value is num ? value : num.tryParse('$value');
    if (parsed == null || parsed <= 0 || parsed != parsed.truncate()) {
      return null;
    }
    return parsed.toInt();
  }
}
