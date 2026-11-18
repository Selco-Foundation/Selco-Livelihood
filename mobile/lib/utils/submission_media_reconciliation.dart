import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../model/asset/asset_submission.dart';

/// Refreshes draft answers and media while preserving server checkpoints.
/// A path is not an identity: picking again can overwrite it.
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
  final bom = result['bom'];
  final latestBom = latest['bom'];
  if (bom is Map && latestBom is Map && latestBom['data'] is Map) {
    final changed = !mapEquals(bom['data'] as Map?, latestBom['data'] as Map);
    result['bom'] = {
      ...bom,
      ...latestBom,
      if (bom['remoteId'] != null) 'remoteId': bom['remoteId'],
      'submitted': changed ? false : bom['submitted'] == true,
    };
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
    final selected = _text(document['fileStore'] ??
        document['fileStoreId'] ??
        document['remoteId']);
    if (selected.isNotEmpty && selected != uploaded) return document;
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
    final result = <String, dynamic>{
      ...match,
      ...asset,
      if (match['assetId'] != null) 'assetId': match['assetId'],
      'submitted': match['submitted'] == true,
    };
    result['documents'] = _documents(match['documents'], asset['documents']);
    if (match['children'] is List || asset['children'] is List) {
      result['children'] = _assets(match['children'], asset['children']);
    }
    final changed =
        !_sameDocumentList(match['documents'], result['documents']) ||
            !assetSubmissionIsPersisted(
                AssetSubmission.fromCheckpoint(result), match);
    if (changed) result['submitted'] = false;
    return result;
  }).toList();
}
