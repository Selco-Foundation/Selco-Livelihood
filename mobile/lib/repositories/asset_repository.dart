import '../data/remote_client.dart';
import '../model/asset/asset_submission.dart';
import '../utils/api_paths.dart';
import '../utils/envConfig.dart';
import 'installation_cache_repo.dart';

class AssetRepository {
  Future<List<Map<String, dynamic>>> search(String activityFacilityId) async {
    try {
      final result = await searchRemote(
        activityFacilityId: activityFacilityId,
      );
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

  Future<List<Map<String, dynamic>>> searchRemote({
    required String activityFacilityId,
    String? serialNumber,
    String? assetId,
  }) async {
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
          'includeChildren': true,
          if (serialNumber?.trim().isNotEmpty == true)
            'serialNumber': [serialNumber!.trim()],
          if (assetId?.trim().isNotEmpty == true) 'assetID': assetId!.trim(),
        },
      },
    );
    final body = response.data;
    final raw = body is List
        ? body
        : body is Map && body['assets'] is List
            ? body['assets'] as List
            : const <dynamic>[];
    return raw
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  /// Creates solar groups together; updates existing units by their own IDs.
  Future<Map<String, dynamic>> createOrUpdate({
    required AssetSubmission asset,
    required String facilityId,
    required String activityFacilityId,
    required String vendorId,
  }) async {
    if (asset.isSolarParent && asset.assetId?.trim().isNotEmpty == true) {
      // A parent update does not persist nested child edits.
      final children = <Map<String, dynamic>>[];
      for (final child in asset.children) {
        children.add(await createOrUpdate(
          asset: child.copyWith(
            parentId: asset.assetId,
            system: child.system.isEmpty ? asset.system : child.system,
          ),
          facilityId: facilityId,
          activityFacilityId: activityFacilityId,
          vendorId: vendorId,
        ));
      }
      return {
        ...asset.toRegistryJson(
          tenantId: envConfig.variables.tenantId,
          facilityId: facilityId,
          activityFacilityId: activityFacilityId,
          vendorId: vendorId,
        ),
        'children': children,
      };
    }
    final payload = asset.toRegistryJson(
      tenantId: envConfig.variables.tenantId,
      facilityId: facilityId,
      activityFacilityId: activityFacilityId,
      vendorId: vendorId,
    );
    final assetId = asset.assetId?.trim();
    final isUpdate = assetId?.isNotEmpty == true;
    final response = await DioClient().dio.post(
      isUpdate ? ApiPaths.assetUpdate : ApiPaths.assetCreate,
      queryParameters: isUpdate ? {'assetID': assetId} : null,
      data: {
        'assetDetail': {'Asset': payload},
      },
    );
    final body = response.data;
    final responseAsset = body is Map ? (body['asset'] ?? body['Asset']) : null;
    if (responseAsset is! Map) {
      throw Exception('Asset Registry response is missing asset data.');
    }
    final result = Map<String, dynamic>.from(responseAsset);
    final returnedId = (result['assetId'] ?? result['assetID'])?.toString();
    if (returnedId == null || returnedId.trim().isEmpty) {
      throw Exception('Asset Registry response is missing assetId.');
    }
    return result;
  }
}

final assetRepository = AssetRepository();
