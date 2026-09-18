import 'dart:async';

import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../model/bom/bom.dart';
import '../model/solar_installation_draft.dart';
import '../utils/warranty.dart';
import 'asset_mdms_repository.dart';
import 'asset_repository.dart';
import 'bom_repository.dart';
import 'installation_cache_repo.dart';

class InstallationDraftRepository {
  InstallationDraftRepository({
    AssetMdmsRepository? mdmsRepository,
    Future<List<BillOfMaterial>> Function(String id)? bomSearch,
    Future<List<Map<String, dynamic>>> Function(String id)? assetSearch,
    Future<dynamic> Function(String id)? localDraft,
  })  : _mdmsRepository = mdmsRepository ?? assetMdmsRepository,
        _bomSearch = bomSearch ?? bomRepository.search,
        _assetSearch = assetSearch ?? assetRepository.search,
        _localDraft = localDraft ??
            ((id) => installationCacheRepository.getJson('solar-draft', id));

  final AssetMdmsRepository _mdmsRepository;
  final Future<List<BillOfMaterial>> Function(String id) _bomSearch;
  final Future<List<Map<String, dynamic>>> Function(String id) _assetSearch;
  final Future<dynamic> Function(String id) _localDraft;

  Future<SolarInstallationDraft> loadSolar(
    ActivityFacilityWorkflow workflow,
    SolarWorkflowMode mode,
  ) async {
    await _mdmsRepository.load();
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
    _configureFromBom(draft);
    return draft;
  }

  SolarInstallationDraft createSolar(
    ActivityFacilityWorkflow workflow,
    SolarWorkflowMode mode,
  ) {
    final draft = SolarInstallationDraft(workflow: workflow, mode: mode);
    final details = workflow.activityFacility.additionalDetails;
    draft.mergedBom.addAll(details?.bom ?? const {});
    final embedded = workflow.activityFacility.billOfMaterial;
    if (embedded != null) {
      draft.mergedBom.addAll(embedded.data);
      draft.remoteBomId = embedded.id;
      draft.remoteBomName = embedded.name;
      draft.remoteBomAdditionalDetails = embedded.additionalDetails;
      draft.backendDocuments.addAll(embedded.documents);
    }
    _configureFromBom(draft);
    _hydrateComponent(draft, SolarAssetType.battery, details?.battery);
    _hydrateComponent(draft, SolarAssetType.inverter, details?.inverter);
    _hydrateComponent(draft, SolarAssetType.panel, details?.panel);
    draft.backendDocuments.addAll(details?.documents ?? const []);
    draft.backendDocuments.addAll(workflow.workflow?.documents ?? const []);
    _hydrateDocuments(draft, workflow.workflow?.documents ?? const []);
    draft.rejectionComments.addAll(workflow.latestTransactionComments);
    return draft;
  }

