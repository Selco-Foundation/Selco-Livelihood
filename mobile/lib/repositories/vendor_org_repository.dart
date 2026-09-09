import '../data/remote_client.dart';
import '../data/secure_storage/secureStore.dart';
import '../utils/api_paths.dart';
import '../utils/envConfig.dart';
import 'installation_cache_repo.dart';

/// Resolves the logged-in field-staff user's vendor `organizationId`, needed
/// as `Asset.vendorId` on every asset-create call in the submission
/// pipeline. `POST vendor/organisation/v1/user/_search` confirmed against
/// `OrgUserSearchRequest`/`OrgUserResponseSearch` in `vendor-registry`.
class VendorOrgRepository {
  Future<String?> currentUserOrgId() async {
    final accessInfo = await SecureStore().getAccessInfo();
    final uuid = accessInfo?.userRequest?.uuid;
    if (uuid == null || uuid.isEmpty) return null;

    final cached = await installationCacheRepository.getJson('vendor-org', uuid);
    if (cached is Map && cached['organizationId'] is String) {
      return cached['organizationId'] as String;
    }

    final response = await DioClient().dio.post(
      ApiPaths.vendorOrgUserSearch,
      queryParameters: {
        'tenantId': envConfig.variables.tenantId,
        'limit': 10,
        'offset': 0,
      },
      data: {
        'OrgUser': {
          'tenantId': envConfig.variables.tenantId,
          'userIds': [uuid],
        },
      },
    ).timeout(const Duration(seconds: 20));

    final orgUsers = response.data['OrgUsers'] as List<dynamic>? ?? const [];
    if (orgUsers.isEmpty) return null;
    final organizationId =
        (orgUsers.first as Map)['organizationId']?.toString();
    if (organizationId == null) return null;

    await installationCacheRepository
        .putJson('vendor-org', uuid, {'organizationId': organizationId});
    return organizationId;
  }
}

final vendorOrgRepository = VendorOrgRepository();
