// ignore_for_file: file_names

import 'dart:async';

import 'package:flutter_dotenv/flutter_dotenv.dart';

EnvironmentConfiguration envConfig = EnvironmentConfiguration.instance;

/// Joins [baseUrl] and [relativePath] into a single http(s) URL, trimming
/// duplicate slashes at the seam. Returns null if [relativePath] is empty or
/// the resulting URL isn't http/https (e.g. the env var was never set).
Uri? buildEnvironmentUrl(String baseUrl, String relativePath) {
  if (relativePath.trim().isEmpty) return null;

  final trimmedBase = baseUrl.endsWith('/')
      ? baseUrl.substring(0, baseUrl.length - 1)
      : baseUrl;
  final trimmedPath =
      relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;

  final uri = Uri.tryParse('$trimmedBase/$trimmedPath');
  if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
    return null;
  }
  return uri;
}

class EnvironmentConfiguration {
  static final EnvironmentConfiguration _instance =
      EnvironmentConfiguration._internal();

  static EnvironmentConfiguration get instance => _instance;

  EnvironmentConfiguration._internal();

  bool _initialized = false;
  late DotEnv _dotEnv;
  late Variables _variables;

  FutureOr<void> initialize() async {
    _dotEnv = DotEnv();
    try {
      await _dotEnv.load();
      _variables = Variables(dotEnv: _dotEnv);
    } catch (error) {
      _variables = Variables(useFallbackValues: true, dotEnv: _dotEnv);
    } finally {
      _initialized = true;
    }
  }

  Variables get variables {
    if (!_initialized) {
      throw Exception('EnvironmentConfiguration has not been initialized');
    }
    return _variables;
  }
}

class Variables {
  Variables({required DotEnv dotEnv, this.useFallbackValues = false})
      : _dotEnv = dotEnv;

  final DotEnv _dotEnv;
  final bool useFallbackValues;

  static const _envName = EnvEntry('ENV_NAME', 'DEV');
  static const _baseUrl = EnvEntry(
    'BASE_URL',
    'https://setu4livelihood-dev.selcofoundation.org/',
  );
  static const _tenantId = EnvEntry('TENANT_ID', 'default');
  static const _mobileAppGlobal = EnvEntry('MOBILE_APP_GLOBAL', '');
  static const _connectTimeout = EnvEntry('CONNECT_TIMEOUT', '1200000');
  static const _receiveTimeout = EnvEntry('RECEIVE_TIMEOUT', '1200000');
  static const _sendTimeout = EnvEntry('SEND_TIMEOUT', '1200000');
  static const _privacyPolicyUrl = EnvEntry('PRIVACY_POLICY_URL', '');
  static const _termsAndConditionsUrl =
      EnvEntry('TERMS_AND_CONDITIONS_URL', '');

  String _get(EnvEntry entry) => useFallbackValues
      ? entry.value
      : _dotEnv.get(entry.key, fallback: entry.value);

  String get baseUrl => _get(_baseUrl);

  String get tenantId => _get(_tenantId);

  String get mobileAppGlobalUrl => _get(_mobileAppGlobal);

  int get connectTimeout => int.parse(_get(_connectTimeout));

  int get receiveTimeout => int.parse(_get(_receiveTimeout));

  int get sendTimeout => int.parse(_get(_sendTimeout));

  String get privacyPolicyUrl => _get(_privacyPolicyUrl);

  String get termsAndConditionsUrl => _get(_termsAndConditionsUrl);

  EnvType get envType =>
      EnvType.values.firstWhere(
        (type) => type.value == _get(_envName),
        orElse: () => EnvType.dev,
      );
}

class EnvEntry {
  final String key;
  final String value;

  const EnvEntry(this.key, this.value);
}

enum EnvType {
  dev('DEV'),
  uat('UAT'),
  qa('QA'),
  prod('PROD');

  const EnvType(this.value);

  final String value;
}
