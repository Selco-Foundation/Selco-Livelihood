import 'dart:convert';

import 'package:dio/dio.dart';

import '../data/network_manager.dart';
import '../data/remote_client.dart';
import '../data/secure_storage/secureStore.dart';
import '../model/appconfig/mdmsResponse.dart';
import '../model/mdms/asset_registry_response.dart';
import '../model/mdms/mdms_request.dart';
import '../utils/api_paths.dart';
import '../utils/envConfig.dart';
import 'asset_mdms_repository.dart';

class AppInitRepo {
  Future<MdmsResponseModel> searchAppConfiguration() async {
    final client = Dio(
      BaseOptions(
        connectTimeout: Duration(
          milliseconds: envConfig.variables.connectTimeout,
        ),
        receiveTimeout: Duration(
          milliseconds: envConfig.variables.receiveTimeout,
        ),
      ),
    );
    final SecureStore storage = SecureStore();

    try {
      final response = await client.get(envConfig.variables.mobileAppGlobalUrl);

      final responseBody = MdmsResponseModel.fromJson(
        json.decode(response.toString())['MdmsRes'],
      );
      storage.setAppConfig(responseBody);

      return responseBody;
    } catch (remoteError) {
      final localAppConfig = await storage.getAppConfig();
      if (localAppConfig == null) {
        rethrow;
      }

      try {
        return MdmsResponseModel.fromJson(json.decode(localAppConfig));
      } catch (_) {
        rethrow;
      }
    }
  }

  /// Batches the complete installation master set into one MDMS v1 call.
  /// against the live backend to return all of them in a single request.
  Future<AssetRegistryMdmsResponse> searchAssetRegistry() async {
    final storage = SecureStore();
    final tenantId = envConfig.variables.tenantId;

    final request = MdmsRequestModel(
      mdmsCriteria: MdmsCriteriaModel(
        tenantId: tenantId,
        moduleDetails: [
          const MdmsModuleDetailModel(
            moduleName: 'asset-registry',
            masterDetails: [
              MdmsMasterDetailModel(name: 'AssetCountSchema'),
              MdmsMasterDetailModel(name: 'AssetTypeSchema'),
              MdmsMasterDetailModel(name: 'SystemSchema'),
              MdmsMasterDetailModel(name: 'WarrantyDurationSchema'),
              MdmsMasterDetailModel(name: 'BrandSchema'),
            ],
          ),
          const MdmsModuleDetailModel(
            moduleName: 'common-masters',
            masterDetails: [
              MdmsMasterDetailModel(name: 'BOMFormSchema'),
              MdmsMasterDetailModel(name: 'SolutionDesignTypeBOMForms'),
              MdmsMasterDetailModel(name: 'InstallationImages'),
              MdmsMasterDetailModel(name: 'RequiredBomFormKeys'),
            ],
          ),
          const MdmsModuleDetailModel(
            moduleName: 'facility',
            masterDetails: [
              MdmsMasterDetailModel(name: 'SolarSolutionDesignType'),
            ],
          ),
          const MdmsModuleDetailModel(
            moduleName: 'livelihood',
            masterDetails: [
              MdmsMasterDetailModel(name: 'ItemCode'),
            ],
          ),
        ],
      ),
    );

    try {
      final client = DioClient().dio;
      final response = await client.post(
        ApiPaths.mdmsV1Search,
        data: request.toJson(),
      );

      final mdmsRes = response.data['MdmsRes'];
      final result = AssetRegistryMdmsResponse.fromJson(
        mdmsRes as Map<String, dynamic>,
      );

      await assetMdmsRepository.store(result);
      return result;
    } catch (remoteError) {
      final isarCached = await assetMdmsRepository.load();
      if (isarCached != null) return isarCached;
      final cached = await storage.getAssetRegistryConfig();
      if (cached == null) throw _unwrap(remoteError);

      try {
        final result = AssetRegistryMdmsResponse.fromJson(
          json.decode(cached) as Map<String, dynamic>,
        );
        await assetMdmsRepository.store(result);
        return result;
      } catch (_) {
        throw _unwrap(remoteError);
      }
    }
  }

  /// Same unwrapping convention `HttpAuthRepository` already uses — Dio
  /// wraps our classified `AppNetworkException` inside `DioException.error`,
  /// so callers that want the classification (not a generic Dio wrapper)
  /// need it pulled back out.
  Object _unwrap(Object error) {
    if (error is DioException && error.error is AppNetworkException) {
      return error.error as AppNetworkException;
    }
    return error;
  }
}
