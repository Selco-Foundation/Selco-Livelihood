import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../router/app_router.dart';
import '../widgets/installation_report_menu_card.dart';
import '../widgets/report_navigation_header.dart';

@RoutePage()
class InstallationReportHomePage extends StatelessWidget {
  const InstallationReportHomePage({super.key});

  void _showPlaceholder(BuildContext context) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
            content: Text(context.translate(
                i18.installationReportHome.reportActionNotConnected))),
      );
  }

  void _open(BuildContext context, PageRouteInfo route) =>
      context.router.push(route);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: spacer2),
        child: ScrollableContent(
          key: const ValueKey('installation-report-home-scroll'),
          backgroundColor: theme.colorTheme.generic.background,
          header: ReportNavigationHeader(
            showHelp: true,
            onBackPressed: () => context.router.maybePop(),
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
                    context.translate(
                        i18.installationReportHome.installationReportHome),
                    style: textTheme.headingXl.copyWith(
                      color: theme.colorTheme.primary.primary2,
                    ),
                  ),
                  const SizedBox(height: spacer4),
                  InstallationReportMenuCard(
                    key: const ValueKey('new-report-menu-card'),
                    icon: Icons.add_box_outlined,
                    heading:
                        context.translate(i18.installationReportHome.newReport),
                    description: context.translate(
                        i18.installationReportHome.newReportDescription),
                    count: '48',
                    color: theme.colorTheme.primary.primary1,
                    onPressed: () => _open(
                      context,
                      const NewReportFacilitiesRoute(),
                    ),
                  ),
                  InstallationReportMenuCard(
                    key: const ValueKey('pending-approval-menu-card'),
                    icon: Icons.assignment_late_outlined,
                    heading: context.translate(i18.home.pendingApproval),
                    description: context.translate(
                        i18.installationReportHome.pendingApprovalDescription),
                    count: '12',
                    color: const Color(0xFF505A6B),
                    onPressed: () => _open(
                      context,
                      const PendingApprovalRoute(),
                    ),
                  ),
                  InstallationReportMenuCard(
                    key: const ValueKey('resubmission-menu-card'),
                    icon: Icons.assignment_return_outlined,
                    heading: context.translate(i18
                        .installationReportHome.resubmissionNeededSingleLine),
                    description: context.translate(
                        i18.installationReportHome.resubmissionDescription),
                    count: '6',
                    color: theme.colorTheme.alert.error,
                    accentColor: theme.colorTheme.alert.error,
                    onPressed: () => _open(
                      context,
                      const ResubmissionNeededRoute(),
                    ),
                  ),
                  InstallationReportMenuCard(
                    key: const ValueKey('approved-menu-card'),
                    icon: Icons.check_box_outlined,
                    heading: context.translate(i18.home.approved),
                    description: context.translate(
                        i18.installationReportHome.approvedDescription),
                    count: '35',
                    color: theme.colorTheme.alert.success,
                    onPressed: () => _open(
                      context,
                      const ApprovedReportsRoute(),
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
