import '../data/remote_client.dart';
import '../model/bom/bom.dart';
import '../utils/api_paths.dart';
import '../utils/envConfig.dart';
import 'installation_cache_repo.dart';

class BomRepository {
  Future<List<BillOfMaterial>> search(String activityFacilityId) async {
    final key = activityFacilityId;
    try {
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
      await installationCacheRepository.putJson('bom', key, raw);
      return raw
          .whereType<Map>()
          .map((item) =>
              BillOfMaterial.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } catch (_) {
      final cached = await installationCacheRepository.getJson('bom', key);
      return (cached as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((item) =>
              BillOfMaterial.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    }
  }
}

final bomRepository = BomRepository();
