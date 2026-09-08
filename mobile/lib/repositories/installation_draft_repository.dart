import 'dart:async';

import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../model/bom/bom.dart';
import '../model/solar_installation_draft.dart';
import 'asset_mdms_repository.dart';
import 'asset_repository.dart';
import 'bom_repository.dart';
import 'installation_cache_repo.dart';

class InstallationDraftRepository {
  Future<SolarInstallationDraft> loadSolar(
    ActivityFacilityWorkflow workflow,
    SolarWorkflowMode mode,
  ) async {
    await assetMdmsRepository.load();
    final draft = createSolar(workflow, mode);
    final id = workflow.activityFacility.id;
    if (!draft.isReadOnly && id != null && id.isNotEmpty) {
      try {
        final local =
            await installationCacheRepository.getJson('solar-draft', id);
        if (local is Map) {
          _hydrateLocal(draft, Map<String, dynamic>.from(local));
        }
      } catch (_) {
        // Continue with the MDMS/template draft when local storage is absent.
      }
    }
    _configureMdms(draft, workflow);
    return draft;
  }

  SolarInstallationDraft createSolar(
    ActivityFacilityWorkflow workflow,
    SolarWorkflowMode mode,
  ) {
    final draft = SolarInstallationDraft(workflow: workflow, mode: mode);
    _configureMdms(draft, workflow);
    final details = workflow.activityFacility.additionalDetails;
    draft.mergedBom.addAll(details?.bom ?? const {});
    _hydrateComponent(draft, SolarAssetType.battery, details?.battery);
    _hydrateComponent(draft, SolarAssetType.inverter, details?.inverter);
    _hydrateComponent(draft, SolarAssetType.panel, details?.panel);
    draft.backendDocuments.addAll(details?.documents ?? const []);
    draft.backendDocuments.addAll(workflow.workflow?.documents ?? const []);
    _hydrateDocuments(draft, details?.documents ?? const []);
    _hydrateDocuments(draft, workflow.workflow?.documents ?? const []);
    if (workflow.workflow?.comment?.trim().isNotEmpty == true) {
      draft.rejectionReasons.add(workflow.workflow!.comment!.trim());
    }
    return draft;
  }

  Future<void> hydrateSolar(SolarInstallationDraft draft) async {
    await assetMdmsRepository.load();
    _configureMdms(draft, draft.workflow);
    final id = draft.workflow.activityFacility.id;
    if (id != null && id.isNotEmpty) {
      // Start independent sources together, then apply them in deterministic
      // template -> backend -> asset snapshot -> local draft order.
      final backendFuture = _safeBomSearch(id);
      final assetsFuture = _safeAssetSearch(id);
      final localFuture = _safeLocalDraft(id);
      final backend = await backendFuture;
      final assets = await assetsFuture;
      final local = await localFuture;
      _mergeBackend(draft, backend);
      _mergeAssets(draft, assets);
      if (!draft.isReadOnly && local is Map) {
        _hydrateLocal(draft, Map<String, dynamic>.from(local));
      }
    }
    _configureMdms(draft, draft.workflow);
  }

  Future<List<BillOfMaterial>> _safeBomSearch(String id) async {
    try {
      return await bomRepository.search(id);
    } catch (_) {
      return const [];
    }
  }

  Future<List<Map<String, dynamic>>> _safeAssetSearch(String id) async {
    try {
      return await assetRepository.search(id);
    } catch (_) {
      return const [];
    }
  }

  Future<dynamic> _safeLocalDraft(String id) async {
    try {
      return await installationCacheRepository.getJson('solar-draft', id);
    } catch (_) {
      return null;
    }
  }

