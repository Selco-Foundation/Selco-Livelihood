import 'package:dio/dio.dart';

import '../data/remote_client.dart';
import '../utils/api_paths.dart';

class OtpResult {
  const OtpResult({required this.success, this.message});

  final bool success;
  final String? message;
}

/// `_generate-otp` / `_validate-otp` / `_resend-otp` on `field-planner-activity`.
/// The code itself is SMS'd to the facility contact and is never surfaced
/// here even though the dev backend happens to echo `otp.otp` in its
/// response. Validation failure comes back as HTTP 200 with
/// `error.fields[0].code == "OTP.VALIDATION_UNSUCCESSFUL"` (confirmed from
/// the Postman collection), so the payload is checked directly rather than
/// trusting the HTTP status.
class OtpRepository {
  Future<OtpResult> generate(String activityFacilityId) =>
      _sendOtp(ApiPaths.otpGenerate, activityFacilityId);

  Future<OtpResult> resend(String activityFacilityId) =>
      _sendOtp(ApiPaths.otpResend, activityFacilityId);

  Future<OtpResult> _sendOtp(String path, String activityFacilityId) async {
    try {
      final response = await DioClient().dio.post(
        path,
        data: {'activityFacilityId': activityFacilityId},
      ).timeout(const Duration(seconds: 20));
      final body = response.data;
      final errorMessage = _errorMessageFromBody(body);
      if (errorMessage != null) {
        return OtpResult(success: false, message: errorMessage);
      }
      final otp = body is Map ? body['otp'] : null;
      return OtpResult(success: otp != null);
    } on DioException catch (e) {
      return OtpResult(success: false, message: _errorMessageFromException(e));
    }
  }

  Future<OtpResult> validate(String activityFacilityId, String otp) async {
    try {
      final response = await DioClient().dio.post(
        ApiPaths.otpValidate,
        data: {'activityFacilityId': activityFacilityId, 'otp': otp},
      ).timeout(const Duration(seconds: 20));
      final body = response.data;
      final errorMessage = _errorMessageFromBody(body);
      if (errorMessage != null) {
        return OtpResult(success: false, message: errorMessage);
      }
      final isValid = body is Map &&
          body['otp'] is Map &&
          (body['otp'] as Map)['isValidationSuccessful'] == true;
      return OtpResult(
        success: isValid,
        message: isValid ? null : 'Incorrect OTP, please try again',
      );
    } on DioException catch (e) {
      return OtpResult(success: false, message: _errorMessageFromException(e));
    }
  }

  String? _errorMessageFromBody(dynamic body) {
    if (body is! Map || body['error'] is! Map) return null;
    final error = body['error'] as Map;
    final fields = error['fields'];
    if (fields is List && fields.isNotEmpty && fields.first is Map) {
      final message = (fields.first as Map)['message'];
      if (message is String && message.isNotEmpty) return message;
    }
    final message = error['message'];
    return message is String ? message : 'Request failed';
  }

  String _errorMessageFromException(DioException e) {
    final fromBody = _errorMessageFromBody(e.response?.data);
    if (fromBody != null) return fromBody;
    final data = e.response?.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return e.message ?? 'Request failed';
  }
}

/// Mutable (not `final`), matching `activityFacilityRepository`'s convention:
/// widget tests swap this for a fake to avoid real network calls from deep
/// inside `OtpVerificationWidget`, and should restore it via `addTearDown`.
OtpRepository otpRepository = OtpRepository();
