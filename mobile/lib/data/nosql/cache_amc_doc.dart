import 'dart:convert';

import 'package:isar/isar.dart';

import '../../utils/amc/amc_json.dart';

part 'cache_amc_doc.g.dart';

/// AMC report form (raw MDMS doc with the entered values) saved per visit.
/// Ported from E4H `data/nosql/cache_amc_doc.dart`; its presence turns the
/// visit card's action into "Resume report".
@collection
class CacheAmcDoc {
  Id id = Isar.autoIncrement;

  @Index(
      composite: [CompositeIndex('schemaKey')],
      unique: true,
      caseSensitive: false)
  late String scheduleVisitId;
  late String schemaKey;
  late String dataJson;
  late String tenantId;
  String? facilityId;
  String? assignUserUuid;
  String? formName;
  @Index()
  late DateTime updatedAt;

  @Index()
  bool isDirty = true;

  @ignore
  Map<String, dynamic> get dataMap =>
      jsonDecode(dataJson) as Map<String, dynamic>;

  // ignore: invalid_annotation_target
  @ignore
  set dataMap(Map<String, dynamic> v) => dataJson = jsonEncode(jsonSafe(v));
}
