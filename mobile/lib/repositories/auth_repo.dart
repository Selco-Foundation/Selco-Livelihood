import 'package:dio/dio.dart';

import '../data/api_interceptors.dart';
import '../data/network_manager.dart';
import '../data/remote_client.dart';
import '../data/secure_storage/secureStore.dart';
import '../model/login/loginModel.dart';
import '../model/response/responsemodel.dart';
import '../utils/api_paths.dart';
import '../utils/envConfig.dart';

abstract interface class AuthRepository {
  Future<ResponseModel> validateLogin(LoginModel body);

  Future<String> refreshToken();

  Future<void> logout();

  Future<void> reportLogin(UserRequest user);
}

/// The repository `LoginPage` uses by default. Not a constructor parameter
/// on `LoginPage` itself — it's `@RoutePage()`-annotated, and auto_route's
/// generator treats every constructor field as a route argument, which broke
/// route codegen for a non-serializable type like this. Tests swap this
/// instead (and should restore it via `addTearDown`).
AuthRepository loginAuthRepository = HttpAuthRepository();

class HttpAuthRepository implements AuthRepository {
  @override
  Future<ResponseModel> validateLogin(LoginModel body) async {
    final formData = body.toJson();

    final authClient = Dio()..options.baseUrl = envConfig.variables.baseUrl;
    authClient.interceptors.addAll([
      NetworkPrecheckInterceptor(),
      NetworkErrorNormalizerInterceptor(),
    ]);

    final headers = <String, String>{
      "content-type": 'application/x-www-form-urlencoded',
      "Access-Control-Allow-Origin": "*",
      "authorization": "Basic ZWdvdi11c2VyLWNsaWVudDo=",
    };

    try {
      final response = await authClient.post(ApiPaths.oauthToken,
          data: formData, options: Options(headers: headers));
      final responseBody = ResponseModel.fromJson(response.data);
      authClient.close();
      return responseBody;
    } on DioException catch (err) {
      throw _normalizedLoginException(err);
    }
  }

  @override
  Future<String> refreshToken() async {
    final secureStore = SecureStore();
    final ResponseModel? accessInfo = await secureStore.getAccessInfo();
    if (accessInfo == null || accessInfo.refresh_token == null) {
      throw Exception("No refresh token stored");
    }

    final dio = Dio()..options.baseUrl = envConfig.variables.baseUrl;
    final form = {
      'grant_type': 'refresh_token',
      'refresh_token': accessInfo.refresh_token,
    };
    final headers = {
      "content-type": "application/x-www-form-urlencoded",
      "authorization": "Basic ZWdvdi11c2VyLWNsaWVudDo=",
    };

    final resp = await dio.post(ApiPaths.oauthToken,
        data: form, options: Options(headers: headers));
    final body = ResponseModel.fromJson(resp.data);
    await secureStore.setAccessToken(body.access_token);
    await secureStore.setAccessInfo(body);
    return body.access_token;
  }

  @override
  Future<void> logout() async {
    final secureStore = SecureStore();
    await secureStore.deleteAccessToken();
    await secureStore.deleteAccessInfo();
  }

  @override
  Future<void> reportLogin(UserRequest user) async {
    try {
      final client = DioClient().dio;
      await client.post(
        ApiPaths.reportLogin,
        data: {
          'User': user.toJson(),
          'application': 'FIELD_ASSIST',
        },
        options: Options(
          extra: const {suppressSessionExpiryExtraKey: true},
        ),
      );
    } catch (_) {
      // Best-effort telemetry — never block login on this failing.
    }
  }

  AppNetworkException _normalizedLoginException(DioException err) {
    if (_isInvalidCredentialError(err)) {
      return AppNetworkException(LoginErrorCode.invalidCredentials,
          rawMessage: err.message);
    }

    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout) {
      return AppNetworkException(LoginErrorCode.requestTimeout,
          rawMessage: err.message);
    }

    if (err.type == DioExceptionType.connectionError) {
      return AppNetworkException(LoginErrorCode.connectionFailed,
          rawMessage: err.message);
    }

    final status = err.response?.statusCode ?? 0;
    if (status >= 500) {
      return AppNetworkException(LoginErrorCode.serverError,
          rawMessage: err.message);
    }

    if (err.error is AppNetworkException) {
      return err.error as AppNetworkException;
    }

    return AppNetworkException(LoginErrorCode.unknown, rawMessage: err.message);
  }

  bool _isInvalidCredentialError(DioException err) {
    final status = err.response?.statusCode ?? 0;
    if (status == 401) return true;

    final data = err.response?.data;
    if (data is Map) {
      final error = (data['error'] ?? '').toString().toLowerCase();
      final desc = (data['error_description'] ?? '').toString().toLowerCase();
      if (error.contains('invalid_grant') || desc.contains('bad credentials')) {
        return true;
      }
      if (error.contains('invalid') && desc.contains('credential')) {
        return true;
      }
    }

    return false;
  }
}
