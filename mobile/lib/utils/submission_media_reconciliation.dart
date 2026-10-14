import 'dart:convert';

/// Draft media is authoritative; server IDs and completed work belong to the
/// checkpoint. A path is not an identity: picking again can overwrite it.
Map<String, dynamic> reconcileSubmissionMedia(
  Map<String, dynamic> existing,
  Map<String, dynamic> latest,
) {
  final result =
      Map<String, dynamic>.from(jsonDecode(jsonEncode(existing)) as Map);
  if (existing['workflowSubmitted'] == true) return result;
  if (existing['kind'] != latest['kind']) {
    throw StateError('Cannot reconcile different submission kinds.');
  }
  result['workflowDocuments'] =
      _documents(existing['workflowDocuments'], latest['workflowDocuments']);
  result['assets'] = _assets(existing['assets'], latest['assets']);
  return result;
}

List<Map<String, dynamic>> _maps(dynamic value) => value is List
    ? value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList()
    : [];

String _text(dynamic value) => value?.toString().trim() ?? '';

bool _sameDocument(Map<String, dynamic> first, Map<String, dynamic> second) =>
    _text(first['documentUid']).isNotEmpty &&
    first['documentUid'] == second['documentUid'] &&
    first['documentType'] == second['documentType'];

List<Map<String, dynamic>> _documents(dynamic saved, dynamic current) {
  final old = _maps(saved);
  return _maps(current).map((document) {
    final match =
        old.where((other) => _sameDocument(document, other)).firstOrNull;
    if (match == null) return document;
    final uploaded =
        _text(match['fileStore'] ?? match['fileStoreId'] ?? match['remoteId']);
    return <String, dynamic>{
      ...document,
      for (final key in ['id', 'status', 'additionalDetails', 'geoLocation'])
        if (match[key] != null) key: match[key],
      if (uploaded.isNotEmpty) 'fileStore': uploaded,
    };
  }).toList();
}

bool _sameAsset(Map<String, dynamic> first, Map<String, dynamic> second) {
  final firstId = _text(first['assetId'] ?? first['assetID']);
  final secondId = _text(second['assetId'] ?? second['assetID']);
  if (firstId.isNotEmpty && secondId.isNotEmpty) return firstId == secondId;
  return first['assetTypeID'] == second['assetTypeID'] &&
      _text(first['serialNumber']) == _text(second['serialNumber']) &&
      (_text(first['serialNumber']).isNotEmpty ||
          first['assetTypeID'] == 'SOLAR');
}

bool _sameDocumentList(dynamic before, dynamic after) {
  final old = _maps(before);
  final current = _maps(after);
  return old.length == current.length &&
      current.every((document) => old.any((other) =>
          _sameDocument(document, other) &&
          _text(document['fileStore'] ??
                  document['fileStoreId'] ??
                  document['remoteId']) ==
              _text(other['fileStore'] ??
                  other['fileStoreId'] ??
                  other['remoteId'])));
}

List<Map<String, dynamic>> _assets(dynamic saved, dynamic current) {
  final old = _maps(saved);
  return _maps(current).map((asset) {
    // Prefer an exact server ID before the type/serial fallback.
    final id = _text(asset['assetId'] ?? asset['assetID']);
    final exact = id.isEmpty
        ? null
        : old
            .where((other) => _text(other['assetId'] ?? other['assetID']) == id)
            .firstOrNull;
    final match =
        exact ?? old.where((other) => _sameAsset(asset, other)).firstOrNull;
    if (match == null) return asset;
    final result = Map<String, dynamic>.from(match);
    result['documents'] = _documents(match['documents'], asset['documents']);
    var changed = !_sameDocumentList(match['documents'], result['documents']);
    if (match['children'] is List || asset['children'] is List) {
      final children = _assets(match['children'], asset['children']);
      result['children'] = children;
      final previous = _maps(match['children']);
      changed = changed ||
          previous.length != children.length ||
          children.any((child) {
            final original =
                previous.where((other) => _sameAsset(child, other)).firstOrNull;
            return original == null || _assetMediaChanged(original, child);
          });
    }
    if (changed) result['submitted'] = false;
    return result;
  }).toList();
}

bool _assetMediaChanged(
    Map<String, dynamic> before, Map<String, dynamic> after) {
  if (!_sameDocumentList(before['documents'], after['documents'])) return true;
  final old = _maps(before['children']);
  final current = _maps(after['children']);
  if (old.length != current.length) return true;
  return current.any((child) {
    final match = old.where((other) => _sameAsset(child, other)).firstOrNull;
    return match == null || _assetMediaChanged(match, child);
  });
}
