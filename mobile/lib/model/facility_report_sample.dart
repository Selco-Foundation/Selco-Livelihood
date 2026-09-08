import '../utils/boundary_code.dart';
import 'activity_facility_workflow/activity_facility_workflow.dart';

enum FacilityReportMode {
  newReport,
  pendingApproval,
  resubmissionNeeded,
  approved,
}

enum FacilityAssetCategory {
  solar,
  machine,
}

class FacilityReportSample {
  const FacilityReportSample({
    required this.title,
    required this.startDate,
    required this.endDate,
    required this.submissionDate,
    required this.state,
    required this.district,
    required this.block,
    required this.progress,
    required this.assetCategory,
    this.activityFacilityId,
    this.facilityId,
  });

  final String title;
  final String startDate;
  final String endDate;
  final String submissionDate;
  final String state;
  final String district;
  final String block;
  final double progress;
  final FacilityAssetCategory assetCategory;

  /// Real ids from the `_search` response, `null` for the static samples
  /// below. Used to navigate into the downstream asset-entry flow once a
  /// real facility is tapped, instead of the old fake sample identity.
  final String? activityFacilityId;
  final String? facilityId;

  /// Maps one live `_search` result onto the shape `FacilityReportCard`,
  /// `MachineFormRoute`, and `SolarInstallationDraft` already expect, so
  /// none of them need to change.
  ///
  /// The `_search` response carries no end-date/progress data for an
  /// in-progress installation, so [endDate] mirrors [startDate] and
  /// [progress] defaults to 0 until a real data source is confirmed.
  ///
  /// [assetCategory] is read from `additionalDetails.bom.assetType` (per the
  /// `bom.asset_type` column, `MACHINE` | `SOLAR`) when present — this is
  /// only populated once installation work has actually started on a
  /// facility (Pending Approval / Resubmission Needed / Approved tabs). For
  /// a New Report facility (nothing started yet), it isn't reliably present,
  /// so this defaults to [FacilityAssetCategory.solar] for that tab; correct
  /// Machine-vs-Solar routing pre-installation needs an asset-type picker
  /// step that doesn't exist yet in this app (out of scope here).
  factory FacilityReportSample.fromActivityFacility(
    ActivityFacilityWorkflow workflow,
  ) {
    final activityFacility = workflow.activityFacility;
    final locality =
        BoundaryLocality.parse(activityFacility.facility?.boundaryCode);
    final dateMillis = workflow.workflow?.auditDetails?.lastModifiedTime ??
        activityFacility.scheduledAt;
    final formattedDate = _formatDate(dateMillis);
    final bom = activityFacility.additionalDetails?.bom;
    final assetTypeRaw =
        (bom?['assetType'] ?? bom?['asset_type'])?.toString().toUpperCase();

    return FacilityReportSample(
      title: activityFacility.facility?.facilityName ?? '',
      startDate: formattedDate,
      endDate: formattedDate,
      submissionDate: formattedDate,
      state: locality.state,
      district: locality.district,
      block: locality.block,
      progress: 0,
      assetCategory: assetTypeRaw == 'MACHINE'
          ? FacilityAssetCategory.machine
          : FacilityAssetCategory.solar,
      activityFacilityId: activityFacility.id,
      facilityId: activityFacility.facilityId,
    );
  }

  static String _formatDate(int? epochMillis) {
    if (epochMillis == null) return '';
    final date = DateTime.fromMillisecondsSinceEpoch(epochMillis);
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = (date.year % 100).toString().padLeft(2, '0');
    return '$day/$month/$year';
  }
}

const facilityReportSamples = <FacilityReportSample>[
  FacilityReportSample(
    title: 'Rajesh Kumar - Solar',
    startDate: '23/02/26',
    endDate: '25/02/26',
    submissionDate: '25/02/26',
    state: 'Meghalaya',
    district: 'WestKhasiHills',
    block: 'Mawthadraishan',
    progress: 0,
    assetCategory: FacilityAssetCategory.solar,
  ),
  FacilityReportSample(
    title: 'Sunita Sharma - Sewing Machine',
    startDate: '12/02/26',
    endDate: '14/02/26',
    submissionDate: '14/02/26',
    state: 'Meghalaya',
    district: 'WestKhasiHills',
    block: 'Mawthadraishan',
    progress: .45,
    assetCategory: FacilityAssetCategory.machine,
  ),
];
