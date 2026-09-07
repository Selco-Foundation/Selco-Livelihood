import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/panel_cards.dart';
import 'package:flutter/material.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../router/app_router.dart';

enum MachineReportSuccessMode { draft, submitted }

@RoutePage()
class MachineReportSuccessPage extends StatelessWidget {
  const MachineReportSuccessPage({
    super.key,
    required this.mode,
  });

  final MachineReportSuccessMode mode;

  void _goHome(BuildContext context) {
    context.router.root.replaceAll(
      const [
        AuthenticatedRouteWrapper(children: [HomeRoute()])
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDraft = mode == MachineReportSuccessMode.draft;

    return Scaffold(
      body: ScrollableContent(
        key: ValueKey('machine-success-${mode.name}'),
        backgroundColor: theme.colorTheme.generic.background,
        footer: const Padding(
          key: ValueKey('machine-success-footer'),
          padding: EdgeInsets.only(bottom: spacer2),
          child: PoweredByDigit(version: ''),
        ),
        children: [
          Padding(
            key: const ValueKey('machine-success-panel-padding'),
            padding: const EdgeInsets.all(spacer2),
            child: PanelCard(
              animate: true,
              repeat: true,
              type: PanelType.success,
              title: isDraft
                  ? context.translate(i18.machineForm.dataSavedSuccessfully)
                  : context.translate(i18.machineForm.submittedSuccessfully),
              description: isDraft
                  ? context.translate(i18.machineForm.dataSavedDescription)
                  : context.translate(i18.machineForm.submittedDescription),
              actions: [
                DigitButton(
                  key: const ValueKey('machine-success-home-button'),
                  label: context.translate(i18.common.home),
                  onPressed: () => _goHome(context),
                  type: DigitButtonType.primary,
                  size: DigitButtonSize.large,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
