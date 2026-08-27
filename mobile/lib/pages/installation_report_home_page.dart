import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';

import '../app/app_strings.dart';
import '../widgets/installation_report_menu_card.dart';
import '../widgets/livelihood_app_bar.dart';
import '../widgets/report_navigation_header.dart';
import 'installation_report_list_pages.dart';

class InstallationReportHomePage extends StatelessWidget {
  const InstallationReportHomePage({super.key});

  void _showPlaceholder(BuildContext context) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(content: Text(AppStrings.reportActionNotConnected)),
      );
  }

  void _open(BuildContext context, Widget page) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => page),
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
          key: const ValueKey('installation-report-home-scroll'),
          backgroundColor: theme.colorTheme.generic.background,
          header: ReportNavigationHeader(
            showHelp: true,
            onBackPressed: () => Navigator.of(context).maybePop(),
            onHelpPressed: () => _showPlaceholder(context),
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
                    AppStrings.installationReportHome,
                    style: textTheme.headingXl.copyWith(
                      color: theme.colorTheme.primary.primary2,
                    ),
                  ),
                  const SizedBox(height: spacer4),
                  InstallationReportMenuCard(
                    key: const ValueKey('new-report-menu-card'),
                    icon: Icons.add_box_outlined,
                    heading: AppStrings.newReport,
                    description: AppStrings.newReportDescription,
                    count: '48',
                    color: theme.colorTheme.primary.primary1,
                    onPressed: () => _open(
                      context,
                      const NewReportFacilitiesPage(),
                    ),
                  ),
                  InstallationReportMenuCard(
                    key: const ValueKey('pending-approval-menu-card'),
                    icon: Icons.assignment_late_outlined,
                    heading: AppStrings.pendingApproval,
                    description: AppStrings.pendingApprovalDescription,
                    count: '12',
                    color: const Color(0xFF505A6B),
                    onPressed: () => _open(
                      context,
                      const PendingApprovalPage(),
                    ),
                  ),
                  InstallationReportMenuCard(
                    key: const ValueKey('resubmission-menu-card'),
                    icon: Icons.assignment_return_outlined,
                    heading: AppStrings.resubmissionNeededSingleLine,
                    description: AppStrings.resubmissionDescription,
                    count: '6',
                    color: theme.colorTheme.alert.error,
                    accentColor: theme.colorTheme.alert.error,
                    onPressed: () => _open(
                      context,
                      const ResubmissionNeededPage(),
                    ),
                  ),
                  InstallationReportMenuCard(
                    key: const ValueKey('approved-menu-card'),
                    icon: Icons.check_box_outlined,
                    heading: AppStrings.approved,
                    description: AppStrings.approvedDescription,
                    count: '35',
                    color: theme.colorTheme.alert.success,
                    onPressed: () => _open(
                      context,
                      const ApprovedReportsPage(),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
