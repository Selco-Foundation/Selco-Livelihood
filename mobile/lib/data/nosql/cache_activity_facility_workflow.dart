import 'package:isar/isar.dart';

part 'cache_activity_facility_workflow.g.dart';

/// Persisted, accumulating cache of `activity/v1/activities/_search` results,
/// segmented by workflow status. `isar_generator` can't analyze a `@freezed`
/// class the way it analyzes a plain mutable class, so rather than embedding
/// `ActivityFacilityWorkflow` directly (as the reference app does with its
/// dart_mappable model), this stores an indexed pair of ids plus a
/// full-fidelity JSON blob, reconstructed on read via
/// `ActivityFacilityWorkflow.fromJson(jsonDecode(rawJson))`.
///
/// `createdAt`/`updatedAt` are audit-only — no TTL/staleness logic reads
/// them; this cache is meant to accumulate everything ever fetched, not
/// expire it.
@Collection()
class CacheActivityFacilityWorkflow {
  Id id = Isar.autoIncrement;

  @Index()
  late String activityFacilityId;

  @Index()
  late String status;

  late String rawJson;

  DateTime? sortKey;

  DateTime createdAt = DateTime.now();

  DateTime? updatedAt;
}
