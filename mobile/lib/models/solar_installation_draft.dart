import 'facility_report_sample.dart';

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

  String get brand => switch (this) {
        SolarAssetType.battery => 'Exide',
        SolarAssetType.inverter => 'Luminous',
        SolarAssetType.panel => 'Waaree',
      };

  String get specificationType => switch (this) {
        SolarAssetType.battery => 'Tubular',
        SolarAssetType.inverter => 'Hybrid',
        SolarAssetType.panel => 'Monocrystalline',
      };
}

enum SolarWorkflowMode { newReport, pending, resubmission, approved }

enum SolarFileKind { image, video, pdf }

class SolarFileRef {
  const SolarFileRef({
    required this.name,
    required this.path,
    required this.kind,
  });

  final String name;
  final String path;
  final SolarFileKind kind;
}

class SolarAssetEntry {
  SolarAssetEntry({
    this.serialNumber = '',
    this.capacity = '',
    this.supportingPhoto,
  });

  String serialNumber;
  String capacity;
  SolarFileRef? supportingPhoto;

  bool get isComplete =>
      serialNumber.trim().isNotEmpty &&
      capacity.trim().isNotEmpty &&
      supportingPhoto != null;
}

class SolarAssetDraft {
  SolarAssetDraft({required this.type});

  final SolarAssetType type;
  String system = 'Solar PV System';
  String totalCapacity = '5';
  String capacityUnit = 'kW';
  String warrantyStartDate = '27/08/26';
  String warrantyDuration = '';
  final List<SolarAssetEntry> assets = [];
  final List<SolarFileRef> images = [];
  final List<SolarFileRef> videos = [];

  bool get detailsComplete => warrantyDuration.isNotEmpty;
  bool get isComplete =>
      detailsComplete &&
      assets.isNotEmpty &&
      assets.every((asset) => asset.isComplete) &&
      images.isNotEmpty;
}

class SolarInstallationDraft {
  SolarInstallationDraft({
    required this.facility,
    required this.mode,
  }) : assets = {
          for (final type in SolarAssetType.values)
            type: SolarAssetDraft(type: type),
        } {
    for (final type in SolarAssetType.values) {
      setCount(type, 1);
    }
  }

  factory SolarInstallationDraft.prefilled({
    required FacilityReportSample facility,
    required SolarWorkflowMode mode,
  }) {
    final draft = SolarInstallationDraft(facility: facility, mode: mode);
    for (final type in SolarAssetType.values) {
      draft.setCount(type, 1);
      final assetDraft = draft.assets[type]!;
      assetDraft.warrantyDuration = '5 Years';
      assetDraft.assets.clear();
      final count = draft.countFor(type);
      for (var index = 0; index < count; index++) {
        assetDraft.assets.add(
          SolarAssetEntry(
            serialNumber:
                '${type.name.substring(0, 3).toUpperCase()}-${index + 1}'
                    .padLeft(7, '0'),
            capacity: type == SolarAssetType.panel ? '550 W' : '1',
            supportingPhoto: SolarFileRef(
              name: '${type.name}_${index + 1}.jpg',
              path: '/demo/${type.name}_${index + 1}.jpg',
              kind: SolarFileKind.image,
            ),
          ),
        );
      }
      assetDraft.images.add(
        SolarFileRef(
          name: '${type.name}_installation.jpg',
          path: '/demo/${type.name}_installation.jpg',
          kind: SolarFileKind.image,
        ),
      );
    }

    draft.completionCertificate.add(
      const SolarFileRef(
        name: 'installation_completion_certificate.pdf',
        path: '/demo/installation_completion_certificate.pdf',
        kind: SolarFileKind.pdf,
      ),
    );
    draft.handoverDocuments.add(
      const SolarFileRef(
        name: 'asset_handover_document.pdf',
        path: '/demo/asset_handover_document.pdf',
        kind: SolarFileKind.pdf,
      ),
    );
    draft.completionReportFiles.add(
      const SolarFileRef(
        name: 'installation_completion_report.pdf',
        path: '/demo/installation_completion_report.pdf',
        kind: SolarFileKind.pdf,
      ),
    );
    for (final requirement in SolarInstallationDraft.imageRequirements) {
      draft.installationImages[requirement] = SolarFileRef(
        name: '${requirement.toLowerCase().replaceAll(' ', '_')}.jpg',
        path: '/demo/${requirement.toLowerCase().replaceAll(' ', '_')}.jpg',
        kind: SolarFileKind.image,
      );
    }
    return draft;
  }

  final FacilityReportSample facility;
  final SolarWorkflowMode mode;
  final Map<SolarAssetType, int> counts = {
    for (final type in SolarAssetType.values) type: 0,
  };
  final Map<SolarAssetType, SolarAssetDraft> assets;
  final List<SolarFileRef> completionCertificate = [];
  final List<SolarFileRef> handoverDocuments = [];
  final List<SolarFileRef> completionReportFiles = [];
  final Map<String, SolarFileRef?> installationImages = {
    for (final requirement in imageRequirements) requirement: null,
  };

  static const imageRequirements = <String>[
    'Solar panels and mounting structure',
    'Inverter and battery installation',
    'Completed installation with end user',
  ];

  int countFor(SolarAssetType type) => counts[type] ?? 0;

  void setCount(SolarAssetType type, int count) {
    counts[type] = count.clamp(0, 10);
    final entries = assets[type]!.assets;
    while (entries.length < count) {
      entries.add(
        SolarAssetEntry(
          capacity: switch (type) {
            SolarAssetType.battery => '150 Ah',
            SolarAssetType.inverter => '5 kVA',
            SolarAssetType.panel => '550 W',
          },
        ),
      );
    }
    if (entries.length > count) {
      entries.removeRange(count, entries.length);
    }
  }

  bool completeFor(SolarAssetType type) =>
      countFor(type) > 0 &&
      assets[type]!.assets.length == countFor(type) &&
      assets[type]!.isComplete;

  bool get allCountsEntered => counts.values.every((count) => count > 0);
  bool get allAssetTypesComplete => SolarAssetType.values.every(completeFor);
  bool get completionDocumentsComplete =>
      completionCertificate.isNotEmpty && handoverDocuments.isNotEmpty;
  bool get installationImagesComplete =>
      installationImages.values.every((file) => file != null);
  bool get canSubmit =>
      allAssetTypesComplete &&
      completionDocumentsComplete &&
      installationImagesComplete;
  bool get isReadOnly =>
      mode == SolarWorkflowMode.pending || mode == SolarWorkflowMode.approved;
}
