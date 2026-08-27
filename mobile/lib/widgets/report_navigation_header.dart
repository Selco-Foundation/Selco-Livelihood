import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/ComponentTheme/button_theme.dart';
import 'package:flutter/material.dart';

import '../app/app_strings.dart';

class ReportNavigationHeader extends StatelessWidget {
  const ReportNavigationHeader({
    super.key,
    required this.onBackPressed,
    this.showHelp = false,
    this.onHelpPressed,
  }) : assert(!showHelp || onHelpPressed != null);

  final VoidCallback onBackPressed;
  final bool showHelp;
  final VoidCallback? onHelpPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      key: const ValueKey('report-navigation-header'),
      padding: const EdgeInsets.fromLTRB(spacer2, spacer2, spacer2, 0),
      child: Row(
        children: [
          Expanded(
            child: Row(
              children: [
                DigitButton(
                  key: const ValueKey('report-back-button'),
                  prefixIcon: Icons.arrow_left,
                  textColor: const DigitColors().light.textPrimary,
                  iconColor: const DigitColors().light.textPrimary,
                  label: AppStrings.back,
                  type: DigitButtonType.tertiary,
                  size: DigitButtonSize.medium,
                  onPressed: onBackPressed,
                  digitButtonThemeData: const DigitButtonThemeData().copyWith(
                    smallIconSize: spacer6,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(width: showHelp ? spacer4 : 0),
          if (showHelp)
            DigitButton(
              key: const ValueKey('report-help-button'),
              textColor: const DigitColors().light.primary1,
              iconColor: const DigitColors().light.primary1,
              label: AppStrings.help,
              type: DigitButtonType.tertiary,
              size: DigitButtonSize.medium,
              suffixIcon: Icons.help_outline_outlined,
              onPressed: onHelpPressed!,
            ),
        ],
      ),
    );
  }
}
