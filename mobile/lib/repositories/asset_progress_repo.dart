import 'package:isar/isar.dart';

import '../data/nosql/cache_asset_count.dart';
import '../utils/constants.dart';

/// Ports E4H's `select_health_facility.dart` `_fractionForProject`: for each
/// of the 3 solar asset types, `progress` is the highest wizard step reached
/// in the asset-filling flow (`lib/pages/asset_flow_pages.dart`), written to
/// a dedicated Isar row per (activityFacilityId, assetType). The report-list
/// progress bar (`lib/widgets/facility_report_card.dart`) reads the averaged
/// fraction across all three types — genuinely computed from local fill
/// state, not a backend flag.
class AssetProgressRepository {
  static const maxStepsPerType = 5;
  static const types = ['battery', 'inverter', 'panel'];

  /// Capped like other repositories' Isar access so an unavailable/slow
  /// Isar instance degrades quickly rather than hanging the caller.
  Future<Isar> get _isar =>
      Constants().isar.timeout(const Duration(seconds: 2));

  /// Records the given step as reached for [assetType], never regressing a
  /// higher step already recorded (matches E4H's "highest step reached").
  Future<void> recordStep({
    required String activityFacilityId,
    required String assetType,
    required int step,
  }) async {
    try {
      final isar = await _isar;
      await isar.writeTxn(() async {
        final existing = await isar.cacheAssetCounts
            .filter()
            .activityFacilityIdEqualTo(activityFacilityId)
            .and()
            .assetTypeEqualTo(assetType)
            .findFirst();
        final row = existing ?? CacheAssetCount();
        if (step <= row.progress) return;
        row
          ..activityFacilityId = activityFacilityId
          ..assetType = assetType
          ..progress = step
          ..updatedAt = DateTime.now();
        await isar.cacheAssetCounts.put(row);
      });
    } catch (_) {
      // Best-effort — a progress-tracking write failure shouldn't block
      // the asset-filling flow itself.
    }
  }

  /// Average, across the 3 solar asset types, of
  /// `min(progress, maxStepsPerType) / maxStepsPerType`, clamped 0–1. An
  /// activity facility with no rows yet is 0.0 — never defaults to "done".
  Future<double> fractionFor(String activityFacilityId) async {
    try {
      final isar = await _isar;
      final rows = await isar.cacheAssetCounts
          .filter()
          .activityFacilityIdEqualTo(activityFacilityId)
          .findAll();
      final byType = {for (final row in rows) row.assetType: row.progress};
      var sum = 0.0;
      for (final type in types) {
        final steps = (byType[type] ?? 0).clamp(0, maxStepsPerType);
        sum += steps / maxStepsPerType;
      }
      return (sum / types.length).clamp(0.0, 1.0);
    } catch (_) {
      return 0.0;
    }
  }
}

final assetProgressRepository = AssetProgressRepository();
