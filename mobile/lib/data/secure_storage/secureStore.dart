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
  static const String assetRegistryConfig = 'assetRegistryConfig';
  // AMC keys, named exactly as in E4H's `secureStore.dart`.
  static const String amcFormConfigsRaw = 'amcFormConfigsRaw';
  static const String formSchemas = 'forms_schemas';
  static const String individualId = 'individualId';
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

  Future<void> setAssetRegistryConfig(String jsonAssetRegistry) async {
    await storage.write(
      key: _SecureStorageKeys.assetRegistryConfig,
      value: jsonAssetRegistry,
    );
  }

  Future<String?> getAssetRegistryConfig() async {
    return await storage.read(key: _SecureStorageKeys.assetRegistryConfig);
  }

  // ---- AMC (ported from E4H `data/secure_storage/secureStore.dart`) ----

  Future<void> setSelectedIndividual(String? id) async {
    await storage.write(key: _SecureStorageKeys.individualId, value: id);
  }

  Future<String?> getSelectedIndividual() async {
    return await storage.read(key: _SecureStorageKeys.individualId);
  }

  /// Raw `common-masters.AMCFormSchema` MDMS v2 documents, the AMC form's
  /// offline fallback.
  Future<void> setAMCFormConfigsRaw(List<Map<String, dynamic>> list) async {
    await storage.write(
      key: _SecureStorageKeys.amcFormConfigsRaw,
      value: json.encode(list),
    );
  }

  Future<String?> getAMCFormConfigsRaw() async {
    return await storage.read(key: _SecureStorageKeys.amcFormConfigsRaw);
  }

  /// Transformed form schemas keyed by schema name (E4H `forms_schemas`).
  Future<void> setFormSchemas(Map<String, dynamic> schemas) async {
    await storage.write(
      key: _SecureStorageKeys.formSchemas,
      value: json.encode(schemas),
    );
  }

  Future<String?> getFormSchemas() async {
    return await storage.read(key: _SecureStorageKeys.formSchemas);
  }

  String _kRawSchema(String schemaKey) => 'raw_schema_$schemaKey';

  Future<void> setRawSchemaDoc(
      String schemaKey, Map<String, dynamic> raw) async {
    await storage.write(key: _kRawSchema(schemaKey), value: jsonEncode(raw));
  }

  Future<Map<String, dynamic>?> getRawSchemaDoc(String schemaKey) async {
    final s = await storage.read(key: _kRawSchema(schemaKey));
    if (s == null || s.isEmpty) return null;
    final d = jsonDecode(s);
    return d is Map<String, dynamic> ? d : null;
  }

  Future<Map<String, dynamic>> getReportBookmarks(
    String kind,
    String tenantId,
    String userId,
    String userType,
  ) async {
    final raw = await storage.read(
      key: 'reportBookmarks:${jsonEncode([kind, tenantId, userId, userType])}',
    );
    if (raw == null) return {};
    return Map<String, dynamic>.from(jsonDecode(raw) as Map);
  }

  Future<void> setReportBookmarks(
    String kind,
    String tenantId,
    String userId,
    String userType,
    Map<String, dynamic> entries,
  ) =>
      storage.write(
        key:
            'reportBookmarks:${jsonEncode([kind, tenantId, userId, userType])}',
        value: jsonEncode(entries),
      );
}
