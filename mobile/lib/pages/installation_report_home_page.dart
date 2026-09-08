import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../blocs/activity_facility_counts/activity_facility_counts.dart';
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
    // Idempotent past the first call (see ActivityFacilityCountsBloc) — if
    // HomePage already triggered this fetch, this is a no-op and both
    // screens read the same 4 numbers.
    context
        .read<ActivityFacilityCountsBloc>()
        .add(const ActivityFacilityCountsEvent.fetch());
    final counts = context.watch<ActivityFacilityCountsBloc>().state;

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
                    count: counts.maybeWhen(
                      loaded: (assigned, _, __, ___) => '$assigned',
                      orElse: () => '—',
                    ),
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
                    count: counts.maybeWhen(
                      loaded: (_, pendingApproval, __, ___) =>
                          '$pendingApproval',
                      orElse: () => '—',
                    ),
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
                    count: counts.maybeWhen(
                      loaded: (_, __, resubmission, ___) => '$resubmission',
                      orElse: () => '—',
                    ),
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
                    count: counts.maybeWhen(
                      loaded: (_, __, ___, approved) => '$approved',
                      orElse: () => '—',
                    ),
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
