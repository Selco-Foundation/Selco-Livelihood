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

  double get installationProgress =>
      activityFacility.completedAt != null ? 1 : 0;

  FacilityAssetCategory get resolvedAssetCategory =>
      activityFacility.additionalDetails?.componentType?.trim().toUpperCase() ==
              'MACHINE'
          ? FacilityAssetCategory.machine
          : FacilityAssetCategory.solar;
}
