import 'dart:convert';

import 'package:dio/dio.dart';

import '../data/secure_storage/secureStore.dart';
import '../model/appconfig/mdmsResponse.dart';
import '../utils/envConfig.dart';

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
}
