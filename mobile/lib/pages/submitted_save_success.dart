import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/panel_cards.dart';
import 'package:flutter/material.dart';

import '../app/app_strings.dart';
import 'home_page.dart';

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
              title: AppStrings.submittedSuccessfully,
              description: AppStrings.submittedDescription,
              actions: [
                DigitButton(
                  label: AppStrings.home,
                  type: DigitButtonType.primary,
                  size: DigitButtonSize.large,
                  onPressed: () => Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute<void>(builder: (_) => const HomePage()),
                    (_) => false,
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
