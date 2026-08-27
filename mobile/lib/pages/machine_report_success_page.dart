import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/panel_cards.dart';
import 'package:flutter/material.dart';

import '../app/app_strings.dart';
import 'home_page.dart';

enum MachineReportSuccessMode { draft, submitted }

class MachineReportSuccessPage extends StatelessWidget {
  const MachineReportSuccessPage({
    super.key,
    required this.mode,
  });

  final MachineReportSuccessMode mode;

  void _goHome(BuildContext context) {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const HomePage()),
      (_) => false,
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
                  ? AppStrings.dataSavedSuccessfully
                  : AppStrings.submittedSuccessfully,
              description: isDraft
                  ? AppStrings.dataSavedDescription
                  : AppStrings.submittedDescription,
              actions: [
                DigitButton(
                  key: const ValueKey('machine-success-home-button'),
                  label: AppStrings.home,
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
