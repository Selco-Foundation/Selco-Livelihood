/// Parses the leading integer year count out of an MDMS warranty-duration
/// string (e.g. `"2 Years"` -> `2`). Shared by the warranty-duration dropdown
/// label (`lib/pages/asset_flow_pages.dart`, mirroring E4H's
/// `parseWarrantyYears`) and the submission payload's warranty-start-date
/// gating (`lib/utils/submission_payload.dart`).
int parseWarrantyYears(String value) {
  final match = RegExp(r'\d+').firstMatch(value);
  return match == null ? 0 : int.parse(match.group(0)!);
}
