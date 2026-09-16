import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kDebugMode, debugPrint;
import 'package:synchronized/synchronized.dart';

import '../model/request/requestInfo.dart';
import '../model/response/responsemodel.dart';
import '../repositories/auth_repo.dart';
import '../utils/api_paths.dart';
import '../utils/constants.dart';
import '../utils/envConfig.dart';
import 'network_manager.dart';
import 'remote_client.dart';
import 'secure_storage/secureStore.dart';

typedef SessionExpiredCallback = Future<void> Function();

const String suppressSessionExpiryExtraKey = 'suppressSessionExpiry';

class AuthTokenInterceptor extends Interceptor {
  final _lock = Lock();
  static const _maxRetries = 5;

  static SessionExpiredCallback? onSessionExpired;

  static bool _logoutTriggered = false;

  /// Must be called after a fresh successful login — without it, once one
  /// session has been force-logged-out, [_triggerLogoutOnce] would silently
  /// no-op forever afterwards for the lifetime of the app process, even for
  /// an entirely new session that later also expires.
  static void resetLogoutGuard() {
    _logoutTriggered = false;
  }

  static Future<void> _triggerLogoutOnce() async {
    if (_logoutTriggered) return;
    _logoutTriggered = true;

    try {
      await HttpAuthRepository().logout();
    } catch (_) {}

    try {
      await onSessionExpired?.call();
    } catch (_) {}
  }

  DioException _sessionExpiredError(DioException original) {
    return DioException(
      requestOptions: original.requestOptions,
      response: original.response,
      type: original.type,
      error: original.error,
      message: 'SESSION_EXPIRED',
    );
  }

  bool _refreshTokenLooksExpired(Object e) {
    if (e is DioException) {
      final code = e.response?.statusCode;

      if (code == 401 || code == 403) return true;

      final data = e.response?.data;
      if (data is Map) {
        final err = (data['error'] ?? '').toString().toLowerCase();
        final desc = (data['error_description'] ?? '').toString().toLowerCase();

        if (err.contains('invalid') || desc.contains('invalid')) return true;
        if (err.contains('expired') || desc.contains('expired')) return true;
      }
    }
    return false;
  }

  @override
  Future<dynamic> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    try {
      await NetworkService().ensureOnlineOrThrow();
    } on NetworkException catch (e) {
      final code = e.message.toLowerCase().contains('internet')
          ? LoginErrorCode.noInternet
          : LoginErrorCode.noNetwork;
      return handler.reject(
        DioException(
          requestOptions: options,
          type: DioExceptionType.unknown,
          error: AppNetworkException(code, rawMessage: e.message),
          message: code.name,
        ),
      );
    }

    final secureStore = SecureStore();
    final authToken = await secureStore.getAccessToken();
    final ResponseModel? accessInfo = await secureStore.getAccessInfo();

    if (options.data is Map) {
      options.data = {
        ...options.data,
        "RequestInfo": RequestInfoModel(
                apiId: RequestInfoData.apiId,
                ver: RequestInfoData.ver,
                ts: DateTime.now().millisecondsSinceEpoch,
                action: options.path.split('/').last,
                did: RequestInfoData.did,
                key: RequestInfoData.key,
                msgId: "${DateTime.now().millisecondsSinceEpoch}|en_IN",
                authToken: authToken,
                userInfo: accessInfo?.userRequest)
            .toJson(),
      };
    }
    return handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.requestOptions.extra[suppressSessionExpiryExtraKey] == true) {
      return handler.next(err);
    }

    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    final attempts = (err.requestOptions.extra['retryAttempts'] as int?) ?? 0;
    if (attempts >= _maxRetries) {
      await _triggerLogoutOnce();
      return handler.reject(_sessionExpiredError(err));
    }

    try {
      await _lock.synchronized(() async {
        await HttpAuthRepository().refreshToken();
      });
    } catch (e) {
      if (_refreshTokenLooksExpired(e)) {
        await _triggerLogoutOnce();
        return handler.reject(_sessionExpiredError(err));
      }

      return handler.next(err);
    }

    try {
      final dio = DioClient().dio;

      final ro = err.requestOptions;
      ro.extra = Map<String, dynamic>.from(ro.extra)
        ..update('retryAttempts', (v) => (v as int) + 1, ifAbsent: () => 1);

      final newResponse = await dio.fetch(ro);
      return handler.resolve(newResponse);
    } on DioException catch (e) {
      return handler.next(e);
    }
  }
}

class NetworkPrecheckInterceptor extends Interceptor {
  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    try {
      await NetworkService().ensureOnlineOrThrow();
      handler.next(options);
    } on NetworkException catch (e) {
      final lower = e.message.toLowerCase();
      final code = lower.contains('internet')
          ? LoginErrorCode.noInternet
          : LoginErrorCode.noNetwork;
      handler.reject(
        DioException(
          requestOptions: options,
          type: DioExceptionType.unknown,
          error: AppNetworkException(code, rawMessage: e.message),
          message: code.name,
        ),
      );
    }
  }
}

class NetworkErrorNormalizerInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.error is AppNetworkException) {
      handler.next(err);
      return;
    }

    final code = _resolve(err);
    final mapped = DioException(
      requestOptions: err.requestOptions,
      response: err.response,
      type: err.type,
      error: AppNetworkException(code, rawMessage: err.message),
      message: code.name,
    );

    handler.next(mapped);
  }

  LoginErrorCode _resolve(DioException e) {
    if (_isInvalidCredentialError(e)) {
      return LoginErrorCode.invalidCredentials;
    }

    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return LoginErrorCode.requestTimeout;
    }

    if (e.type == DioExceptionType.connectionError ||
        _looksLikeTransportFailure(e.message)) {
      return LoginErrorCode.connectionFailed;
    }

    final status = e.response?.statusCode ?? 0;
    if (status >= 500) return LoginErrorCode.serverError;

    return LoginErrorCode.unknown;
  }

  bool _isInvalidCredentialError(DioException e) {
    final data = e.response?.data;
    final status = e.response?.statusCode ?? 0;

    if (status == 401) return true;

    if (data is Map<String, dynamic>) {
      final err = (data['error'] ?? '').toString().toLowerCase();
      final desc = (data['error_description'] ?? '').toString().toLowerCase();
      if (err.contains('invalid_grant') || desc.contains('bad credentials')) {
        return true;
      }
      if (err.contains('invalid') && desc.contains('credential')) {
        return true;
      }
    }

    return false;
  }

  bool _looksLikeTransportFailure(String? message) {
    final msg = (message ?? '').toLowerCase();
    if (msg.isEmpty) return false;
    return msg.contains('failed host lookup') ||
        msg.contains('socketexception') ||
        msg.contains('connection error') ||
        msg.contains('network is unreachable') ||
        msg.contains('connection reset');
  }
}

/// Debug-only request/error logging for troubleshooting API issues (e.g.
/// the currently-broken OTP endpoints). Gated on `kDebugMode` so nothing
/// ships in release builds. Registered last in `DioClient`'s interceptor
/// list (`lib/data/remote_client.dart`) so its `onRequest` sees the fully
/// built request — after `AuthTokenInterceptor` has injected the
/// `RequestInfo` envelope — and its `onError` sees the raw error before
/// `NetworkErrorNormalizerInterceptor` gets a chance to transform it (Dio
/// runs `onRequest` in list order, `onError` in reverse list order).
///
/// Successful responses remain suppressed except for OTP generate/resend in
/// debug DEV builds. The DEV backend echoes the OTP for end-to-end testing;
/// limiting that exception by build mode, environment, and exact endpoint
/// keeps it out of QA/UAT/production logs. Requests still log in full, and a
/// failed call logs everything, including the response body, via [onError].
class LoggingInterceptor extends Interceptor {
  LoggingInterceptor({
    bool Function()? otpResponseLoggingEnabled,
    void Function(String)? logSink,
  })  : _otpResponseLoggingEnabled =
            otpResponseLoggingEnabled ?? _defaultOtpResponseLoggingEnabled,
        _logSink = logSink ?? debugPrint;

  final bool Function() _otpResponseLoggingEnabled;
  final void Function(String) _logSink;

  static bool _defaultOtpResponseLoggingEnabled() => allowsOtpResponseLogging(
        isDebugBuild: kDebugMode,
        environment: envConfig.variables.envType,
      );

  static bool allowsOtpResponseLogging({
    required bool isDebugBuild,
    required EnvType environment,
  }) =>
      isDebugBuild && environment == EnvType.dev;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (kDebugMode) {
      _log('REQUEST', [
        '${options.method} ${options.uri}',
        'Headers: ${_redactHeaders(options.headers)}',
        'Body: ${_pretty(_redactBody(options.data))}',
      ]);
    }
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final statusCode = response.statusCode;
    final isSuccessful =
        statusCode != null && statusCode >= 200 && statusCode < 300;
    if (isSuccessful &&
        _otpResponseLoggingEnabled() &&
        _isOtpGenerateOrResend(response.requestOptions)) {
      _log('OTP RESPONSE', [
        '${response.requestOptions.method} ${response.requestOptions.uri}',
        'Status: ${response.statusCode}',
        'Response body: ${_pretty(_redactBody(response.data))}',
      ]);
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (kDebugMode) {
      _log('ERROR', [
        '${err.requestOptions.method} ${err.requestOptions.uri}',
        'Headers: ${_redactHeaders(err.requestOptions.headers)}',
        'Request body: ${_pretty(_redactBody(err.requestOptions.data))}',
        'Status: ${err.response?.statusCode}',
        'Response body: ${_pretty(_redactBody(err.response?.data))}',
        'Message: ${err.message}',
      ]);
    }
    handler.next(err);
  }

  void _log(String label, List<String> lines) {
    _logSink('┌── HTTP $label ──');
    for (final line in lines) {
      _logSink(line);
    }
    _logSink('└──────────────────');
  }

  bool _isOtpGenerateOrResend(RequestOptions options) {
    final path = options.uri.path.replaceFirst(RegExp(r'^/+'), '');
    return path == ApiPaths.otpGenerate || path == ApiPaths.otpResend;
  }

  Map<String, dynamic> _redactHeaders(Map<String, dynamic> headers) {
    final copy = Map<String, dynamic>.from(headers);
    for (final key in copy.keys.toList()) {
      if (key.toLowerCase() == 'authorization') copy[key] = '***';
    }
    return copy;
  }

  /// DIGIT/eGov puts auth tokens in request `RequestInfo` and response
  /// `ResponseInfo` envelopes rather than relying only on an Authorization
  /// header. Mask both without disturbing other fields such as DEV OTP data.
  dynamic _redactBody(dynamic data) {
    if (data is Map) {
      final copy = Map<String, dynamic>.from(data);
      for (final envelopeKey in const ['RequestInfo', 'ResponseInfo']) {
        final envelope = copy[envelopeKey];
        if (envelope is Map && envelope['authToken'] != null) {
          copy[envelopeKey] = {...envelope, 'authToken': '***'};
        }
      }
      return copy;
    }
    return data;
  }

  String _pretty(dynamic data) {
    if (data == null) return 'null';
    try {
      return const JsonEncoder.withIndent('  ').convert(data);
    } catch (_) {
      return data.toString();
    }
  }
}