  Future<void> hydrateSolar(SolarInstallationDraft draft) async {
    await _mdmsRepository.load();
    _configureFromBom(draft);
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
      // Local drafts own user-entered form/asset data. Reapply fresh product,
      // make, and capacity metadata after the local overlay; a positive local
      // count remains authoritative and is synchronized back into the BOM by
      // `_configureFromBom`.
      applyFreshBomDerivedValues(draft, backend);
    }
    _configureFromBom(draft);
  }

  Future<List<BillOfMaterial>> _safeBomSearch(String id) async {
    try {
      return await _bomSearch(id);
    } catch (_) {
      return const [];
    }
  }

  Future<List<Map<String, dynamic>>> _safeAssetSearch(String id) async {
    try {
      return await _assetSearch(id);
    } catch (_) {
      return const [];
    }
  }

  Future<dynamic> _safeLocalDraft(String id) async {
    try {
      return await _localDraft(id);
    } catch (_) {
      return null;
    }
  }

  void _mergeAssets(
    SolarInstallationDraft draft,
    List<Map<String, dynamic>> values,
  ) {
    if (draft.isReadOnly) {
      for (final type in SolarAssetType.values) {
        draft.resetCount(type);
      }
    }
    final grouped = <SolarAssetType, List<SolarAssetEntry>>{};
    final warranties = <SolarAssetType, String>{};
    for (final value in values) {
      final rawType = (value['assetTypeID'] ??
              value['assetTypeCode'] ??
              value['assetType'] ??
              '')
          .toString();
      final type = _solarType(rawType, rawType);
      if (type == null) continue;
      final firstForType = grouped[type]?.isNotEmpty != true;
      if (firstForType) {
        final warranty = _normalizeWarranty(
          draft.warrantiesFor(type),
          value['warrantyDuration'] ?? value['warrantyDurationYears'],
        );
        if (warranty != null) warranties[type] = warranty;
      }
      final details = value['assetDetails'] is Map
          ? Map<String, dynamic>.from(value['assetDetails'] as Map)
          : const <String, dynamic>{};
      if ((draft.invoiceNumber ?? '').trim().isEmpty) {
        final invoiceNumber = details['invoiceNumber']?.toString().trim();
        if (invoiceNumber?.isNotEmpty == true) {
          draft.invoiceNumber = invoiceNumber;
        }
      }
      final extraFields = Map<String, dynamic>.from(details)
        ..remove('batteryType');
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
            assetId: (value['assetId'] ?? value['assetID'])?.toString(),
            itemCode: value['itemCode']?.toString(),
            serialNumber:
                (value['serialNumber'] ?? details['serialNumber'] ?? '')
                    .toString(),
            capacity:
                (details['capacity'] ?? value['capacity'] ?? '').toString(),
            batteryType: type == SolarAssetType.battery
                ? (details['batteryType'] ?? '').toString()
                : '',
            supportingPhoto: photo,
            fields: extraFields,
          ));
    }
    for (final entry in grouped.entries) {
      draft.setCount(entry.key, entry.value.length);
      final target = draft.assets[entry.key]!;
      target.assets
        ..clear()
        ..addAll(entry.value);
      final warranty = warranties[entry.key];
      if (warranty != null) target.warrantyDuration = warranty;
    }
  }

  String? _normalizeWarranty(List<String> options, Object? rawValue) {
    final value = rawValue?.toString().trim() ?? '';
    if (value.isEmpty) return null;
    final exact = options
        .where((option) => option.trim().toLowerCase() == value.toLowerCase())
        .firstOrNull;
    if (exact != null) return exact;
    final years = parseWarrantyYears(value);
    if (years <= 0) return null;
    return options
        .where((option) => parseWarrantyYears(option) == years)
        .firstOrNull;
  }

  Future<void> saveSolar(SolarInstallationDraft draft) async {
    draft.syncCountsToBom();
    final key = draft.cacheKey;
    await installationCacheRepository.putJson('solar-draft', key, {
      'systemCode': draft.systemCode,
      'invoiceNumber': draft.invoiceNumber,
      'counts': {
        for (final entry in draft.counts.entries) entry.key.name: entry.value,
      },
      'assets': {
        for (final entry in draft.assets.entries)
          entry.key.name: {
            'system': entry.value.system,
            'totalCapacity': entry.value.totalCapacity,
            'capacityUnit': entry.value.capacityUnit,
            'warrantyDuration': entry.value.warrantyDuration,
            'selectedBrandCode': entry.value.selectedBrandCode,
            'entries': entry.value.assets
                .map((asset) => {
                      if (asset.assetId != null) 'assetId': asset.assetId,
                      if (asset.itemCode != null) 'itemCode': asset.itemCode,
                      'serialNumber': asset.serialNumber,
                      'capacity': asset.capacity,
                      if (entry.key == SolarAssetType.battery)
                        'batteryType': asset.batteryType,
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

  void applyBomDerivedValues(SolarInstallationDraft draft) =>
      _configureFromBom(draft);

  void applyFreshBomDerivedValues(
    SolarInstallationDraft draft,
    List<BillOfMaterial> records,
  ) {
    BillOfMaterial? canonical;
    for (final bom in records) {
      if (_isCanonicalSolarBom(draft, bom)) canonical = bom;
    }
    if (canonical == null) return;
    for (final type in SolarAssetType.values) {
      final fields = type.bomFields;
      for (final key in {
        ...fields.product,
        ...fields.make,
        ...fields.capacity,
        ...fields.quantity,
      }) {
        // A missing fresh value must also replace stale cached data: it is
        // intentionally interpreted as an invalid/zero BOM configuration.
        if (canonical.data.containsKey(key)) {
          draft.mergedBom[key] = canonical.data[key];
        } else {
          draft.mergedBom.remove(key);
        }
      }
    }
  }

  void _configureFromBom(SolarInstallationDraft draft) {
    draft.solutionId = draft.workflow.activityFacility.solutionId ??
        draft.workflow.activityFacility.billOfMaterial?.solutionId;
    draft.systemCode = 'SOLAR';
    draft.applicableTypes = SolarAssetType.values;

    for (final type in SolarAssetType.values) {
      final mdmsType = _mdmsRepository.assetTypes
          .where((item) => _solarType(item.code, item.name) == type)
          .firstOrNull;
      draft.assetTypeCodes[type] = mdmsType?.code ?? type.name.toUpperCase();
      draft.assetTypeLabels[type] = mdmsType?.name ?? type.label;
      draft.warrantyOptions[type] = _mdmsRepository
          .warrantiesFor(draft.assetTypeCodes[type]!)
          .map((warranty) => '${warranty.duration} ${warranty.format}')
          .toList();
      final asset = draft.assets[type]!;
      asset.typeOptions
        ..clear()
        ..addAll(type == SolarAssetType.battery
            ? _mdmsRepository.typesFor(draft.assetTypeCodes[type]!)
            : const <String>[]);

      final fields = type.bomFields;
      final quantity = draft.resolvedBomQuantity(fields.quantity);
      asset.system = draft.assetTypeLabels[type]!;
      asset.selectedBrandCode = draft.resolvedBomText(fields.make);
      asset.totalCapacity = draft.resolvedBomText(fields.capacity);
      asset.capacityUnit = '';

      draft.seedCountFromBom(type, quantity);
      final product = draft.resolvedBomText(fields.product);
      for (final entry in asset.assets) {
        entry.itemCode = product;
        entry.capacity = asset.totalCapacity;
        if (type == SolarAssetType.battery &&
            !asset.typeOptions.contains(entry.batteryType)) {
          entry.batteryType = '';
        }
      }
    }

    draft.bomFormNames
      ..clear()
      ..addAll(_mdmsRepository.formsFor(draft.solutionId));
    draft.installationRequirements = _mdmsRepository.installationImages;
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
      // Also seed each already-created unit's own capacity (normally an
      // MDMS-driven dropdown default via `_configureMdms`) so the per-unit
      // "Next" gate on `AddNewAssetPage` isn't stuck blank either.
      for (final entry in asset.assets) {
        if (entry.capacity.trim().isEmpty) entry.capacity = capacity;
      }
    }
  }

  void _mergeBackend(
      SolarInstallationDraft draft, List<BillOfMaterial> values) {
    for (final bom in values) {
      if (_componentType(bom) == 'MACHINE') continue;
      if (_isCanonicalSolarBom(draft, bom)) {
        draft.mergedBom.addAll(bom.data);
        draft.remoteBomId = bom.id;
        draft.remoteBomName = bom.name;
        draft.remoteBomAdditionalDetails = bom.additionalDetails;
        if (bom.name != null) {
          draft.dynamicFormAnswers
              .putIfAbsent(bom.name!, () => Map.of(bom.data));
        }
      }
      draft.backendDocuments.addAll(bom.documents);
    }
  }

  bool _isCanonicalSolarBom(
    SolarInstallationDraft draft,
    BillOfMaterial bom,
  ) {
    if (_componentType(bom) == 'MACHINE') return false;

    // Old app versions incorrectly created one backend BOM row per MDMS form
    // page. Keep their documents viewable, but never use them as the single
    // canonical Solar BOM.
    final name = bom.name?.trim() ?? '';
    return !draft.bomFormNames.any(
          (form) => form.trim().toUpperCase() == name.toUpperCase(),
        ) &&
        !name.toUpperCase().startsWith('ASSETFORM.') &&
        !name.toUpperCase().contains('_BOM_');
  }

  String _componentType(BillOfMaterial bom) =>
      bom.additionalDetails['componentType']?.toString().trim().toUpperCase() ??
      '';

  void _hydrateDocuments(
    SolarInstallationDraft draft,
    List<Map<String, dynamic>> documents,
  ) {
    for (final document in documents) {
      final remoteId =
          (document['fileStoreId'] ?? document['fileStore'])?.toString();
      if (remoteId == null || remoteId.isEmpty) continue;
      final type =
          (document['documentType'] ?? document['type'] ?? '').toString();
      final normalizedType = type.trim().toUpperCase();
      final name = (document['fileName'] ??
              document['name'] ??
              document['documentUid'] ??
              type)
          .toString();
      final lower = '${document['mimeType'] ?? ''} $name'.toLowerCase();
      final kind =
          normalizedType == 'INSTALLATION_REPORT_BOM' || lower.contains('pdf')
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
        displayTitle: switch (normalizedType) {
          'INSTALLATION_REPORT_BOM' => 'Installation Report BOM',
          'INSTALLATION_COMPLETION_REPORT' => 'Installation Completion Report',
          _ => null,
        },
        mimeType: document['mimeType']?.toString(),
        documentType: type,
        id: document['id']?.toString(),
        documentUid: document['documentUid']?.toString(),
        status: document['status']?.toString() ?? 'ACTIVE',
        additionalDetails: document['additionalDetails'] is Map
            ? Map<String, dynamic>.from(document['additionalDetails'] as Map)
            : null,
        geoLocation: document['geoLocation'] is Map
            ? Map<String, dynamic>.from(document['geoLocation'] as Map)
            : null,
      );
      final assetMediaMatch =
          RegExp(r'^(battery|inverter|panel)-(image|video)$').firstMatch(type);
      if (assetMediaMatch != null) {
        final assetType =
            SolarAssetType.values.byName(assetMediaMatch.group(1)!);
        final bucket = assetMediaMatch.group(2) == 'video'
            ? draft.assets[assetType]!.videos
            : draft.assets[assetType]!.images;
        _mergeFiles(bucket, [media]);
      } else if (type.startsWith('INSTALLATION_IMAGE-')) {
        final code = type.substring('INSTALLATION_IMAGE-'.length);
        final target = draft.installationMedia.putIfAbsent(code, () => []);
        _mergeFiles(target, [media]);
      } else {
        _mergeFiles(draft.completionReportFiles, [media]);
      }
    }
  }

  void _mergeFiles(List<SolarFileRef> target, Iterable<SolarFileRef> incoming) {
    for (final file in incoming) {
      if (!target.any((existing) => _sameFile(existing, file))) {
        target.add(file);
      }
    }
  }

  bool _sameFile(SolarFileRef left, SolarFileRef right) {
    final leftKeys = <String>{
      if (left.id?.trim().isNotEmpty == true) 'id:${left.id!.trim()}',
      if (left.documentUid?.trim().isNotEmpty == true)
        'uid:${left.documentUid!.trim()}',
      if (left.remoteId?.trim().isNotEmpty == true)
        'remote:${left.remoteId!.trim()}',
      if (left.localPath?.trim().isNotEmpty == true)
        'local:${left.localPath!.trim()}',
      if (left.path.trim().isNotEmpty) 'path:${left.path.trim()}',
    };
    final rightKeys = <String>{
      if (right.id?.trim().isNotEmpty == true) 'id:${right.id!.trim()}',
      if (right.documentUid?.trim().isNotEmpty == true)
        'uid:${right.documentUid!.trim()}',
      if (right.remoteId?.trim().isNotEmpty == true)
        'remote:${right.remoteId!.trim()}',
      if (right.localPath?.trim().isNotEmpty == true)
        'local:${right.localPath!.trim()}',
      if (right.path.trim().isNotEmpty) 'path:${right.path.trim()}',
    };
    return leftKeys.intersection(rightKeys).isNotEmpty;
  }

  void _hydrateLocal(SolarInstallationDraft draft, Map<String, dynamic> json) {
    final invoiceNumber = json['invoiceNumber']?.toString();
    if (invoiceNumber != null && invoiceNumber.isNotEmpty) {
      draft.invoiceNumber = invoiceNumber;
    }
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
        final cachedWarranty = _normalizeWarranty(
          draft.warrantiesFor(type),
          value['warrantyDuration'],
        );
        if (cachedWarranty != null) {
          target.warrantyDuration = cachedWarranty;
        }
        target.selectedBrandCode =
            value['selectedBrandCode']?.toString() ?? target.selectedBrandCode;
        final entries = value['entries'];
        if (entries is List) {
          // Preserve activity-payload prefill by index when an older cache
          // entry did not yet contain capacity or a supporting photo.
          final existing = List<SolarAssetEntry>.of(target.assets);
          target.assets
            ..clear()
            ..addAll(entries.whereType<Map>().indexed.map((indexed) {
              final index = indexed.$1;
              final entry = Map<String, dynamic>.from(indexed.$2);
              final prior = index < existing.length ? existing[index] : null;
              final cachedCapacity = entry['capacity']?.toString() ?? '';
              return SolarAssetEntry(
                assetId: entry['assetId']?.toString() ?? prior?.assetId,
                itemCode: entry['itemCode']?.toString() ?? prior?.itemCode,
                serialNumber: entry['serialNumber']?.toString() ?? '',
                capacity: cachedCapacity.isNotEmpty
                    ? cachedCapacity
                    : (prior?.capacity ?? ''),
                batteryType: type == SolarAssetType.battery
                    ? (entry['batteryType'] ?? '').toString()
                    : '',
                fields: entry['fields'] is Map
                    ? (Map<String, dynamic>.from(entry['fields'] as Map)
                      ..remove('type')
                      ..remove('battery_type')
                      ..remove('batteryType'))
                    : const {},
                supportingPhoto: entry['supportingPhoto'] is Map
                    ? SolarFileRef.fromJson(Map<String, dynamic>.from(
                        entry['supportingPhoto'] as Map))
                    : prior?.supportingPhoto,
              );
            }));
        }
        final cachedCount = counts is Map ? counts[type.name] : null;
        if (cachedCount is num && cachedCount > 0) {
          draft.setCount(type, cachedCount.toInt());
        } else if (cachedCount == null && target.assets.isNotEmpty) {
          draft.setCount(type, target.assets.length);
        } else {
          draft.reconcileEntries(type);
        }
        _mergeFiles(target.images, _files(value['images']));
        _mergeFiles(target.videos, _files(value['videos']));
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
    _mergeFiles(
      draft.completionReportFiles,
      _files(json['completionReportFiles']),
    );
    if (json['installationMedia'] is Map) {
      for (final entry in (json['installationMedia'] as Map).entries) {
        final target = draft.installationMedia
            .putIfAbsent(entry.key.toString(), () => <SolarFileRef>[]);
        _mergeFiles(target, _files(entry.value));
      }
    }
    draft.syncCountsToBom();
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
