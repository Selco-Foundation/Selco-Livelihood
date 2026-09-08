import 'dart:convert';

import '../model/asset_count/asset_count.dart';
import '../model/asset_type/asset_type.dart';
import '../model/brand/brand.dart';
import '../model/mdms/asset_registry_response.dart';
import '../model/mdms/common_masters.dart';
import '../model/solution_design_type/solution_design_type.dart';
import '../model/system/system.dart';
import '../model/warranty/warranty.dart';
import 'installation_cache_repo.dart';

class AssetMdmsRepository {
  AssetMdmsRepository({AssetRegistryMdmsResponse? initial}) : _memory = initial;

  AssetRegistryMdmsResponse? _memory;

  AssetRegistryMdmsResponse? get current => _memory;

  Future<void> store(AssetRegistryMdmsResponse value) async {
    _memory = value;
    await installationCacheRepository.putJson(
        'mdms', 'asset-masters', value.toJson());
    final asset = value.assetRegistry;
    final facility = value.facility;
    final common = value.commonMasters;
    if (asset != null) {
      await installationCacheRepository.putJson(
          'mdms-master',
          'asset-registry.AssetCountSchema',
          asset.assetCountSchema.map((item) => item.toJson()).toList());
      await installationCacheRepository.putJson(
          'mdms-master',
          'asset-registry.AssetTypeSchema',
          asset.assetTypeSchema.map((item) => item.toJson()).toList());
      await installationCacheRepository.putJson(
          'mdms-master',
          'asset-registry.SystemSchema',
          asset.systemSchema.map((item) => item.toJson()).toList());
      await installationCacheRepository.putJson(
          'mdms-master',
          'asset-registry.WarrantyDurationSchema',
          asset.warrantyDurationSchema.map((item) => item.toJson()).toList());
      await installationCacheRepository.putJson(
          'mdms-master',
          'asset-registry.BrandSchema',
          asset.brandSchema.map((item) => item.toJson()).toList());
    }
    if (facility != null) {
      await installationCacheRepository.putJson(
          'mdms-master',
          'facility.SolarSolutionDesignType',
          facility.solarSolutionDesignType
              .map((item) => item.toJson())
              .toList());
    }
    if (common != null) {
      await installationCacheRepository.putJson(
          'mdms-master',
          'common-masters.SolutionDesignTypeBOMForms',
          common.solutionDesignTypeBomForms);
      await installationCacheRepository.putJson('mdms-master',
          'common-masters.InstallationImages', common.installationImages);
      await installationCacheRepository.putJson('mdms-master',
          'common-masters.RequiredBomFormKeys', common.requiredBomFormKeys);
      for (final record in common.bomFormSchema) {
        final schema = BomFormSchema.fromJson(record);
        await installationCacheRepository.putJson('mdms-master',
            'common-masters.BOMFormSchema:${schema.name}', record);
      }
    }
  }

  Future<AssetRegistryMdmsResponse?> load() async {
    if (_memory != null) return _memory;
    try {
      final raw =
          await installationCacheRepository.getJson('mdms', 'asset-masters');
      if (raw is Map) {
        _memory = AssetRegistryMdmsResponse.fromJson(
          jsonDecode(jsonEncode(raw)) as Map<String, dynamic>,
        );
      }
    } catch (_) {
      // The app-init network path can still populate memory when the local
      // database is unavailable (including lightweight widget-test shells).
    }
    return _memory;
  }

  List<AssetType> assetTypes({String? systemCode}) {
    final values = _memory?.assetRegistry?.assetTypeSchema
            .expand((wrapper) => wrapper.assetType)
            .where((item) => item.active)
            .where((item) {
          if (systemCode == null || systemCode.isEmpty) return true;
          final systems = item.formFields
              .map((field) => field.system)
              .whereType<String>()
              .where((value) => value.isNotEmpty)
              .toSet();
          return systems.isEmpty || systems.contains(systemCode);
        }).toList() ??
        const [];
    return values;
  }

  AssetCount? countFor(String assetTypeCode) =>
      _memory?.assetRegistry?.assetCountSchema
          .expand((wrapper) => wrapper.assetCount)
          .where((item) => item.active && item.assetTypeCode == assetTypeCode)
          .firstOrNull;

  List<Brand> brandsFor(String assetTypeCode) =>
      _memory?.assetRegistry?.brandSchema
          .expand((wrapper) => wrapper.brand)
          .where((item) => item.active && item.assetTypeCode == assetTypeCode)
          .toList() ??
      const [];

