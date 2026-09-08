import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../router/app_router.dart';
import '../widgets/home_help_header.dart';
import '../widgets/home_item_card.dart';
import '../widgets/mdms/mdms_loading_gate.dart';

@RoutePage()
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  void _showPlaceholder(BuildContext context) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
            content: Text(context.translate(i18.home.homeActionNotConnected))),
      );
  }

  void _openInstallationReports(BuildContext context) {
    context.router.push(const InstallationReportHomeRoute());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: MdmsLoadingGate(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: spacer2),
          child: ScrollableContent(
            key: const ValueKey('home-scroll-view'),
            backgroundColor: theme.colorTheme.generic.background,
            header: HomeHelpHeader(
              onHelpPressed: () => _showPlaceholder(context),
            ),
            footer: const Padding(
              padding: EdgeInsets.only(top: spacer4, bottom: spacer2),
              child: PoweredByDigit(version: ''),
            ),
            children: [
              Padding(
                padding: const EdgeInsets.only(
                  top: spacer2,
                  bottom: spacer2,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _HomeCardGrid(
                      children: [
                        HomeItemCard(
                          key: const ValueKey('installation-report-card'),
                          icon: Icons.text_snippet_outlined,
                          label: context.translate(i18.home.installationReport),
                          contentColor: const DigitColors().light.primary1,
                          onPressed: () => _openInstallationReports(context),
                        ),
                        HomeItemCard(
                          key: const ValueKey('sync-pending-card'),
                          icon: Icons.autorenew,
                          label: context.translate(i18.home.syncPending),
                          contentColor: const DigitColors().light.primary1,
                          onPressed: () => _showPlaceholder(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: spacer3),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: spacer2),
                      child: _SectionHeading(
                        key: const ValueKey('my-reports-heading'),
                        label: context.translate(i18.home.myReports),
                      ),
                    ),
                    const SizedBox(height: spacer2),
                    _HomeCardGrid(
                      children: [
                        HomeItemCard(
                          key: const ValueKey('assigned-report-card'),
                          count: '48',
                          label: context.translate(i18.home.assigned),
                          contentColor: const DigitColors().light.primary1,
                          onPressed: () => _showPlaceholder(context),
                        ),
                        HomeItemCard(
                          key: const ValueKey('pending-approval-report-card'),
                          count: '12',
                          label: context.translate(i18.home.pendingApproval),
                          contentColor: const DigitColors().light.primary2,
                          onPressed: () => _showPlaceholder(context),
                        ),
                        HomeItemCard(
                          key: const ValueKey('approved-report-card'),
                          count: '35',
                          label: context.translate(i18.home.approved),
                          contentColor: const DigitColors().light.alertSuccess,
                          accentColor: const DigitColors().light.alertSuccess,
                          onPressed: () => _showPlaceholder(context),
                        ),
                        HomeItemCard(
                          key: const ValueKey('resubmission-report-card'),
                          count: '6',
                          label: context.translate(i18.home.resubmissionNeeded),
                          contentColor: const DigitColors().light.alertError,
                          accentColor: const DigitColors().light.alertError,
                          labelPadding: const EdgeInsets.symmetric(
                            horizontal: spacer2,
                          ),
                          scaleLabelToFit: true,
                          onPressed: () => _showPlaceholder(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: spacer7),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: spacer2),
                      child: InfoCard(
                        key: const ValueKey('sync-warning-card'),
                        title: context.translate(i18.home.syncPendingWarning),
                        description:
                            context.translate(i18.home.pendingSyncDescription),
                        type: InfoType.warning,
                        capitalizedLetter: false,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).digitTextTheme(context);

    return Text(
      label,
      style: textTheme.headingM.copyWith(
        color: const DigitColors().light.textSecondary,
      ),
    );
  }
}

class _HomeCardGrid extends StatelessWidget {
  const _HomeCardGrid({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.sizeOf(context).width;
    final childAspectRatio = (screenWidth / 2) / (170 * (screenWidth / 375));
    final cellWidth = (screenWidth - (spacer2 * 2)) / 2;
    final cellHeight = cellWidth / childAspectRatio;
    final rows = <Widget>[];

    for (var index = 0; index < children.length; index += 2) {
      rows.add(
        SizedBox(
          height: cellHeight,
          child: Row(
            children: [
              Expanded(child: children[index]),
              Expanded(
                child: index + 1 < children.length
                    ? children[index + 1]
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
      );
      // if (index + 2 < children.length) {
      //   rows.add(const SizedBox(height: spacer1));
      // }
    }

    return Column(
      key: const ValueKey('e4h-home-card-grid'),
      children: rows,
    );
  }
}
