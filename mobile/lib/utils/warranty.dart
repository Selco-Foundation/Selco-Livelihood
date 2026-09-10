/// Parses the leading integer year count out of an MDMS warranty-duration
/// string (e.g. `"2 Years"` -> `2`). Shared by the warranty-duration dropdown
/// label (`lib/pages/asset_flow_pages.dart`, mirroring E4H's
/// `parseWarrantyYears`) and the submission payload's warranty-start-date
/// gating (`lib/utils/submission_payload.dart`).
int parseWarrantyYears(String value) {
  final match = RegExp(r'\d+').firstMatch(value);
  return match == null ? 0 : int.parse(match.group(0)!);
}

/// The warranty start date is never user-entered — it's effectively "now",
/// same as E4H (whose asset-summary page falls back to a live-formatted
/// `DateTime.now()` wherever no stored value exists, via `buildWarrantyStart`
/// in its `utils.dart`). Computed fresh on every call rather than stored on
/// the draft. Format matches `FacilityReportPresentation.reportDate`
/// (`lib/model/facility_report.dart`) for consistency with other dates shown
/// in this app.
String warrantyStartDateDisplay() {
  final now = DateTime.now();
  final day = now.day.toString().padLeft(2, '0');
  final month = now.month.toString().padLeft(2, '0');
  final year = (now.year % 100).toString().padLeft(2, '0');
  return '$day/$month/$year';
}