  void _mergeAssets(
    SolarInstallationDraft draft,
    List<Map<String, dynamic>> values,
  ) {
    final grouped = <SolarAssetType, List<SolarAssetEntry>>{};
    for (final value in values) {
      final rawType = (value['assetTypeID'] ??
              value['assetTypeCode'] ??
              value['assetType'] ??
              '')
          .toString();
      final type = _solarType(rawType, rawType);
      if (type == null) continue;
      final details = value['additionalDetails'] is Map
          ? Map<String, dynamic>.from(value['additionalDetails'] as Map)
          : const <String, dynamic>{};
      final documents = (value['documents'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
      SolarFileRef? photo;
      if (documents.isNotEmpty) {
        final temporary =
            SolarInstallationDraft(workflow: draft.workflow, mode: draft.mode);
        _hydrateDocuments(temporary, documents);
        photo = temporary.completionReportFiles.firstOrNull;
      }
      grouped.putIfAbsent(type, () => []).add(SolarAssetEntry(
            serialNumber:
                (value['serialNumber'] ?? details['serialNumber'] ?? '')
                    .toString(),
            capacity:
                (details['capacity'] ?? value['capacity'] ?? '').toString(),
            supportingPhoto: photo,
            fields: details,
          ));
    }
    for (final entry in grouped.entries) {
      draft.setCount(entry.key, entry.value.length);
      draft.assets[entry.key]!.assets
        ..clear()
        ..addAll(entry.value);
    }
  }

  Future<void> saveSolar(SolarInstallationDraft draft) async {
    final key = draft.cacheKey;
    await installationCacheRepository.putJson('solar-draft', key, {
      'systemCode': draft.systemCode,
      'counts': {
        for (final entry in draft.counts.entries) entry.key.name: entry.value,
      },
      'assets': {
        for (final entry in draft.assets.entries)
          entry.key.name: {
            'system': entry.value.system,
            'totalCapacity': entry.value.totalCapacity,
            'capacityUnit': entry.value.capacityUnit,
            'warrantyStartDate': entry.value.warrantyStartDate,
            'warrantyDuration': entry.value.warrantyDuration,
            'selectedBrandCode': entry.value.selectedBrandCode,
            'entries': entry.value.assets
                .map((asset) => {
                      'serialNumber': asset.serialNumber,
                      'capacity': asset.capacity,
                      'fields': asset.fields,
                      if (asset.supportingPhoto != null)
                        'supportingPhoto': asset.supportingPhoto!.toJson(),
                    })
                .toList(),
            'images': entry.value.images.map((file) => file.toJson()).toList(),
            'videos': entry.value.videos.map((file) => file.toJson()).toList(),
          },
      },
      'dynamicFormAnswers': draft.dynamicFormAnswers,
      'mergedBom': draft.mergedBom,
      'completionReportFiles':
          draft.completionReportFiles.map((file) => file.toJson()).toList(),
      'installationMedia': {
        for (final entry in draft.installationMedia.entries)
          entry.key: entry.value.map((file) => file.toJson()).toList(),
      },
    });
  }

  void saveSolarSoon(SolarInstallationDraft draft) {
    if (!draft.isReadOnly) unawaited(saveSolar(draft));
  }

  void _configureMdms(
    SolarInstallationDraft draft,
    ActivityFacilityWorkflow workflow,
  ) {
    final details = workflow.activityFacility.additionalDetails;
    final facility = workflow.activityFacility.facility;
    final bom = details?.bom ?? const <String, dynamic>{};
    final rawSystem = details?.systemCode ??
        facility?.facilityDetails?.solutionDesignType ??
        facility?.facilityDetails?.systemCode ??
        facility?.facilityDetails?.systemType ??
        facility?.systemCode ??
        facility?.systemType ??
        facility?.additionalDetails?['systemCode']?.toString() ??
        facility?.additionalDetails?['systemType']?.toString() ??
        bom['systemCode']?.toString() ??
        bom['system_type']?.toString();
    final normalizedSystem = rawSystem?.trim().toUpperCase();
    final design = assetMdmsRepository.solutionDesigns
        .where((item) =>
            item.code.trim().toUpperCase() == normalizedSystem ||
            item.systemCode.trim().toUpperCase() == normalizedSystem)
        .firstOrNull;
    draft.systemCode = design?.systemCode ??
        rawSystem?.trim() ??
        (assetMdmsRepository.solutionBomMappings
                .any((item) => item.systemCode == 'DC')
            ? 'DC'
            : null);

    final mdmsTypes =
        assetMdmsRepository.assetTypes(systemCode: draft.systemCode);
    final applicable = <SolarAssetType>[];
    for (final type in mdmsTypes) {
      final local = _solarType(type.code, type.name);
      if (local == null) continue;
      applicable.add(local);
      draft.assetTypeCodes[local] = type.code;
      draft.assetTypeLabels[local] = type.name;
      final constraint = assetMdmsRepository.countFor(type.code);
      if (constraint != null) {
        draft.minimumCounts[local] = constraint.min;
        draft.maximumCounts[local] = constraint.max;
        if (draft.countFor(local) == 0 && draft.assets[local]!.assets.isEmpty) {
          draft.setCount(local, constraint.min);
        }
      }
      draft.brandOptions[local] = assetMdmsRepository
          .brandsFor(type.code)
          .map((brand) => brand.name)
          .toList();
      draft.warrantyOptions[local] = assetMdmsRepository
          .warrantiesFor(type.code)
          .map((warranty) => '${warranty.duration} ${warranty.format}')
          .toList();
      final assetDraft = draft.assets[local]!;
      assetDraft.formOptions.clear();
      assetDraft.typeOptions.clear();
      final systemName = assetMdmsRepository.systems
          .where((system) => system.code == draft.systemCode)
          .map((system) => system.name)
          .firstOrNull;
      if (systemName != null) assetDraft.system = systemName;
      for (final field in type.formFields.where((field) =>
          field.system == null || field.system == draft.systemCode)) {
        final key = field.key;
        if (key != null && field.options?.isNotEmpty == true) {
          assetDraft.formOptions[key] = List.of(field.options!);
        }
        if (field.types?.isNotEmpty == true) {
          assetDraft.typeOptions.addAll(field.types!);
        }
      }
      final total = assetDraft.formOptions['total_capacity'];
      final totalUnit = assetDraft.formOptions['total_capacity_uom'];
      if (total?.isNotEmpty == true) {
        assetDraft.totalCapacity = total!.first;
      }
      if (totalUnit?.isNotEmpty == true) {
        assetDraft.capacityUnit = totalUnit!.first;
      }
      final capacity = assetDraft.formOptions['capacity'];
      final capacityUnit = assetDraft.formOptions['capacity_uom'];
      if (capacity?.isNotEmpty == true) {
        for (final entry in assetDraft.assets) {
          entry.capacity =
              '${capacity!.first}${capacityUnit?.isNotEmpty == true ? ' ${capacityUnit!.first}' : ''}';
        }
      }
    }
    if (applicable.isNotEmpty) {
      draft.applicableTypes = applicable.toSet().toList();
    }
    draft.bomFormNames
      ..clear()
      ..addAll(assetMdmsRepository.formsFor(draft.systemCode));
    draft.installationRequirements =
        assetMdmsRepository.installationImagesFor(draft.systemCode);
  }

  void _hydrateComponent(
    SolarInstallationDraft draft,
    SolarAssetType type,
    Map<String, dynamic>? value,
  ) {
    if (value == null) return;
    final asset = draft.assets[type]!;
    final brand = value['brandName']?.toString();
    asset.selectedBrandCode =
        brand?.isNotEmpty == true ? brand : value['brandCode']?.toString();
    final capacity = value['capacity']?.toString();
    if (capacity != null && capacity.isNotEmpty) {
      asset.totalCapacity = capacity;
    }
  }

  void _mergeBackend(
      SolarInstallationDraft draft, List<BillOfMaterial> values) {
    for (final bom in values) {
      draft.mergedBom.addAll(bom.data);
      if (bom.name != null) {
        draft.dynamicFormAnswers.putIfAbsent(bom.name!, () => Map.of(bom.data));
      }
      draft.backendDocuments.addAll(bom.documents);
      _hydrateDocuments(draft, bom.documents);
    }
  }

  void _hydrateDocuments(
    SolarInstallationDraft draft,
    List<Map<String, dynamic>> documents,
  ) {
    for (final document in documents) {
      final remoteId =
          (document['fileStoreId'] ?? document['fileStore'] ?? document['id'])
              ?.toString();
      if (remoteId == null || remoteId.isEmpty) continue;
      final type =
          (document['documentType'] ?? document['type'] ?? '').toString();
      final name = (document['fileName'] ??
              document['name'] ??
              document['documentUid'] ??
              type)
          .toString();
      final lower = '${document['mimeType'] ?? ''} $name'.toLowerCase();
      final kind = lower.contains('pdf')
          ? SolarFileKind.pdf
          : lower.contains('video') ||
                  lower.endsWith('.mp4') ||
                  lower.endsWith('.mov')
              ? SolarFileKind.video
              : SolarFileKind.image;
      final media = SolarFileRef(
        name: name.isEmpty ? remoteId : name,
        path: remoteId,
        remoteId: remoteId,
        kind: kind,
        mimeType: document['mimeType']?.toString(),
        documentType: type,
      );
      if (type.startsWith('INSTALLATION_IMAGE-')) {
        final code =
            type.substring('INSTALLATION_IMAGE-'.length).split('-').first;
        final target = draft.installationMedia.putIfAbsent(code, () => []);
        if (!target.any((item) => item.remoteId == remoteId)) target.add(media);
      } else if (!draft.completionReportFiles
          .any((item) => item.remoteId == remoteId)) {
        draft.completionReportFiles.add(media);
      }
    }
  }

  void _hydrateLocal(SolarInstallationDraft draft, Map<String, dynamic> json) {
    final counts = json['counts'];
    if (counts is Map) {
      for (final type in SolarAssetType.values) {
        final value = counts[type.name];
        if (value is num) draft.setCount(type, value.toInt());
      }
    }
    final assets = json['assets'];
    if (assets is Map) {
      for (final type in SolarAssetType.values) {
        final raw = assets[type.name];
        if (raw is! Map) continue;
        final value = Map<String, dynamic>.from(raw);
        final target = draft.assets[type]!;
        target.system = value['system']?.toString() ?? target.system;
        target.totalCapacity =
            value['totalCapacity']?.toString() ?? target.totalCapacity;
        target.capacityUnit =
            value['capacityUnit']?.toString() ?? target.capacityUnit;
        target.warrantyStartDate =
            value['warrantyStartDate']?.toString() ?? target.warrantyStartDate;
        target.warrantyDuration =
            value['warrantyDuration']?.toString() ?? target.warrantyDuration;
        target.selectedBrandCode = value['selectedBrandCode']?.toString();
        final entries = value['entries'];
        if (entries is List) {
          target.assets
            ..clear()
            ..addAll(entries.whereType<Map>().map((rawEntry) {
              final entry = Map<String, dynamic>.from(rawEntry);
              return SolarAssetEntry(
                serialNumber: entry['serialNumber']?.toString() ?? '',
                capacity: entry['capacity']?.toString() ?? '',
                fields: entry['fields'] is Map
                    ? Map<String, dynamic>.from(entry['fields'] as Map)
                    : const {},
                supportingPhoto: entry['supportingPhoto'] is Map
                    ? SolarFileRef.fromJson(Map<String, dynamic>.from(
                        entry['supportingPhoto'] as Map))
                    : null,
              );
            }));
        }
        target.images
          ..clear()
          ..addAll(_files(value['images']));
        target.videos
          ..clear()
          ..addAll(_files(value['videos']));
      }
    }
    if (json['dynamicFormAnswers'] is Map) {
      for (final entry in (json['dynamicFormAnswers'] as Map).entries) {
        if (entry.value is Map) {
          draft.dynamicFormAnswers[entry.key.toString()] =
              Map<String, dynamic>.from(entry.value as Map);
        }
      }
    }
    if (json['mergedBom'] is Map) {
      draft.mergedBom
          .addAll(Map<String, dynamic>.from(json['mergedBom'] as Map));
    }
    draft.completionReportFiles
      ..clear()
      ..addAll(_files(json['completionReportFiles']));
    if (json['installationMedia'] is Map) {
      for (final entry in (json['installationMedia'] as Map).entries) {
        draft.installationMedia[entry.key.toString()] = _files(entry.value);
      }
    }
  }

  List<SolarFileRef> _files(dynamic value) =>
      (value as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((item) => SolarFileRef.fromJson(Map<String, dynamic>.from(item)))
          .toList();

  SolarAssetType? _solarType(String code, String name) {
    final value = '$code $name'.toLowerCase();
    if (value.contains('batter')) return SolarAssetType.battery;
    if (value.contains('inverter') || value.contains('pcu')) {
      return SolarAssetType.inverter;
    }
    if (value.contains('panel') || value.contains('module')) {
      return SolarAssetType.panel;
    }
    return null;
  }
}

final installationDraftRepository = InstallationDraftRepository();

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
