import 'dart:convert';

import '../../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../../model/amc/scheduled_visit.dart';

/// Reviewer's rejection reasons for a `REJECTED` AMC visit, as the
/// Installation App's [WorkflowComment]s so they render with its
/// `WorkflowRejectionReasons` panel (rectification reused as-is, PRD 5.2.8).
///
/// Read from the latest workflow step's `comment`. The
/// Livelihood reviewer's format is not confirmed yet, so all of these are
/// accepted:
///  * web reviewer: a JSON list string `[{"reason", "comment"}]`;
///  * Installation-style objects, optionally with `reasonCode`,
///    `sectionLabel`, `assetType`, or an already-encoded `commentMessage`;
///  * a list of plain strings, or a single plain-text comment.
/// Anything unreadable is shown as plain text, so a reason is never lost.
List<WorkflowComment> amcRejectionReasons(ScheduledVisit? visit) {
  if (visit == null ||
      visit.status != 'REJECTED' ||
      visit.processInstances.isEmpty) {
    return const [];
  }
  return parseAmcRejectionComment(_latestComment(visit));
}

Object? _latestComment(ScheduledVisit visit) {
  final latest = visit.processInstances.first;
  final rawJson = latest.rawJson;
  if (rawJson != null && rawJson.trim().isNotEmpty) {
    try {
      final decoded = jsonDecode(rawJson);
      if (decoded is Map && decoded['comment'] != null) {
        return decoded['comment'];
      }
    } catch (_) {}
  }
  return latest.comment;
}

/// Normalises one workflow `comment` value (see [amcRejectionReasons]).
List<WorkflowComment> parseAmcRejectionComment(Object? comment) {
  if (comment == null) return const [];
  if (comment is List) {
    return comment.map(_fromItem).whereType<WorkflowComment>().toList();
  }
  if (comment is Map) {
    final one = _fromItem(comment);
    return one == null ? const [] : [one];
  }
  final text = comment.toString().trim();
  if (text.isEmpty) return const [];
  try {
    final decoded = jsonDecode(text);
    if (decoded is List || decoded is Map) {
      return parseAmcRejectionComment(decoded);
    }
  } catch (_) {
    // Not JSON: a plain-text reason.
  }
  return [_comment({'reason': text})];
}

WorkflowComment? _fromItem(Object? item) {
  if (item == null) return null;
  if (item is! Map) {
    final text = item.toString().trim();
    return text.isEmpty ? null : _comment({'reason': text});
  }
  final map = Map<String, dynamic>.from(item);
  final assetType = map['assetType']?.toString();

  // Already in the Installation App's transaction-comment shape.
  final encoded = map['commentMessage'];
  if (encoded is String && encoded.trim().isNotEmpty) {
    return WorkflowComment(commentMessage: encoded, assetType: assetType);
  }

  String? text(String key) {
    final value = map[key]?.toString().trim();
    return value == null || value.isEmpty ? null : value;
  }

  var reason = text('reason');
  var details = text('comment');
  final reasonCode = text('reasonCode');
  // Only a free-text comment: show it as the reason itself.
  if (reason == null && reasonCode == null && details != null) {
    reason = details;
    details = null;
  }
  if (reason == null && reasonCode == null) return null;
  return _comment({
    if (reason != null) 'reason': reason,
    if (reasonCode != null) 'reasonCode': reasonCode,
    if (details != null) 'comment': details,
    if (text('sectionLabel') != null) 'sectionLabel': text('sectionLabel'),
  }, assetType: assetType);
}

WorkflowComment _comment(Map<String, dynamic> message, {String? assetType}) =>
    WorkflowComment(commentMessage: jsonEncode(message), assetType: assetType);
