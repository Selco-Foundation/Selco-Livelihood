import 'package:isar/isar.dart';

part 'cache_asset_count.g.dart';

/// One row per (activityFacilityId, assetType) — mirrors E4H's
/// `CacheAssetCount`. `progress` is the highest wizard step reached for that
/// type in the asset-filling flow (`lib/pages/asset_flow_pages.dart`), used
/// to compute the "N% complete" progress bar shown on report-list cards
/// (`lib/widgets/facility_report_card.dart`) — see
/// `lib/repositories/asset_progress_repo.dart`.
@Collection()
class CacheAssetCount {
  Id id = Isar.autoIncrement;

  @Index()
  late String activityFacilityId;

  late String assetType;

  int progress = 0;

  DateTime updatedAt = DateTime.now();
}
