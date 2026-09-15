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

  String get reportDate {
    final epochMillis = workflow?.auditDetails?.lastModifiedTime ??
        activityFacility.completedAt ??
        activityFacility.activatedAt ??
        activityFacility.scheduledAt;
    if (epochMillis == null) return '';
    final date = DateTime.fromMillisecondsSinceEpoch(epochMillis);
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
    final bomData = <String, dynamic>{
      ...?activityFacility.additionalDetails?.bom,
      ...?activityFacility.billOfMaterial?.data,
    };
    final disabledTypes = <String>{
      if (!_hasPositiveWholeQuantity(bomData['bom_battery_quantity']))
        'battery',
      if (!_hasPositiveWholeQuantity(bomData['bom_inverter_pcu_quantity']))
        'inverter',
      if (!_hasPositiveWholeQuantity(bomData['bom_solar_panel_quantity']))
        'panel',
    };
    return assetProgressRepository.fractionFor(
      id,
      disabledTypes: disabledTypes,
    );
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

bool _hasPositiveWholeQuantity(dynamic value) {
  final parsed = value is num
      ? value.toDouble()
      : double.tryParse(value?.toString().trim() ?? '');
  return parsed != null && parsed > 0 && parsed == parsed.truncateToDouble();
}
