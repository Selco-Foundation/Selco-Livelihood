import 'package:isar/isar.dart';

part 'cache_amc_failed_scheduled_visit.g.dart';

/// Visits whose background submission failed; disables "Submit for
/// approval" on the visit card. Ported from E4H.
@Collection()
class CacheAmcFailedScheduledVisit {
  Id id = Isar.autoIncrement;

  @Index(unique: true, replace: false)
  late String scheduledVisitId;

  CacheAmcFailedScheduledVisit({
    required this.scheduledVisitId,
  });
}
