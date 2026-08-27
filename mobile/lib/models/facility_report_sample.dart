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
