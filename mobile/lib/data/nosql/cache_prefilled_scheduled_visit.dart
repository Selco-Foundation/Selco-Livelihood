import 'package:isar/isar.dart';

part 'cache_prefilled_scheduled_visit.g.dart';

/// Visits whose report was submitted from this device and now await the
/// completion code (OTP). Ported from E4H.
@Collection()
class CachePrefilledScheduledVisit {
  Id id = Isar.autoIncrement;

  @Index(
      composite: [CompositeIndex('userType')],
      unique: true,
      caseSensitive: true)
  late String scheduledVisitId;

  late String userType;

  DateTime createdAt = DateTime.now();
  DateTime? updatedAt;

  CachePrefilledScheduledVisit({
    required this.scheduledVisitId,
    required this.userType,
  });
}
