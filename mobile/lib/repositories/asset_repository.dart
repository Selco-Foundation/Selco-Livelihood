import '../data/remote_client.dart';
import '../utils/api_paths.dart';
import '../utils/envConfig.dart';
import 'installation_cache_repo.dart';

class AssetRepository {
  Future<List<Map<String, dynamic>>> search(String activityFacilityId) async {
    try {
      final response = await DioClient().dio.post(
        ApiPaths.assetSearch,
        queryParameters: {
          'tenantId': envConfig.variables.tenantId,
          'limit': 1000,
        },
        data: {
          'criteria': {
            'tenantId': envConfig.variables.tenantId,
            'activityFacilityID': activityFacilityId,
          },
        },
      ).timeout(const Duration(seconds: 20));
      final body = response.data;
      final raw = body is List
          ? body
          : body is Map && body['assets'] is List
              ? body['assets'] as List
              : const <dynamic>[];
      final result = raw
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
      await installationCacheRepository.putJson(
          'assets', activityFacilityId, result);
      return result;
    } catch (_) {
      final cached = await installationCacheRepository.getJson(
          'assets', activityFacilityId);
      return (cached as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    }
  }

  /// Creates one physical asset unit (`assetDetail.Asset`, per
  /// `asset-registry`'s `Asset.java`). Called once per `SolarAssetEntry`
  /// (or once for the machine) from the submission pipeline.
  Future<Map<String, dynamic>> create(
    Map<String, dynamic> assetPayload,
  ) async {
    final response = await DioClient().dio.post(
      ApiPaths.assetCreate,
      data: {
        'assetDetail': {'Asset': assetPayload},
      },
    ).timeout(const Duration(seconds: 30));
    final body = response.data;
    final asset = body is Map && body['assetDetail'] is Map
        ? (body['assetDetail'] as Map)['Asset']
        : null;
    return asset is Map ? Map<String, dynamic>.from(asset) : assetPayload;
  }
}

final assetRepository = AssetRepository();
