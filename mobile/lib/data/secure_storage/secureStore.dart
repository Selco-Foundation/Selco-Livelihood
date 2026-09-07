// ignore_for_file: file_names

import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../model/appconfig/mdmsResponse.dart';
import '../../model/response/responsemodel.dart';

class _SecureStorageKeys {
  static const String appConfig = 'appConfig';
  static const String accessToken = 'accessToken';
  static const String accessInfo = 'accessInfo';
  static const String loginConsentAccepted = 'loginConsentAccepted';
}

class SecureStore {
  final storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      resetOnError: true,
    ),
  );

  SecureStore();

  Future setAppConfig(MdmsResponseModel mdmsResponseModel) async {
    String jsonMdmsResponse = json.encode(mdmsResponseModel.toJson());
    await storage.write(
      key: _SecureStorageKeys.appConfig,
      value: jsonMdmsResponse,
    );
  }

  Future<String?> getAppConfig() async {
    return await storage.read(key: _SecureStorageKeys.appConfig);
  }

  Future setAccessToken(String? accessToken) async {
    await storage.write(
        key: _SecureStorageKeys.accessToken, value: accessToken);
  }

  Future<String?> getAccessToken() async {
    return await storage.read(key: _SecureStorageKeys.accessToken);
  }

  Future deleteAccessToken() async {
    await storage.delete(key: _SecureStorageKeys.accessToken);
  }

  Future setAccessInfo(ResponseModel accessInfo) async {
    String jsonAccessInfo = json.encode(accessInfo.toJson());
    await storage.write(
      key: _SecureStorageKeys.accessInfo,
      value: jsonAccessInfo,
    );
  }

  Future<ResponseModel?> getAccessInfo() async {
    String? jsonAccessInfo =
        await storage.read(key: _SecureStorageKeys.accessInfo);
    if (jsonAccessInfo == null) return null;
    try {
      return ResponseModel.fromJson(json.decode(jsonAccessInfo));
    } catch (err) {
      rethrow;
    }
  }

  Future deleteAccessInfo() async {
    await storage.delete(key: _SecureStorageKeys.accessInfo);
  }

  Future<bool> hasAcceptedLoginConsent() async {
    final value = await storage.read(
      key: _SecureStorageKeys.loginConsentAccepted,
    );
    return value != null;
  }

  Future<void> setLoginConsentAccepted() async {
    await storage.write(
      key: _SecureStorageKeys.loginConsentAccepted,
      value: 'true',
    );
  }
}
