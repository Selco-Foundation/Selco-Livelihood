import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:isar/isar.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../data/nosql/cache_installation_data.dart';
import '../data/remote_client.dart';
import '../model/solar_installation_draft.dart';
import '../utils/api_paths.dart';
import '../utils/constants.dart';
import '../utils/envConfig.dart';

class InstallationCacheRepository {
  Future<Isar> get _isar => Constants().isar;

  /// Best-effort: a write failure (e.g. Isar unavailable) shouldn't block
  /// the caller — callers that need to confirm persistence read back
  /// through [getJson], which already degrades to "nothing cached".
  Future<void> putJson(
    String namespace,
    String key,
    Object? payload,
  ) async {
    try {
      final isar = await _isar;
      await isar.writeTxn(() async {
        final rows = await isar.cacheInstallationDatas
            .filter()
            .namespaceEqualTo(namespace)
            .and()
            .cacheKeyEqualTo(key)
            .findAll();
        final row = rows.isEmpty ? CacheInstallationData() : rows.first;
        row
          ..namespace = namespace
          ..cacheKey = key
          ..rawJson = jsonEncode(payload)
          ..updatedAt = DateTime.now();
        await isar.cacheInstallationDatas.put(row);
        if (rows.length > 1) {
          await isar.cacheInstallationDatas
              .deleteAll(rows.skip(1).map((item) => item.id).toList());
        }
      });
    } catch (_) {
      // Best-effort — see doc comment above.
    }
  }

  Future<dynamic> getJson(String namespace, String key) async {
    final isar = await _isar;
    final rows = await isar.cacheInstallationDatas
        .filter()
        .namespaceEqualTo(namespace)
        .and()
        .cacheKeyEqualTo(key)
        .findAll();
    if (rows.isEmpty) return null;
    rows.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return jsonDecode(rows.first.rawJson);
  }

  Future<String> persistPickedFile(String sourcePath, String cacheKey) async {
    final source = File(sourcePath);
    if (!await source.exists()) return sourcePath;
    final root = await getApplicationSupportDirectory();
    final directory = Directory(p.join(root.path, 'installation_media'));
    await directory.create(recursive: true);
    final safeKey = cacheKey.replaceAll(RegExp(r'[^A-Za-z0-9_.-]'), '_');
    final extension = p.extension(sourcePath);
    final target = File(p.join(directory.path, '$safeKey$extension'));
    if (source.absolute.path != target.absolute.path) {
      await source.copy(target.path);
    }
    return target.path;
  }

  Future<SolarFileRef> persistMediaRef(
      SolarFileRef media, String cacheKey) async {
    if (media.isRemote) return media;
    final path = await persistPickedFile(media.path, cacheKey);
    return SolarFileRef(
      name: media.name,
      path: path,
      kind: media.kind,
      mimeType: media.mimeType,
      documentType: media.documentType,
      localPath: path,
    );
  }

  Future<String> resolveMedia(SolarFileRef media) async {
    if (media.localPath != null && await File(media.localPath!).exists()) {
      return media.localPath!;
    }
    if (!media.isRemote) {
      throw FileSystemException('Media file is no longer available', media.path);
    }

    final cacheKey = media.remoteId ?? media.path;
    final cached = await getJson('media', cacheKey);
    if (cached is Map && cached['path'] is String) {
      final file = File(cached['path'] as String);
      if (await file.exists()) return file.path;
    }

    final uri = media.path.startsWith('http')
        ? media.path
        : '${envConfig.variables.baseUrl}${ApiPaths.fileStoreFile}'
            '?tenantId=${Uri.encodeQueryComponent(envConfig.variables.tenantId)}'
            '&fileStoreId=${Uri.encodeQueryComponent(media.remoteId ?? media.path)}';
    final response = await DioClient().dio.get<List<int>>(
          uri,
          options: Options(responseType: ResponseType.bytes),
        );
    final root = await getApplicationSupportDirectory();
    final directory = Directory(p.join(root.path, 'remote_media'));
    await directory.create(recursive: true);
    final name = cacheKey.replaceAll(RegExp(r'[^A-Za-z0-9_.-]'), '_');
    final extension =
        p.extension(media.name).isEmpty ? '.bin' : p.extension(media.name);
    final target = File(p.join(directory.path, '$name$extension'));
    await target.writeAsBytes(response.data ?? const []);
    await putJson('media', cacheKey, {'path': target.path});
    return target.path;
  }
}

final installationCacheRepository = InstallationCacheRepository();
