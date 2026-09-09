import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../repositories/otp_repository.dart';
import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;

class OtpVerificationWidget extends StatefulWidget {
  const OtpVerificationWidget({
    super.key,
    required this.label,
    required this.onVerificationChanged,
    required this.keyPrefix,
    required this.activityFacilityId,
    this.repository,
  });

  final String label;
  final ValueChanged<bool> onVerificationChanged;
  final String keyPrefix;
  final String activityFacilityId;

  /// Overridable for tests; defaults to the shared [otpRepository] instance.
  final OtpRepository? repository;

  @override
  State<OtpVerificationWidget> createState() => _OtpVerificationWidgetState();
}

class _OtpVerificationWidgetState extends State<OtpVerificationWidget> {
  final _controller = TextEditingController();
  bool _isVerified = false;
  bool _otpRequested = false;
  bool _isBusy = false;

  OtpRepository get _repository => widget.repository ?? otpRepository;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _showMessage(String message) {
    if (!mounted) return;
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

  Future<void> _requestOtp() async {
    setState(() => _isBusy = true);
    final result = await _repository.generate(widget.activityFacilityId);
    if (!mounted) return;
    setState(() {
      _isBusy = false;
      if (result.success) _otpRequested = true;
    });
    _showMessage(result.success
        ? context.translate(i18.machineForm.otpRequestSent)
        : result.message ?? context.translate(i18.machineForm.otpRequestFailed));
  }

  Future<void> _resendOtp() async {
    setState(() => _isBusy = true);
    final result = await _repository.resend(widget.activityFacilityId);
    if (!mounted) return;
    _controller.clear();
    setState(() => _isBusy = false);
    _setVerified(false);
    _showMessage(result.success
        ? context.translate(i18.machineForm.otpResent)
        : result.message ?? context.translate(i18.machineForm.otpRequestFailed));
  }

  Future<void> _verify() async {
    final otp = _controller.text.trim();
    if (otp.isEmpty) {
      _showMessage(context.translate(i18.machineForm.otpRequired));
      return;
    }
    setState(() => _isBusy = true);
    final result = await _repository.validate(widget.activityFacilityId, otp);
    if (!mounted) return;
    setState(() => _isBusy = false);
    _setVerified(result.success);
    _showMessage(result.success
        ? context.translate(i18.machineForm.otpVerified)
        : result.message ?? context.translate(i18.machineForm.otpRequired));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final prefix = widget.keyPrefix;

    if (!_otpRequested) {
      return LabeledField(
        label: widget.label,
        capitalizedFirstLetter: false,
        child: DigitButton(
          key: ValueKey('$prefix-request-otp-button'),
          mainAxisSize: MainAxisSize.max,
          label: context.translate(i18.machineForm.requestOtp),
          onPressed: () => _requestOtp(),
          isDisabled: _isBusy,
          type: DigitButtonType.secondary,
          size: DigitButtonSize.large,
        ),
      );
    }

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
                  onPressed: () => _verify(),
                  isDisabled: _isBusy,
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
        Wrap(
          alignment: WrapAlignment.end,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: spacer4,
          children: [
            DigitButton(
              key: ValueKey('$prefix-resend-otp-button'),
              label: context.translate(i18.machineForm.resendOtp),
              onPressed: () => _resendOtp(),
              isDisabled: _isBusy,
              type: DigitButtonType.tertiary,
              size: DigitButtonSize.medium,
              textColor: theme.colorTheme.primary.primary1,
            ),
            DigitButton(
              key: ValueKey('$prefix-request-otp-button'),
              label: context.translate(i18.machineForm.requestOtp),
              onPressed: () => _requestOtp(),
              isDisabled: _isBusy,
              type: DigitButtonType.tertiary,
              size: DigitButtonSize.medium,
              textColor: theme.colorTheme.primary.primary1,
            ),
          ],
        ),
      ],
    );
  }
}
