import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';

class FooterButton extends StatelessWidget {
  const FooterButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isDisabled = false,
  });

  final String text;
  final VoidCallback onPressed;
  final bool isDisabled;

  @override
  Widget build(BuildContext context) {
    return DigitCard(
      margin: const EdgeInsets.only(top: spacer2),
      children: [
        DigitButton(
          key: const ValueKey('proceed-button'),
          suffixIcon: Icons.arrow_forward_outlined,
          mainAxisSize: MainAxisSize.max,
          label: text,
          type: DigitButtonType.primary,
          size: DigitButtonSize.large,
          isDisabled: isDisabled,
          onPressed: onPressed,
        ),
      ],
    );
  }
}
