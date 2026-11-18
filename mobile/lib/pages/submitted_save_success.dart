import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/panel_cards.dart';
import 'package:flutter/material.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../router/app_router.dart';

@RoutePage()
class SubmittedSaveSuccessPage extends StatelessWidget {
  const SubmittedSaveSuccessPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: ScrollableContent(
        key: const ValueKey('submitted-save-success'),
        backgroundColor: theme.colorTheme.generic.background,
        footer: const Padding(
          padding: EdgeInsets.only(bottom: spacer2),
          child: PoweredByDigit(version: ''),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(spacer2),
            child: PanelCard(
              animate: true,
              repeat: true,
              type: PanelType.success,
              title: context.translate(i18.machineForm.submittedSuccessfully),
              description:
                  context.translate(i18.machineForm.submittedDescription),
              actions: [
                DigitButton(
                  key: const ValueKey('solar-success-new-reports-button'),
                  label: context
                      .translate(i18.installationReport.backToNewReports),
                  type: DigitButtonType.primary,
                  size: DigitButtonSize.large,
                  onPressed: () => context.router.root.replaceAll(
                    const [
                      AuthenticatedRouteWrapper(children: [
                        HomeRoute(),
                        InstallationReportHomeRoute(),
                        NewReportFacilitiesRoute(),
                      ])
                    ],
                  ),
                ),
                DigitButton(
                  key: const ValueKey('solar-success-home-button'),
                  label: context.translate(i18.common.home),
                  type: DigitButtonType.secondary,
                  size: DigitButtonSize.large,
                  onPressed: () => context.router.root.replaceAll(
                    const [
                      AuthenticatedRouteWrapper(children: [HomeRoute()])
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
