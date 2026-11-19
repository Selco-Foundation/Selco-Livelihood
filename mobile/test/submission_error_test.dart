import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/utils/submission_error.dart';

void main() {
  DioException failure(dynamic body) => DioException(
        requestOptions: RequestOptions(),
        response: Response(requestOptions: RequestOptions(), data: body),
      );

  test('reads the PARENT_NOT_FOUND backend message', () {
    const message = 'Parent entity with boundary code '
        'INDIA_MEGHALAYA_RIBHOI_BHOIRYMBONGRIBHOI_ED/2026/0096 does not exist.';
    expect(
      submissionErrorMessage(failure({
        'Errors': [
          {'code': 'PARENT_NOT_FOUND', 'message': message},
        ],
      })),
      message,
    );
  });

  test('reads the top-level PDF/Kafka error from submission', () {
    const message = 'error in createPdfBinary error while publishing to kafka: '
        'Broker not available (loadMetadataForTopics)';
    expect(submissionErrorMessage(failure({'message': message})), message);
  });

  test('trims and deduplicates Errors messages before other formats', () {
    expect(
        submissionErrorMessage(failure({
          'Errors': [
            {'message': ' First problem '},
            {'message': 'First problem'},
            {'message': 'Second problem'},
            {'message': ''},
            {'message': 123},
            'invalid entry',
          ],
          'error': {'message': 'Nested fallback'},
          'message': 'Top-level fallback',
        })),
        'First problem\nSecond problem');
  });

  test('reads nested fields before nested and top-level messages', () {
    expect(
        submissionErrorMessage(failure({
          'Errors': [],
          'error': {
            'fields': [
              {'message': ' Invalid serial '},
              {'message': 'Invalid serial'},
              {'message': 'Missing capacity'},
            ],
            'message': 'Nested fallback',
          },
          'message': 'Top-level fallback',
        })),
        'Invalid serial\nMissing capacity');
  });

  test('falls back through unusable lists and nested messages', () {
    expect(
        submissionErrorMessage(failure({
          'Errors': [
            {'message': ' '}
          ],
          'error': {'fields': [], 'message': ' Nested error '},
          'message': 'Top-level fallback',
        })),
        'Nested error');
    expect(
        submissionErrorMessage(failure({
          'Errors': 'invalid list',
          'error': {
            'fields': [null],
            'message': false
          },
          'message': ' Top-level error ',
        })),
        'Top-level error');
  });

  test('decodes JSON strings and UTF-8 bytes', () {
    final encoded = jsonEncode({'message': 'Échec de soumission'});
    expect(submissionErrorMessage(failure(encoded)), 'Échec de soumission');
    expect(submissionErrorMessage(failure(utf8.encode(encoded))),
        'Échec de soumission');
  });

  test('missing or unusable messages leave the generic fallback', () {
    for (final body in [
      null,
      'error',
      '{invalid json',
      jsonEncode(['not an error object']),
      [0xff],
      {'message': 123},
      {
        'message': ' ',
        'error': {'message': null}
      },
      {},
      {'Errors': []},
      {
        'Errors': [
          {'message': ' '},
          {'message': null}
        ]
      }
    ]) {
      expect(submissionErrorMessage(failure(body)), isNull);
    }
    expect(submissionErrorMessage(Exception('internal error')), isNull);
  });
}
