import 'dart:convert';

import 'package:dio/dio.dart';

/// Extract backend-provided copy; return null to keep the generic fallback.
String? submissionErrorMessage(Object error) {
  if (error is! DioException) return null;

  dynamic body = error.response?.data;
  try {
    if (body is List<int>) body = utf8.decode(body);
    if (body is String) body = jsonDecode(body);
  } on FormatException {
    return null;
  }
  if (body is! Map) return null;

  final nestedError = body['error'];
  return _messagesFromList(body['Errors']) ??
      (nestedError is Map
          ? _messagesFromList(nestedError['fields']) ??
              _nonEmptyMessage(nestedError['message'])
          : null) ??
      _nonEmptyMessage(body['message']);
}

String? _messagesFromList(dynamic errors) {
  if (errors is! List) return null;
  final messages = errors
      .whereType<Map>()
      .map((entry) => _nonEmptyMessage(entry['message']))
      .whereType<String>()
      .toSet();
  return messages.isEmpty ? null : messages.join('\n');
}

String? _nonEmptyMessage(dynamic value) {
  if (value is! String) return null;
  final message = value.trim();
  return message.isEmpty ? null : message;
}
