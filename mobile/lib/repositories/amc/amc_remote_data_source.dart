import 'package:dio/dio.dart';

import '../../data/remote_client.dart';
import '../../utils/api_paths.dart';
import '../../utils/envConfig.dart';
import '../filestore_repository.dart';

/// Every call the AMC module makes to a backend. The repositories above this
/// layer stay the same; only this transport is swappable.
abstract class AmcRemoteDataSource {
  /// `POST asset-amc/v1/visit/_search?tenantId&limit&offset`
  /// body `{searchCriteria: {...}}` → `{ScheduledVisits: [...], TotalCount}`.
  Future<Map<String, dynamic>> searchVisits({
    required Map<String, dynamic> searchCriteria,
    required int limit,
    required int offset,
  });

  /// `POST asset-amc/v1/visit/workflow/_update` — both `SUBMIT_VISIT_REPORT`
  /// and `SUBMIT_OTP` go through here. Returns the response body
  /// (`{ResponseInfo, ScheduledVisits: [visit with its new status]}`), or
  /// null if it is not a JSON object.
  Future<Map<String, dynamic>?> updateVisitWorkflow(Map<String, dynamic> body);

  /// `POST asset-amc/v1/visit/_resend_otp` body `{visitId}`.
  Future<void> resendVisitOtp(String visitId);

  /// Pre-report system status: sent when a non-functional status is
  /// saved, so the backend can email the Program POC.
  Future<void> updateSystemStatus(Map<String, dynamic> body);

  /// `POST egov-mdms-service/v2/_search` for the AMC form schema (`amcFormMdmsSchemaCode`);
  /// returns the `mdms` array.
  Future<List<dynamic>> searchAmcFormSchemaDocs(
      Map<String, dynamic> mdmsRequestBody);

  /// `POST filestore/v1/files` (module `Incident`) → `fileStoreId`.
  Future<String> uploadFile(String localFilePath);
}

AmcRemoteDataSource amcRemoteDataSource = HttpAmcRemoteDataSource();

/// The real calls (Livelihood AMC API contract). `RequestInfo` (token and
/// user) is added by `AuthTokenInterceptor`.
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
  Future<Map<String, dynamic>?> updateVisitWorkflow(
      Map<String, dynamic> body) async {
    final response = await dio.post(
      ApiPaths.amcVisitWorkflowUpdate,
      queryParameters: _tenant,
      data: body,
    );
    final data = response.data;
    return data is Map ? Map<String, dynamic>.from(data) : null;
  }

  @override
  Future<void> resendVisitOtp(String visitId) async {
    await dio.post(
      ApiPaths.amcVisitResendOtp,
      queryParameters: _tenant,
      data: <String, dynamic>{'visitId': visitId},
    );
  }

  @override
  Future<void> updateSystemStatus(Map<String, dynamic> body) async {
    await dio.post(
      ApiPaths.amcVisitSystemStatusUpdate,
      queryParameters: _tenant,
      data: body,
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

  Map<String, dynamic> get _tenant =>
      {'tenantId': envConfig.variables.tenantId};

  @override
  Future<String> uploadFile(String localFilePath) =>
      filestoreRepository.upload(localFilePath, module: 'Incident');
}
