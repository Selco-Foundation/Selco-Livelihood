import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';

import '../app/app_strings.dart';
import '../models/facility_report_sample.dart';
import '../widgets/facility_report_card.dart';
import '../widgets/facility_search_sort_card.dart';
import '../widgets/livelihood_app_bar.dart';
import '../widgets/report_navigation_header.dart';

class NewReportFacilitiesPage extends StatelessWidget {
  const NewReportFacilitiesPage({super.key});

  @override
  Widget build(BuildContext context) => const _FacilityListPage(
        title: AppStrings.newReport,
        mode: FacilityReportMode.newReport,
        showSearch: true,
      );
}

class PendingApprovalPage extends StatelessWidget {
  const PendingApprovalPage({super.key});

  @override
  Widget build(BuildContext context) => const _FacilityListPage(
        title: AppStrings.pendingApproval,
        mode: FacilityReportMode.pendingApproval,
        showSearch: false,
      );
}

class ResubmissionNeededPage extends StatelessWidget {
  const ResubmissionNeededPage({super.key});

  @override
  Widget build(BuildContext context) => const _FacilityListPage(
        title: AppStrings.resubmissionNeededSingleLine,
        mode: FacilityReportMode.resubmissionNeeded,
        showSearch: true,
      );
}

class ApprovedReportsPage extends StatelessWidget {
  const ApprovedReportsPage({super.key});

  @override
  Widget build(BuildContext context) => const _FacilityListPage(
        title: AppStrings.approved,
        mode: FacilityReportMode.approved,
        showSearch: true,
      );
}

class _FacilityListPage extends StatelessWidget {
  const _FacilityListPage({
    required this.title,
    required this.mode,
    required this.showSearch,
  });

  final String title;
  final FacilityReportMode mode;
  final bool showSearch;

  void _showPlaceholder(BuildContext context) {
    FocusManager.instance.primaryFocus?.unfocus();
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(content: Text(AppStrings.reportActionNotConnected)),
      );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    return Scaffold(
      appBar: LivelihoodAppBar(
        showMenu: true,
        onMenuPressed: () => _showPlaceholder(context),
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: spacer2),
        child: ScrollableContent(
          key: ValueKey('facility-list-${mode.name}'),
          backgroundColor: theme.colorTheme.generic.background,
          header: ReportNavigationHeader(
            onBackPressed: () => Navigator.of(context).maybePop(),
          ),
          footer: const PoweredByDigit(version: ''),
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: spacer2,
                vertical: spacer4,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: textTheme.headingXl.copyWith(
                      color: theme.colorTheme.primary.primary2,
                    ),
                  ),
                  const SizedBox(height: spacer4),
                  if (showSearch) ...[
                    FacilitySearchSortCard(
                      onUiAction: () => _showPlaceholder(context),
                    ),
                    const SizedBox(height: spacer4),
                  ],
                  for (final sample in facilityReportSamples) ...[
                    FacilityReportCard(
                      sample: sample,
                      mode: mode,
                      onAction: () => _showPlaceholder(context),
                    ),
                    const SizedBox(height: spacer5),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
