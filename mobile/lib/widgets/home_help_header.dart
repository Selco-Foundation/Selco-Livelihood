import 'package:digit_ui_components/digit_components.dart';
import 'package:flutter/material.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;

class HomeHelpHeader extends StatelessWidget {
  const HomeHelpHeader({
    super.key,
    required this.onHelpPressed,
  });

  final VoidCallback onHelpPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      key: const ValueKey('home-help-header-padding'),
      padding: const EdgeInsets.fromLTRB(spacer2, spacer2, spacer2, 0),
      child: Row(
        children: [
          const Expanded(child: Row(children: [])),
          const SizedBox(width: spacer4),
          DigitButton(
            key: const ValueKey('home-help-button'),
            textColor: const DigitColors().light.primary1,
            iconColor: const DigitColors().light.primary1,
            label: context.translate(i18.home.help),
            type: DigitButtonType.tertiary,
            size: DigitButtonSize.medium,
            suffixIcon: Icons.help_outline_outlined,
            onPressed: onHelpPressed,
          ),
        ],
      ),
    );
  }
}
