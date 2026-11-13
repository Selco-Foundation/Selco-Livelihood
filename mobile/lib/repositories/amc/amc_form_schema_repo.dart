import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../../data/secure_storage/secureStore.dart';
import '../../utils/amc/amc_utils.dart';
import 'amc_remote_data_source.dart';

/// The AMC form-schema half of E4H's `AppInitRepo`
/// (`searchAMCFormConfigsRaw`, `_searchCachedRawDocs`, `loadByName`,
/// `loadByUniqueIdentifier`, `upsertTransformedSchema`). The form comes only
/// from MDMS (`common-masters.AMCFormSchema`); secure storage keeps the raw
/// docs and the transformed schema as the offline fallback.
class AmcFormSchemaRepository {
  AmcFormSchemaRepository({AmcRemoteDataSource? dataSource})
      : _dataSource = dataSource;

  final AmcRemoteDataSource? _dataSource;

  AmcRemoteDataSource get _remote => _dataSource ?? amcRemoteDataSource;

  /// E4H requests the AMC form with tenant `'in'` (hard-coded, kept as-is).
  /// DUMMY-BACKEND: confirm the tenant for Livelihood with the backend team.
  static const String amcFormMdmsTenantId = 'in';

  static Map<String, dynamic> amcFormMdmsRequest() => const {
        'MdmsCriteria': {
          'tenantId': amcFormMdmsTenantId,
          'schemaCode': 'common-masters.AMCFormSchema',
          'moduleDetails': <dynamic>[],
        },
      };

  bool _isTransportFailure(Object error) =>
      error is DioException &&
      [
        DioExceptionType.connectionError,
        DioExceptionType.connectionTimeout,
        DioExceptionType.sendTimeout,
        DioExceptionType.receiveTimeout
      ].contains(error.type);

  Future<List<Map<String, dynamic>>> searchAMCFormConfigsRaw({
    bool useCacheRead = false,
    bool cacheOnly = false,
  }) async {
    final storage = SecureStore();
    return _searchCachedRawDocs(
      request: amcFormMdmsRequest(),
      readCache: storage.getAMCFormConfigsRaw,
      writeCache: (list) => storage.setAMCFormConfigsRaw(list),
      useCacheRead: useCacheRead,
      cacheOnly: cacheOnly,
    );
  }

  List<dynamic>? _readCachedMdmsList(String? raw) {
    if (raw == null) return null;
    final decoded = json.decode(raw);
    if (decoded is! List) throw const FormatException('Invalid MDMS cache');
    return decoded;
  }

  Future<List<Map<String, dynamic>>> _searchCachedRawDocs({
    required Map<String, dynamic> request,
    required Future<String?> Function() readCache,
    required Future<void> Function(List<Map<String, dynamic>>) writeCache,
    required bool useCacheRead,
    required bool cacheOnly,
  }) async {
    if (useCacheRead || cacheOnly) {
      final cachedRaw = await readCache();
      try {
        final cachedList = _readCachedMdmsList(cachedRaw);
        if (cachedList != null) {
          return cachedList
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        }
      } catch (_) {
        if (cacheOnly) {
          throw Exception('Cached MDMS form config is invalid');
        }
      }

      if (cacheOnly) {
        throw Exception('Cached MDMS form config is missing');
      }
    }

    List<dynamic> payloadList;
    try {
      payloadList = await _remote.searchAmcFormSchemaDocs(request);
    } catch (error) {
      if (!_isTransportFailure(error) || isAuthenticationFailure(error)) {
        rethrow;
      }
      return _searchCachedRawDocs(
          request: request,
          readCache: readCache,
          writeCache: writeCache,
          useCacheRead: true,
          cacheOnly: true);
    }

    final result = payloadList
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    await writeCache(result);
    return result;
  }

  Future<Map<String, dynamic>?> loadByName(String name) async {
    final raw = await SecureStore().getFormSchemas();
    if (raw == null) return null;

    try {
      final Map<String, dynamic> all = json.decode(raw);
      final entry = all[name];
      if (entry is Map && entry['data'] is Map) {
        return Map<String, dynamic>.from(entry['data'] as Map);
      }
    } catch (e, st) {
      debugPrint('AmcFormSchemaRepository.loadByName error: $e\n$st');
    }
    return null;
  }

  Future<Map<String, dynamic>?> loadByUniqueIdentifier(String uniqueId) async {
    final raw = await SecureStore().getFormSchemas();
    if (raw == null) return null;

    try {
      final Map<String, dynamic> all = json.decode(raw);
      for (final value in all.values) {
        if (value is Map && value['data'] is Map) {
          final data = Map<String, dynamic>.from(value['data'] as Map);
          if (data['uniqueIdentifier']?.toString() == uniqueId) {
            return data;
          }
        }
      }
    } catch (e, st) {
      debugPrint(
          'AmcFormSchemaRepository.loadByUniqueIdentifier error: $e\n$st');
    }
    return null;
  }

  Future<void> upsertTransformedSchema(Map<String, dynamic> transformed) async {
    final name = transformed['name']?.toString();
    final newVersion = transformed['version'];

    if (name == null || name.isEmpty) return;

    final storage = SecureStore();
    final raw = await storage.getFormSchemas();
    final Map<String, dynamic> existing = raw == null
        ? <String, dynamic>{}
        : (json.decode(raw) as Map<String, dynamic>);

    final existingEntry = existing[name] as Map<String, dynamic>?;

    existing[name] = {
      'data': transformed,
      'currentVersion': newVersion,
      'previousVersion': existingEntry?['currentVersion'],
    };
    await storage.setFormSchemas(existing);
  }

  /// E4H `AmcHomePage._prefetchAmcSchemas`: fetch (or fall back to the cached
  /// copy), transform and store every AMC form schema.
  Future<void> prefetchAmcSchemas({bool Function()? isCancelled}) async {
    List<Map<String, dynamic>> rawDocs;
    try {
      rawDocs = await searchAMCFormConfigsRaw();
    } catch (error) {
      if (isAuthenticationFailure(error)) rethrow;
      rawDocs = await searchAMCFormConfigsRaw(cacheOnly: true);
    }
    for (final doc in rawDocs) {
      if (isCancelled?.call() == true) return;
      final transformed = transformSelcoFormMdmsDocToSchema(doc);
      final uniqueId = doc['uniqueIdentifier']?.toString();
      if (uniqueId != null && uniqueId.isNotEmpty) {
        transformed['uniqueIdentifier'] = uniqueId;
      }
      await upsertTransformedSchema(transformed);
    }
  }
}