  List<Warranty> warrantiesFor(String assetTypeCode) =>
      _memory?.assetRegistry?.warrantyDurationSchema
          .expand((wrapper) => wrapper.warrantyDuration)
          .where((item) => item.active && item.assetTypeCode == assetTypeCode)
          .toList() ??
      const [];

  List<System> get systems =>
      _memory?.assetRegistry?.systemSchema
          .expand((wrapper) => wrapper.system)
          .where((item) => item.active)
          .toList() ??
      const [];

  List<SolutionDesignType> get solutionDesigns =>
      _memory?.facility?.solarSolutionDesignType
          .where((item) => item.active)
          .toList() ??
      const [];

  List<BomFormSchema> get bomSchemas =>
      (_memory?.commonMasters?.bomFormSchema ?? const [])
          .where(_active)
          .map(BomFormSchema.fromJson)
          .where((item) => item.name.isNotEmpty)
          .toList();

  List<SolutionDesignBomForms> get solutionBomMappings =>
      (_memory?.commonMasters?.solutionDesignTypeBomForms ?? const [])
          .where(_active)
          .map(SolutionDesignBomForms.fromJson)
          .where((item) => item.systemCode.isNotEmpty)
          .toList();

  List<InstallationImageRequirement> installationImagesFor(String? systemCode) {
    final records = _memory?.commonMasters?.installationImages ?? const [];
    final result = <InstallationImageRequirement>[];
    for (final record in records.where(_active)) {
      final data = record['data'] is Map
          ? Map<String, dynamic>.from(record['data'] as Map)
          : record;
      final rawItems = data['InstallationImage'] is List
          ? data['InstallationImage'] as List
          : <dynamic>[data];
      for (final raw in rawItems.whereType<Map>()) {
        final item = InstallationImageRequirement.fromJson(
          Map<String, dynamic>.from(raw),
        );
        if (!item.active || item.code.trim().isEmpty) continue;
        if (systemCode != null &&
            systemCode.trim().isNotEmpty &&
            item.systemTypeEntry(systemCode) != null) {
          result.add(item);
        }
      }
    }
    result.sort((a, b) {
      final aOrder = a.systemTypeEntry(systemCode ?? '')?.order;
      final bOrder = b.systemTypeEntry(systemCode ?? '')?.order;
      if (aOrder != null && bOrder != null) return aOrder.compareTo(bOrder);
      if (aOrder != null) return -1;
      if (bOrder != null) return 1;
      return _numericCode(a.code).compareTo(_numericCode(b.code));
    });
    return result;
  }

  List<RequiredBomFormKeysData> get requiredBomFormKeys =>
      (_memory?.commonMasters?.requiredBomFormKeys ?? const [])
          .where(_active)
          .map(RequiredBomFormKeysData.fromJson)
          .where((item) => item.active && item.systemCode.isNotEmpty)
          .toList();

  RequiredBomFormKeysData? requiredBomFormKeysFor(String? systemCode) {
    final normalized = systemCode?.trim().toUpperCase();
    if (normalized == null || normalized.isEmpty) return null;
    return requiredBomFormKeys
        .where((item) => item.systemCode.trim().toUpperCase() == normalized)
        .firstOrNull;
  }

  List<String> formsFor(String? systemCode) {
    if (systemCode == null) return const [];
    for (final mapping in solutionBomMappings) {
      if (mapping.systemCode == systemCode) return mapping.forms;
    }
    return const [];
  }

  BomFormSchema? schemaFor(String name) {
    final normalized = name.startsWith('AssetForm.') ? name : 'AssetForm.$name';
    for (final schema in bomSchemas) {
      if (schema.name == name || schema.name == normalized) {
        return schema;
      }
    }
    return null;
  }

  Map<String, dynamic>? rawBomSchemaFor(String name) {
    final normalized = name.startsWith('AssetForm.') ? name : 'AssetForm.$name';
    for (final record
        in (_memory?.commonMasters?.bomFormSchema ?? const []).where(_active)) {
      final data = record['data'] is Map
          ? Map<String, dynamic>.from(record['data'] as Map)
          : record;
      final recordName =
          (data['name'] ?? record['uniqueIdentifier'] ?? '').toString();
      if (recordName == name || recordName == normalized) {
        return Map<String, dynamic>.from(record);
      }
    }
    return null;
  }

  static bool _active(Map<String, dynamic> value) =>
      value['isActive'] != false && value['active'] != false;
  static int _numericCode(String code) => int.tryParse(code) ?? 999999;
}

final assetMdmsRepository = AssetMdmsRepository();

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
