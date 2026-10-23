import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/model/asset/asset_submission.dart';
import 'package:livelihood/repositories/vendor_org_repository.dart';
import 'package:livelihood/utils/envConfig.dart';

class _Repository extends VendorOrgRepository {
  _Repository(Dio dio, {this.organizationId = 'cached-org'}) : super(dio: dio);

  final String? organizationId;

  @override
  Future<String?> currentUserOrgId() async => organizationId;
}

Map<String, dynamic> orgUser(String id, List<String> roles) => {
      'userId': id,
      'user': {
        'roles': roles.map((code) => {'code': code}).toList(),
      },
    };

void main() {
  setUpAll(() async => envConfig.initialize());
  const both = ['LIVELIHOOD_VENDOR', 'COMPLAINT_RESOLVER'];
  late Dio dio;
  late List<RequestOptions> requests;

  setUp(() {
    dio = Dio(BaseOptions(baseUrl: 'https://example.test/'));
    requests = [];
  });

  void respond(List<Map<String, dynamic>> pages) {
    dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
      requests.add(options);
      handler.resolve(Response(
        requestOptions: options,
        data: pages[requests.length - 1],
      ));
    }));
  }

  test('selects first user with both roles and searches again on each call',
      () async {
    final page = {
      'OrgUsers': [
        orgUser('vendor-only', ['LIVELIHOOD_VENDOR']),
        orgUser('selected', both),
        orgUser('second', both),
      ],
      'TotalCount': 3,
    };
    respond([page, page]);
    final repository = _Repository(dio);
    expect(await repository.currentUserVendorId(), 'selected');
    expect(await repository.currentUserVendorId(), 'selected');
    expect(requests, hasLength(2));
    expect(requests.first.data['OrgUser'], {
      'tenantId': envConfig.variables.tenantId,
      'organizationIds': ['cached-org'],
    });
    expect(requests.first.queryParameters['limit'], 10);
    expect(requests.first.queryParameters['offset'], 0);
  });

  test('split roles and missing roles do not match', () async {
    respond([
      {
        'OrgUsers': [
          orgUser('one', ['LIVELIHOOD_VENDOR']),
          orgUser('two', ['COMPLAINT_RESOLVER']),
          {'userId': 'missing', 'user': {}},
        ],
        'TotalCount': 3,
      }
    ]);
    expect(await _Repository(dio).currentUserVendorId(), '');
  });

  test('empty results return empty vendor ID', () async {
    respond([
      {'OrgUsers': [], 'TotalCount': 0}
    ]);
    expect(await _Repository(dio).currentUserVendorId(), '');
  });

  test('searches later pages', () async {
    respond([
      {
        'OrgUsers': List.generate(10, (i) => orgUser('$i', [])),
        'TotalCount': 11,
      },
      {
        'OrgUsers': [orgUser('later', both)],
        'TotalCount': 11
      },
    ]);
    expect(await _Repository(dio).currentUserVendorId(), 'later');
    expect(requests.last.queryParameters['offset'], 10);
  });

  test('exhausts full pages without TotalCount', () async {
    respond([
      {'OrgUsers': List.generate(10, (i) => orgUser('$i', []))},
      {'OrgUsers': []},
    ]);
    expect(await _Repository(dio).currentUserVendorId(), '');
    expect(requests, hasLength(2));
  });

  test('missing organization preserves mapping error', () async {
    await expectLater(
      _Repository(dio, organizationId: '').currentUserVendorId(),
      throwsA(predicate((error) => error
          .toString()
          .contains('No vendor organization is linked to the signed-in user'))),
    );
    expect(requests, isEmpty);
  });

  test('request failures propagate', () async {
    dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
      handler.reject(DioException(requestOptions: options));
    }));
    await expectLater(
        _Repository(dio).currentUserVendorId(), throwsA(isA<DioException>()));
  });

  test('empty vendor serializes on parent and stays absent on children', () {
    final asset = AssetSubmission.fromCheckpoint({
      'assetTypeID': 'SOLAR',
      'children': [
        {'assetTypeID': 'PANEL'}
      ],
    });
    final json = asset.toRegistryJson(
      tenantId: 'livelihood',
      facilityId: 'facility',
      activityFacilityId: 'activity',
      vendorId: '',
    );
    expect(json['vendorId'], '');
    expect((json['children'] as List).single, isNot(contains('vendorId')));
  });
}
