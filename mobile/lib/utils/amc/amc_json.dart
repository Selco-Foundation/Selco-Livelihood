// JSON helpers ported from E4H `lib/utils/utils.dart`, kept free of UI
// imports so Isar collections and the background isolate can use them.

dynamic jsonSafe(dynamic v) {
  if (v is DateTime) return v.toUtc().toIso8601String();
  if (v is Map) {
    return v.map((k, val) => MapEntry(k.toString(), jsonSafe(val)));
  }
  if (v is List) return v.map(jsonSafe).toList();
  return v;
}

Map<String, dynamic> deepMerge(
  Map<String, dynamic> base,
  Map<String, dynamic> update,
) {
  final result = Map<String, dynamic>.from(base);
  update.forEach((k, v) {
    if (v is Map && result[k] is Map) {
      result[k] = deepMerge(
        Map<String, dynamic>.from(result[k] as Map),
        Map<String, dynamic>.from(v),
      );
    } else {
      result[k] = v;
    }
  });
  return result;
}
