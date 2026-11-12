import 'package:dio/dio.dart';

import '../../data/remote_client.dart';
import '../../utils/api_paths.dart';
import '../../utils/envConfig.dart';
import '../filestore_repository.dart';
import 'amc_dummy_backend.dart';

export 'amc_dummy_backend.dart' show isDummyFileStoreId;

/// DUMMY-BACKEND: the single switch for every AMC backend interaction.
///
/// `true`  → [DummyAmcRemoteDataSource]: no network, sample data, a
///           file-backed fake server (see `amc_dummy_backend.dart`).
/// `false` → [HttpAmcRemoteDataSource]: the exact E4H requests
///           (`asset-amc/v1/...`, MDMS v2, filestore).
///
/// See `mobile/AMC_DUMMY_BACKEND.md` for every dummy location and what to
/// confirm with the backend team before switching this off.
const bool kAmcUseDummyBackend = true;

/// Every call the AMC module makes to a backend. The repositories above this
/// layer are E4H's logic, unchanged; only this transport is swappable.
abstract class AmcRemoteDataSource {
  /// `POST asset-amc/v1/visit/_search?tenantId&limit&offset`
  /// body `{searchCriteria: {...}}` → `{ScheduledVisits: [...], TotalCount}`.
  Future<Map<String, dynamic>> searchVisits({
    required Map<String, dynamic> searchCriteria,
    required int limit,
    required int offset,
  });

  /// `POST asset-amc/v1/visit/workflow/_update` — both `SUBMIT_VISIT_REPORT`
  /// and `SUBMIT_OTP` go through here.
  Future<void> updateVisitWorkflow(Map<String, dynamic> body);

  /// `POST asset-amc/v1/visit/_resend_otp` body `{visitId}`.
  Future<void> resendVisitOtp(String visitId);

  /// `POST egov-mdms-service/v2/_search` for `common-masters.AMCFormSchema`;
  /// returns the `mdms` array.
  Future<List<dynamic>> searchAmcFormSchemaDocs(
      Map<String, dynamic> mdmsRequestBody);

  /// `POST filestore/v1/files` (module `Incident`, as E4H) → `fileStoreId`.
  Future<String> uploadFile(String localFilePath);

  /// `GET filestore/v1/files/file?tenantId&fileStoreId` → file bytes, or
  /// null when the file can't be fetched.
  Future<List<int>?> downloadFile(String fileStoreId);
}

AmcRemoteDataSource amcRemoteDataSource = kAmcUseDummyBackend
    ? DummyAmcRemoteDataSource()
    : HttpAmcRemoteDataSource();

/// The real calls, request-for-request identical to E4H
/// (`scheduled_visit_repo.dart`, `app_init_repo.dart`, `asset_repo.dart`,
/// `utils.dart getCachedFile`).
class HttpAmcRemoteDataSource implements AmcRemoteDataSource {
  HttpAmcRemoteDataSource({Dio? dio}) : _dio = dio;

  final Dio? _dio;

  Dio get dio => _dio ?? DioClient().dio;

  @override
  Future<Map<String, dynamic>> searchVisits({
    required Map<String, dynamic> searchCriteria,
    required int limit,
    required int offset,
  }) async {
    final response = await dio.post(
      ApiPaths.amcVisitSearch,
      queryParameters: {
        'tenantId': envConfig.variables.tenantId,
        'limit': limit,
        'offset': offset,
      },
      data: {'searchCriteria': searchCriteria},
    );
    return Map<String, dynamic>.from(response.data as Map);
  }

  @override
  Future<void> updateVisitWorkflow(Map<String, dynamic> body) async {
    await dio.post(ApiPaths.amcVisitWorkflowUpdate, data: body);
  }

  @override
  Future<void> resendVisitOtp(String visitId) async {
    await dio.post(
      ApiPaths.amcVisitResendOtp,
      data: <String, dynamic>{'visitId': visitId},
    );
  }

  @override
  Future<List<dynamic>> searchAmcFormSchemaDocs(
      Map<String, dynamic> mdmsRequestBody) async {
    final response = await dio.post(
      ApiPaths.mdmsV2Search,
      data: mdmsRequestBody,
      options: Options(headers: const <String, String>{
        'Access-Control-Allow-Origin': '*',
        'authorization': 'Basic ZWdvdi11c2VyLWNsaWVudDo=',
      }),
    );
    final data = response.data;
    if (data is! Map) {
      throw Exception('MDMS v2 response is not a JSON object');
    }
    final raw = data['mdms'];
    if (raw is! List) {
      throw Exception('MDMS v2 response missing "mdms" array');
    }
    return raw;
  }

  @override
  Future<String> uploadFile(String localFilePath) =>
      filestoreRepository.upload(localFilePath, module: 'Incident');

  @override
  Future<List<int>?> downloadFile(String fileStoreId) async {
    // E4H fetches this public URL with a plain HTTP GET (no auth headers).
    final response = await Dio().get<List<int>>(
      '${envConfig.variables.baseUrl}${ApiPaths.fileStoreFile}',
      queryParameters: {
        'tenantId': envConfig.variables.tenantId,
        'fileStoreId': fileStoreId,
      },
      options: Options(
        responseType: ResponseType.bytes,
        validateStatus: (status) => status != null,
      ),
    );
    return response.statusCode == 200 ? response.data : null;
  }
}
