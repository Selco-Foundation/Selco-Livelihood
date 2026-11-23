import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';

class LoginRememberMeCheckbox extends StatelessWidget {
  const LoginRememberMeCheckbox({
    super.key,
    required this.value,
    required this.label,
    required this.onChanged,
  });

  final bool value;
  final String label;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      checked: value,
      enabled: onChanged != null,
      label: label,
      child: InkWell(
        key: const ValueKey('remember-me-checkbox'),
        onTap: onChanged == null ? null : () => onChanged!(!value),
        child: ExcludeSemantics(
          child: Row(
            children: [
              DigitCheckboxIcon(
                state: value
                    ? DigitCheckboxState.checked
                    : DigitCheckboxState.unchecked,
              ),
              const SizedBox(width: spacer2),
              Expanded(
                child: Text(label,
                    style: theme.digitTextTheme(context).bodyL.copyWith(
                          color: theme.colorTheme.text.primary,
                        )),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
