import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../model/facility_report_sample.dart';
import '../model/solar_installation_draft.dart';
import '../router/app_router.dart';
import '../widgets/facility_report_card.dart';
import '../widgets/facility_search_sort_card.dart';
import '../widgets/livelihood_app_bar.dart';
import '../widgets/report_navigation_header.dart';

@RoutePage()
class NewReportFacilitiesPage extends StatelessWidget {
  const NewReportFacilitiesPage({super.key});

  @override
  Widget build(BuildContext context) => _FacilityListPage(
        title: context.translate(i18.installationReportHome.newReport),
        mode: FacilityReportMode.newReport,
        showSearch: true,
      );
}

@RoutePage()
class PendingApprovalPage extends StatelessWidget {
  const PendingApprovalPage({super.key});

  @override
  Widget build(BuildContext context) => _FacilityListPage(
        title: context.translate(i18.home.pendingApproval),
        mode: FacilityReportMode.pendingApproval,
        showSearch: false,
      );
}

@RoutePage()
class ResubmissionNeededPage extends StatelessWidget {
  const ResubmissionNeededPage({super.key});

  @override
  Widget build(BuildContext context) => _FacilityListPage(
        title: context.translate(i18.installationReportHome.resubmissionNeededSingleLine),
        mode: FacilityReportMode.resubmissionNeeded,
        showSearch: true,
      );
}

@RoutePage()
class ApprovedReportsPage extends StatelessWidget {
  const ApprovedReportsPage({super.key});

  @override
  Widget build(BuildContext context) => _FacilityListPage(
        title: context.translate(i18.home.approved),
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
        SnackBar(content: Text(context.translate(i18.installationReportHome.reportActionNotConnected))),
      );
  }

  void _handleFacilityAction(
    BuildContext context,
    FacilityReportSample sample,
  ) {
    if (mode == FacilityReportMode.newReport &&
        sample.assetCategory == FacilityAssetCategory.machine) {
      context.router.push(MachineFormRoute(sample: sample));
      return;
    }
    if (sample.assetCategory == FacilityAssetCategory.solar) {
      if (mode == FacilityReportMode.newReport) {
        context.router.push(
          OverallAssetSummaryRoute(
            draft: SolarInstallationDraft(
              facility: sample,
              mode: SolarWorkflowMode.newReport,
            ),
          ),
        );
        return;
      }
      final solarMode = switch (mode) {
        FacilityReportMode.pendingApproval => SolarWorkflowMode.pending,
        FacilityReportMode.resubmissionNeeded => SolarWorkflowMode.resubmission,
        FacilityReportMode.approved => SolarWorkflowMode.approved,
        FacilityReportMode.newReport => SolarWorkflowMode.newReport,
      };
      context.router.push(
        OverallAssetSummaryRoute(
          draft: SolarInstallationDraft.prefilled(
            facility: sample,
            mode: solarMode,
          ),
        ),
      );
      return;
    }
    _showPlaceholder(context);
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
            onBackPressed: () => context.router.maybePop(),
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
                      onAction: () => _handleFacilityAction(context, sample),
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
