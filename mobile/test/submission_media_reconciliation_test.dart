import 'package:livelihood/model/asset/asset_submission.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/utils/submission_media_reconciliation.dart';
import 'package:livelihood/repositories/installation_cache_repo.dart';

Map<String, dynamic> doc(String uid, String path, {String? store}) => {
      'documentType': 'INSTALLATION_IMAGE-5',
      'documentUid': uid,
      'localPath': path,
      if (store != null) 'fileStore': store,
    };
Map<String, dynamic> payload(List<Map<String, dynamic>> documents,
        {List<Map<String, dynamic>> assets = const [],
        String kind = 'solar'}) =>
    {
      'kind': kind,
      'bom': {'remoteId': 'bom-id', 'submitted': true},
      'workflowDocuments': documents,
      'assets': assets,
    };

class FailingPersistence extends InstallationCacheRepository {
  FailingPersistence(this.saved);
  final Map<String, dynamic> saved;
  @override
  Future<Map<String, dynamic>?> getSubmissionPayload(String id) async => saved;
  @override
  Future<Map<String, dynamic>> putSubmissionPayload(
      String id, Map<String, dynamic> value) async {
    throw StateError('write failed');
  }
}

void main() {
  test('WebP replacement refreshes path and preserves the first two uploads',
      () {
    final saved = payload([
      doc('first', 'first.jpg', store: 'store-1')..['id'] = 'server-doc',
      doc('second', 'second.jpg', store: 'store-2'),
      doc('old-third', 'installation-5-2.webp'),
    ]);
    final latest = payload([
      doc('first', 'first.jpg'),
      doc('second', 'second.jpg'),
      doc('new-third', 'installation-5-2.jpg'),
    ]);
    final merged = reconcileSubmissionMedia(saved, latest);
    final documents = merged['workflowDocuments'] as List;
    expect(documents[0]['fileStore'], 'store-1');
    expect(documents[0]['id'], 'server-doc');
    expect(documents[1]['fileStore'], 'store-2');
    expect(documents[2]['localPath'], 'installation-5-2.jpg');
    expect(documents[2].containsKey('fileStore'), false);
    expect(merged['bom'], saved['bom']);
    expect(saved['workflowDocuments'][2]['localPath'], endsWith('.webp'));
    expect(reconcileSubmissionMedia(merged, latest), merged);
  });
  test('removals and additions follow the draft; same path is not identity',
      () {
    final result = reconcileSubmissionMedia(
        payload([
          doc('removed', 'removed.jpg', store: 'old'),
          doc('old', 'same.jpg', store: 'stale'),
        ]),
        payload([doc('replacement', 'same.jpg'), doc('added', 'added.jpg')]));
    expect(result['workflowDocuments'],
        [doc('replacement', 'same.jpg'), doc('added', 'added.jpg')]);
  });
  test('legacy missing UID and changed document type cannot reuse an upload',
      () {
    final saved = doc('', 'same.jpg', store: 'stale');
    final replacement = doc('', 'same.jpg');
    expect(
        reconcileSubmissionMedia(
            payload([saved]), payload([replacement]))['workflowDocuments'],
        [replacement]);
    final old = doc('uid', 'same.jpg', store: 'stale');
    final current = doc('uid', 'same.jpg')..['documentType'] = 'OTHER';
    expect(
        reconcileSubmissionMedia(
            payload([old]), payload([current]))['workflowDocuments'],
        [current]);
  });
  test('machine replacement retains server identity and forces an update', () {
    final saved = {
      'assetId': 'machine-id',
      'assetTypeID': 'MACHINE',
      'serialNumber': 'SN',
      'submitted': true,
      'documents': [doc('old', 'old.jpg', store: 'old-store')]
    };
    final current = {
      'assetTypeID': 'MACHINE',
      'serialNumber': 'SN',
      'documents': [doc('new', 'new.jpg')]
    };
    final merged = reconcileSubmissionMedia(
        payload([], assets: [saved], kind: 'machine'),
        payload([], assets: [current], kind: 'machine'));
    final asset = (merged['assets'] as List).single;
    expect(asset['assetId'], 'machine-id');
    expect(asset['submitted'], false);
    expect(asset['documents'], current['documents']);
  });
  test(
      'solar child changes invalidate parent while unchanged child keeps checkpoints',
      () {
    final child = {
      'assetId': 'panel-id',
      'assetTypeID': 'PANEL',
      'serialNumber': 'P1',
      'submitted': true,
      'documents': [doc('photo', 'photo.jpg', store: 'uploaded')]
    };
    final parent = {
      'assetId': 'solar-id',
      'assetTypeID': 'SOLAR',
      'submitted': true,
      'documents': [],
      'children': [child]
    };
    final currentChild = {
      'assetTypeID': 'PANEL',
      'serialNumber': 'P1',
      'documents': [doc('photo', 'photo.jpg')]
    };
    final currentParent = {
      'assetTypeID': 'SOLAR',
      'documents': [],
      'children': [currentChild]
    };
    final original = payload([], assets: [parent]);
    final unchanged = reconcileSubmissionMedia(
        original, payload([], assets: [currentParent]));
    expect(unchanged['assets'][0]['submitted'], true);
    expect(unchanged['assets'][0]['children'][0]['assetId'], 'panel-id');
    currentChild['documents'] = <Map<String, dynamic>>[];
    final changed = reconcileSubmissionMedia(
        original, payload([], assets: [currentParent]));
    expect(changed['assets'][0]['submitted'], false);
    expect(changed['assets'][0]['children'][0]['submitted'], false);
    expect(changed['assets'][0]['children'][0]['documents'], isEmpty);
  });
  test('solar server reconciliation does not restore replaced or removed media',
      () {
    final desired = AssetSubmission.fromCheckpoint({
      'assetTypeID': 'SOLAR',
      'documents': [],
      'children': [
        {
          'assetTypeID': 'PANEL',
          'serialNumber': 'P1',
          'documents': [doc('new', 'new.jpg', store: 'new-upload')],
        }
      ],
    });
    final reconciled = reconcileSolarSubmission(desired, {
      'assetId': 'solar-id',
      'assetTypeID': 'SOLAR',
      'children': [
        {
          'assetId': 'panel-id',
          'assetTypeID': 'PANEL',
          'serialNumber': 'P1',
          'documents': [doc('old', 'old.jpg', store: 'old-upload')],
        }
      ],
    });
    expect(reconciled.assetId, 'solar-id');
    expect(reconciled.children.single.assetId, 'panel-id');
    expect(reconciled.children.single.documents.single.fileStore, 'new-upload');
  });

  test(
      'unchanged uploaded children retain submitted flags despite local path differences',
      () {
    final savedDoc = doc('same', 'unused.jpg', store: 'uploaded')
      ..remove('localPath');
    final child = {
      'assetTypeID': 'PANEL',
      'assetId': 'p1',
      'serialNumber': 'SN',
      'submitted': true,
      'documents': [savedDoc]
    };
    final parent = {
      'assetTypeID': 'SOLAR',
      'assetId': 's1',
      'submitted': true,
      'children': [child],
      'documents': []
    };
    final latestChild = {
      'assetTypeID': 'PANEL',
      'serialNumber': 'SN',
      'documents': [doc('same', 'draft.jpg')]
    };
    final latestParent = {
      'assetTypeID': 'SOLAR',
      'children': [latestChild],
      'documents': []
    };
    final merged = reconcileSubmissionMedia(
        payload([], assets: [parent]), payload([], assets: [latestParent]));
    expect(merged['assets'][0]['submitted'], true);
    expect(merged['assets'][0]['children'][0]['submitted'], true);
  });

  test('completed workflow keeps original payload and skips rebuilding',
      () async {
    final saved = payload([doc('old', 'old.jpg')])
      ..['workflowSubmitted'] = true;
    expect(reconcileSubmissionMedia(saved, payload([doc('new', 'new.jpg')])),
        saved);
    final repo = FailingPersistence(saved);
    final result = await repo.ensureSubmissionPayload(
        'af', () => throw StateError('must not build'),
        preserveExisting: true);
    expect(result, saved);
  });
  test('failed checkpoint persistence prevents retry preparation succeeding',
      () async {
    final repo = FailingPersistence(payload([doc('old', 'old.webp')]));
    await expectLater(
        repo.ensureSubmissionPayload(
            'af', () => payload([doc('new', 'new.jpg')]),
            preserveExisting: true),
        throwsStateError);
    expect(repo.saved['workflowDocuments'][0]['localPath'], 'old.webp');
  });
}
