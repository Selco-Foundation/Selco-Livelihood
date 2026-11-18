import 'package:dio/dio.dart';

String? submissionErrorMessage(Object error) {
  final body = error is DioException ? error.response?.data : null;
  final errors = body is Map ? body['Errors'] : null;
  if (errors is! List) return null;

  final messages = errors
      .whereType<Map>()
      .map((entry) => entry['message'])
      .whereType<String>()
      .map((message) => message.trim())
      .where((message) => message.isNotEmpty)
      .toSet();
  return messages.isEmpty ? null : messages.join('\n');
}
