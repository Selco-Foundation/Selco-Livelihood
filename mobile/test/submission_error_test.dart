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

  test('missing or unusable messages leave the generic fallback', () {
    for (final body in [
      null,
      'error',
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
