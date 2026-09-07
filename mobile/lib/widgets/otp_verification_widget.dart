import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;

class OtpVerificationWidget extends StatefulWidget {
  const OtpVerificationWidget({
    super.key,
    required this.label,
    required this.onVerificationChanged,
    required this.keyPrefix,
  });

  final String label;
  final ValueChanged<bool> onVerificationChanged;
  final String keyPrefix;

  @override
  State<OtpVerificationWidget> createState() => _OtpVerificationWidgetState();
}

class _OtpVerificationWidgetState extends State<OtpVerificationWidget> {
  final _controller = TextEditingController();
  bool _isVerified = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _showMessage(String message) {
    FocusManager.instance.primaryFocus?.unfocus();
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  void _setVerified(bool value) {
    if (_isVerified == value) return;
    setState(() => _isVerified = value);
    widget.onVerificationChanged(value);
  }

  void _verify() {
    if (_controller.text.trim().isEmpty) {
      _showMessage(context.translate(i18.machineForm.otpRequired));
      return;
    }
    _setVerified(true);
    _showMessage(context.translate(i18.machineForm.otpVerified));
  }

  void _resend() {
    _controller.clear();
    _setVerified(false);
    _showMessage(context.translate(i18.machineForm.otpResent));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final prefix = widget.keyPrefix;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LabeledField(
          label: widget.label,
          capitalizedFirstLetter: false,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: DigitTextFormInput(
                  key: ValueKey('$prefix-otp-field'),
                  controller: _controller,
                  innerLabel: context.translate(i18.machineForm.enterOtp),
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  onChange: (_) => _setVerified(false),
                ),
              ),
              const SizedBox(width: spacer2),
              Expanded(
                child: DigitButton(
                  key: ValueKey('$prefix-verify-otp-button'),
                  mainAxisSize: MainAxisSize.max,
                  label: context.translate(i18.machineForm.verify),
                  onPressed: _verify,
                  type: DigitButtonType.secondary,
                  size: DigitButtonSize.large,
                ),
              ),
            ],
          ),
        ),
        if (_isVerified) ...[
          const SizedBox(height: spacer2),
          Text(
            context.translate(i18.machineForm.otpVerified),
            key: ValueKey('$prefix-otp-verified-message'),
            style: textTheme.bodyS.copyWith(
              color: theme.colorTheme.alert.success,
            ),
          ),
        ],
        const SizedBox(height: spacer2),
        DigitButton(
          key: ValueKey('$prefix-resend-otp-button'),
          label: context.translate(i18.machineForm.resendOtp),
          onPressed: _resend,
          type: DigitButtonType.tertiary,
          size: DigitButtonSize.medium,
          textColor: theme.colorTheme.primary.primary1,
        ),
      ],
    );
  }
}
