import '../data/remote_client.dart';
import '../model/bom/bom.dart';
import '../utils/api_paths.dart';
import '../utils/envConfig.dart';
import 'installation_cache_repo.dart';

class BomRepository {
  BillOfMaterial? matchingForSubmission({
    required List<BillOfMaterial> records,
    required String componentType,
    required String name,
  }) {
    final normalizedType = componentType.trim().toUpperCase();
    for (final record in records) {
      final recordType = record.additionalDetails['componentType']
          ?.toString()
          .trim()
          .toUpperCase();
      if (recordType == normalizedType && !_isPageSchemaName(record.name)) {
        return record;
      }
    }
    for (final record in records) {
      final recordName = record.name?.trim();
      if (recordName == name.trim() && !_isPageSchemaName(recordName)) {
        return record;
      }
    }
    return null;
  }

  bool _isPageSchemaName(String? name) {
    final normalized = name?.trim().toUpperCase() ?? '';
    return normalized.startsWith('ASSETFORM.') || normalized.contains('_BOM_');
  }

  Future<List<BillOfMaterial>> search(String activityFacilityId) async {
    final key = activityFacilityId;
    try {
      final result = await searchRemote(activityFacilityId);
      final raw = result.map((item) => item.toJson()).toList();
      await installationCacheRepository.putJson('bom', key, raw);
      return result;
    } catch (_) {
      final cached = await installationCacheRepository.getJson('bom', key);
      return (cached as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((item) =>
              BillOfMaterial.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    }
  }

  Future<List<BillOfMaterial>> searchRemote(String activityFacilityId) async {
    final response = await DioClient().dio.post(
      ApiPaths.bomSearch,
      queryParameters: {
        'tenantId': envConfig.variables.tenantId,
        'offset': 0,
        'limit': 100,
      },
      data: {
        'bom': {
          'tenantId': envConfig.variables.tenantId,
          'activityFacilityIds': [activityFacilityId],
        },
      },
    ).timeout(const Duration(seconds: 20));
    final raw = response.data['bom'] as List<dynamic>? ?? const [];
    return raw
        .whereType<Map>()
        .map((item) => BillOfMaterial.fromJson(
              Map<String, dynamic>.from(item),
            ))
        .toList();
  }

  /// Submits a brand-new BOM row (no prior server id) for one
  /// activity-facility's asset-type row. `_update` would reject an id the
  /// backend has never seen (`BomValidator.validateUpdateAgainstDB`), so the
  /// submission pipeline (`lib/utils/background_service.dart`) must call
  /// this instead of [update] whenever no existing BOM was found for that
  /// name — matching E4H's `isUpdate` branch in `dynamic_form_repo.dart`.
  Future<BillOfMaterial> create(BillOfMaterial bom) async {
    final response = await DioClient().dio.post(
      ApiPaths.bomCreate,
      data: {
        'bom': [bom.toJson()],
      },
    ).timeout(const Duration(seconds: 30));
    final raw = response.data['bom'] as List<dynamic>? ?? const [];
    if (raw.isEmpty) {
      throw Exception('BOM create response is missing BOM data.');
    }
    final created =
        BillOfMaterial.fromJson(Map<String, dynamic>.from(raw.first as Map));
    if (created.id?.trim().isEmpty != false) {
      throw Exception('BOM create response is missing id.');
    }
    return created;
  }

  /// Submits the final BOM `data`/`documents` for one activity-facility's
  /// asset-type row that already has a server id (see [create] otherwise).
  /// No local caching on write — this is only ever called from the
  /// submission pipeline (`lib/utils/background_service.dart`), which owns
  /// retry/progress semantics itself.
  Future<BillOfMaterial> update(BillOfMaterial bom) async {
    final response = await DioClient().dio.post(
      ApiPaths.bomUpdate,
      data: {
        'bom': [bom.toJson()],
      },
    ).timeout(const Duration(seconds: 30));
    final raw = response.data['bom'] as List<dynamic>? ?? const [];
    if (raw.isEmpty) {
      throw Exception('BOM update response is missing BOM data.');
    }
    return BillOfMaterial.fromJson(Map<String, dynamic>.from(raw.first as Map));
  }
}

final bomRepository = BomRepository();
