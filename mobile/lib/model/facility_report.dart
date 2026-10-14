import 'installation_progress.dart';
import 'solar_installation_draft.dart';
import '../repositories/installation_cache_repo.dart';
import '../repositories/asset_mdms_repository.dart';
import '../repositories/asset_progress_repo.dart';
import '../utils/boundary_code.dart';
import 'activity_facility_workflow/activity_facility_workflow.dart';

enum FacilityReportMode {
  newReport,
  pendingApproval,
  resubmissionNeeded,
  approved,
}

enum FacilityAssetCategory { solar, machine }

/// Presentation values derived directly from the complete activity-facility
/// response. The workflow remains the source of truth throughout navigation.
extension FacilityReportPresentation on ActivityFacilityWorkflow {
  String get facilityTitle =>
      activityFacility.facility?.facilityName?.trim() ?? '';

  String get activityFacilityCacheKey =>
      activityFacility.id ??
      activityFacility.facilityId ??
      activityFacility.activityId ??
      '';

  String reportDateFor(
    FacilityReportMode mode, {
    DateTime? fallback,
  }) {
    final epochMillis = mode == FacilityReportMode.newReport
        ? activityFacility.scheduledAt
        : workflow?.auditDetails?.lastModifiedTime;
    final date = epochMillis != null && epochMillis > 0
        ? DateTime.fromMillisecondsSinceEpoch(epochMillis)
        : fallback ?? DateTime.now();
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = (date.year % 100).toString().padLeft(2, '0');
    return '$day/$month/$year';
  }

  BoundaryLocality get facilityLocality =>
      BoundaryLocality.parse(activityFacility.facility?.boundaryCode);

  /// Fraction of the asset-filling flow completed so far, computed from
  /// local cache fill-state (see `AssetProgressRepository`) rather than any
  /// backend flag — matches E4H's `_fractionForProject`. A facility nobody
  /// has started filling in yet is genuinely `0.0`.
  Future<double> installationProgress() {
    final id = activityFacility.id;
    if (id == null) return Future.value(0.0);
    return assetProgressRepository.fractionFor(id);
  }

  Future<InstallationProgress> installationState() async {
    if (resolvedAssetCategory == FacilityAssetCategory.solar) {
      final fraction = await installationProgress();
      return InstallationProgress(
          hasStarted: fraction > 0,
          fraction: fraction,
          canSubmit: fraction >= 1);
    }
    dynamic raw;
    try {
      raw = await installationCacheRepository
          .getJson('machine-draft', activityFacilityCacheKey)
          .timeout(const Duration(seconds: 2));
    } catch (_) {
      return const InstallationProgress(
          hasStarted: false, fraction: 0, canSubmit: false);
    }
    final values = raw is Map ? Map<String, dynamic>.from(raw) : null;
    try {
      await assetMdmsRepository.load().timeout(const Duration(seconds: 2));
    } catch (_) {
      return InstallationProgress(
          hasStarted: values != null, fraction: 0, canSubmit: false);
    }
    final rawMedia = values?['media'];
    final media = <String, List<SolarFileRef>>{};
    if (rawMedia is Map) {
      for (final entry in rawMedia.entries) {
        if (entry.value is List) {
          media[entry.key.toString()] = (entry.value as List)
              .whereType<Map>()
              .map((item) =>
                  SolarFileRef.fromJson(Map<String, dynamic>.from(item)))
              .toList();
        }
      }
    }
    return machineInstallationProgress(
        schema: assetMdmsRepository.machineFormSchema,
        values: values,
        media: media);
  }

  FacilityAssetCategory get resolvedAssetCategory =>
      (activityFacility.componentType ??
                      activityFacility.additionalDetails?.componentType)
                  ?.trim()
                  .toUpperCase() ==
              'MACHINE'
          ? FacilityAssetCategory.machine
          : FacilityAssetCategory.solar;
}
