import 'dart:io';

import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';
import 'package:mime/mime.dart';

import '../data/remote_client.dart';
import '../utils/api_paths.dart';
import '../utils/envConfig.dart';

/// `POST filestore/v1/files` — multipart upload, reused by both BOM-media
/// and completion-report upload stages of the submission pipeline.
class FilestoreRepository {
  Future<String> upload(String localFilePath, {required String module}) async {
    final file = File(localFilePath);
    var fileName = file.uri.pathSegments.last;
    var mimeType = lookupMimeType(localFilePath);

    if (mimeType == null) {
      final bytes = await file.openRead(0, 64).fold<List<int>>(
            [],
            (previous, chunk) => previous..addAll(chunk),
          );
      mimeType = lookupMimeType('', headerBytes: bytes);
    }
    if (!fileName.contains('.') && mimeType != null) {
      fileName = '$fileName.${extensionFromMime(mimeType)}';
    }

    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        localFilePath,
        filename: fileName,
        contentType: mimeType != null ? MediaType.parse(mimeType) : null,
      ),
      'tenantId': envConfig.variables.tenantId,
      'module': module,
    });

    final response = await DioClient()
        .dio
        .post(ApiPaths.fileStoreUpload, data: formData)
        .timeout(const Duration(minutes: 20));

    final files = response.data is Map ? response.data['files'] : null;
    if (files is! List || files.isEmpty) {
      throw Exception('Filestore returned no files array');
    }
    final fileStoreId = (files.first as Map)['fileStoreId']?.toString();
    if (fileStoreId == null) {
      throw Exception('Filestore response missing fileStoreId');
    }
    return fileStoreId;
  }
}

final filestoreRepository = FilestoreRepository();
