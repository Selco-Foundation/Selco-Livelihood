import 'package:dio/dio.dart';

import '../data/remote_client.dart';
import '../data/secure_storage/secureStore.dart';
import '../utils/api_paths.dart';
import '../utils/envConfig.dart';
import 'installation_cache_repo.dart';

/// Resolves the field staff's organization and its vendor user separately.
class VendorOrgRepository {
  VendorOrgRepository({Dio? dio}) : _dio = dio;

  final Dio? _dio;

  /// Returns a vendor user's ID, or an empty string if no user has both roles.
  Future<String> currentUserVendorId() async {
    final organizationId = (await currentUserOrgId())?.trim();
    if (organizationId == null || organizationId.isEmpty) {
      throw Exception(
          'No vendor organization is linked to the signed-in user. Ask an administrator to configure the vendor user mapping.');
    }

    const limit = 10;
    var offset = 0;
    while (true) {
      final response = await (_dio ?? DioClient().dio).post(
        ApiPaths.vendorOrgUserSearch,
        queryParameters: {
          'tenantId': envConfig.variables.tenantId,
          'limit': limit,
          'offset': offset,
        },
        data: {
          'OrgUser': {
            'tenantId': envConfig.variables.tenantId,
            'organizationIds': [organizationId],
          },
        },
      ).timeout(const Duration(seconds: 20));

      final orgUsers = response.data['OrgUsers'] as List<dynamic>? ?? const [];
      for (final orgUser in orgUsers.whereType<Map>()) {
        final user = orgUser['user'];
        final roles = user is Map ? user['roles'] : null;
        if (roles is! List) continue;
        final codes =
            roles.whereType<Map>().map((role) => role['code']).toSet();
        if (codes.contains('LIVELIHOOD_VENDOR') &&
            codes.contains('COMPLAINT_RESOLVER')) {
          final userId = orgUser['userId']?.toString().trim();
          if (userId != null && userId.isNotEmpty) return userId;
        }
      }

      offset += orgUsers.length;
      final total = response.data['TotalCount'];
      final totalCount = total is num ? total.toInt() : int.tryParse('$total');
      if (orgUsers.isEmpty ||
          (totalCount != null && offset >= totalCount) ||
          (totalCount == null && orgUsers.length < limit)) {
        return '';
      }
    }
  }

  Future<String?> currentUserOrgId() async {
    final accessInfo = await SecureStore().getAccessInfo();
    final uuid = accessInfo?.userRequest?.uuid;
    if (uuid == null || uuid.isEmpty) return null;

    final cached =
        await installationCacheRepository.getJson('vendor-org', uuid);
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
