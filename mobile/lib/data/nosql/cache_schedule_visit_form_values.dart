import 'package:isar/isar.dart';

part 'cache_schedule_visit_form_values.g.dart';

/// Flat `{fieldName: value}` AMC answers per visit, sent as
/// `visitReport.responses`. Ported from E4H.
@collection
class CacheScheduleVisitFormValues {
  Id id = Isar.autoIncrement;

  @Index(caseSensitive: false)
  late String scheduledVisitId;

  @Index(caseSensitive: false)
  late String userType;

  @Index(unique: true, replace: true, caseSensitive: false)
  late String entryKey; // "$scheduledVisitId::$userType"

  late String dataJson;

  DateTime createdAt = DateTime.now();
  DateTime? updatedAt;
}
