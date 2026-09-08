import '../model/facility_report_sample.dart';

/// `FACILITY_INSTALLATION` business service states this app's single
/// Field Staff role (`INSTALLATION_REPORT_PART_A_EDITOR`) can see, per the
/// live `egov-workflow-v2` business service registration.
abstract final class FacilityInstallationStatus {
  static const scheduled = 'SCHEDULED';
  static const assignedToFieldStaff = 'ASSIGNED_TO_FIELD_STAFF';
  static const submittedByFieldStaff = 'SUBMITTED_BY_FIELD_STAFF';
  static const approvedByQcSpoc = 'APPROVED_BY_QC_SPOC';
  static const rejectedByQcSpoc = 'REJECTED_BY_QC_SPOC';
}

const String defaultSortDirection = 'DESC';
const int minFacilitySearchQueryLength = 3;

/// Single source of truth mapping each report-list tab to the workflow
/// status it filters `activity/v1/activities/_search` by. Both
/// [ActivityFacilityBloc] (per-tab list/search/sort/pagination) and
/// [ActivityFacilityCountsBloc] (shared badge counts) read from this so the
/// two can never drift out of sync with each other.
extension FacilityReportModeStatuses on FacilityReportMode {
  List<String> get workflowStatuses => switch (this) {
        FacilityReportMode.newReport => [
            FacilityInstallationStatus.assignedToFieldStaff,
          ],
        FacilityReportMode.pendingApproval => [
            FacilityInstallationStatus.submittedByFieldStaff,
          ],
        FacilityReportMode.resubmissionNeeded => [
            FacilityInstallationStatus.rejectedByQcSpoc,
          ],
        FacilityReportMode.approved => [
            FacilityInstallationStatus.approvedByQcSpoc,
          ],
      };
}
