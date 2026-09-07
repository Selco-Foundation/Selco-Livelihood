import 'dart:convert';

import 'package:dio/dio.dart';

import '../model/localization/localizationModel.dart';
import '../utils/api_paths.dart';
import '../utils/envConfig.dart';

class LocalizationRepository {
  final authClient = Dio(
    BaseOptions(
      connectTimeout: Duration(
        milliseconds: envConfig.variables.connectTimeout,
      ),
      receiveTimeout: Duration(
        milliseconds: envConfig.variables.receiveTimeout,
      ),
    ),
  );

  Future<LocalizationModel> getLocalizationsList(
      Map<String, String> queryParameters) async {
    final body = {
      "RequestInfo": {
        "apiId": "Rainmaker",
        "authToken": null,
        "msgId": "${DateTime.now().millisecondsSinceEpoch}|en_IN",
        "plainAccessRequest": {}
      }
    };

    try {
      final response = await authClient.post(
          '${envConfig.variables.baseUrl}${ApiPaths.localizationSearch}',
          queryParameters: queryParameters,
          data: jsonEncode(body));

      final responseBody = LocalizationModel.fromJson(response.data);

      return responseBody;
    } catch (err) {
      rethrow;
    }
  }
}
