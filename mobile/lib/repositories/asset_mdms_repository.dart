import 'dart:convert';

import '../model/asset_type/asset_type.dart';
import '../model/item_code/item_code.dart';
import '../model/mdms/asset_registry_response.dart';
import '../model/mdms/common_masters.dart';
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
    final common = value.commonMasters;
    if (asset != null) {
      await installationCacheRepository.putJson(
          'mdms-master',
          'asset-registry.AssetTypeSchema',
          asset.assetTypeSchema.map((item) => item.toJson()).toList());
      await installationCacheRepository.putJson(
          'mdms-master',
          'asset-registry.WarrantyDurationSchema',
          asset.warrantyDurationSchema.map((item) => item.toJson()).toList());
    }
    final livelihood = value.livelihood;
    if (livelihood != null) {
      await installationCacheRepository.putJson(
          'mdms-master',
          'livelihood.ItemCode',
          livelihood.itemCode.map((item) => item.toJson()).toList());
      await installationCacheRepository.putJson('mdms-master',
          'livelihood.SolutionBOMForms', livelihood.solutionBomForms);
      for (final record in livelihood.bomFormSchema) {
        final schema = BomFormSchema.fromJson(record);
        await installationCacheRepository.putJson(
            'mdms-master', 'livelihood.BOMFormSchema:${schema.name}', record);
      }
    }
    if (common != null) {
      await installationCacheRepository.putJson('mdms-master',
          'common-masters.InstallationImages', common.installationImages);
    }
    if (value.installation != null) {
      await installationCacheRepository.putJson(
        'mdms-master',
        'Installation.Solution',
        value.installation!.solution.map((item) => item.toJson()).toList(),
      );
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

  List<AssetType> get assetTypes {
    final values = _memory?.assetRegistry?.assetTypeSchema
            .expand((wrapper) => wrapper.assetType)
            .where((item) => item.active)
            .toList() ??
        const [];
    return values;
  }

  List<String> typesFor(String assetTypeCode) {
    final normalizedCode = assetTypeCode.trim().toUpperCase();
    final seen = <String>{};
    final result = <String>[];
    for (final assetType in assetTypes.where(
      (item) => item.code.trim().toUpperCase() == normalizedCode,
    )) {
      for (final value in assetType.formFields.expand((field) => field.types)) {
        final type = value.trim();
        if (type.isNotEmpty && seen.add(type.toLowerCase())) result.add(type);
      }
    }
    return result;
  }

  List<Warranty> warrantiesFor(String assetTypeCode) =>
      _memory?.assetRegistry?.warrantyDurationSchema
          .expand((wrapper) => wrapper.warrantyDuration)
          .where((item) => item.active && item.assetTypeCode == assetTypeCode)
          .toList() ??
      const [];

  List<ItemCode> get itemCodes => (_memory?.livelihood?.itemCode ?? const [])
      .where((item) => item.active)
      .toList();

  ItemCode? itemCodeFor(String code) =>
      itemCodes.where((item) => item.code == code).firstOrNull;

  List<BomFormSchema> get bomSchemas =>
      (_memory?.livelihood?.bomFormSchema ?? const [])
          .where(_active)
          .map(BomFormSchema.fromJson)
          .where((item) => item.name.isNotEmpty)
          .toList();

  List<SolutionDesignBomForms> get solutionBomMappings =>
      (_memory?.livelihood?.solutionBomForms ?? const [])
          .where(_active)
          .map(SolutionDesignBomForms.fromJson)
          .where((item) => item.solutionCode.isNotEmpty)
          .toList();

  List<InstallationImageRequirement> get installationImages {
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
        result.add(item);
      }
    }
    return result;
  }

  List<String> formsFor(String? solutionId) {
    if (solutionId == null) return const [];
    for (final mapping in solutionBomMappings) {
      if (mapping.solutionCode == solutionId) return mapping.forms;
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
        in (_memory?.livelihood?.bomFormSchema ?? const []).where(_active)) {
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
}

final assetMdmsRepository = AssetMdmsRepository();

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
