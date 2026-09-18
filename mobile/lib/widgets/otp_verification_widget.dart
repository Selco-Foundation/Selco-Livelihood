import 'dart:async';

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
    required this.onVerificationChanged,
    required this.keyPrefix,
    required this.activityFacilityId,
    this.initiallyRequested = false,
    this.initiallyVerified = false,
    this.isEnabled = true,
    this.onRequestSucceeded,
    this.onVerificationSucceeded,
    this.repository,
  });

  final ValueChanged<bool> onVerificationChanged;
  final String keyPrefix;
  final String activityFacilityId;
  final bool initiallyRequested;
  final bool initiallyVerified;
  final bool isEnabled;
  final FutureOr<void> Function()? onRequestSucceeded;
  final FutureOr<void> Function()? onVerificationSucceeded;

  /// Overridable for tests; defaults to the shared [otpRepository] instance.
  final OtpRepository? repository;

  @override
  State<OtpVerificationWidget> createState() => _OtpVerificationWidgetState();
}

class _OtpVerificationWidgetState extends State<OtpVerificationWidget> {
  final _controller = TextEditingController();
  late bool _isVerified;
  late bool _otpRequested;
  bool _isBusy = false;

  OtpRepository get _repository => widget.repository ?? otpRepository;

  @override
  void initState() {
    super.initState();
    _isVerified = widget.initiallyVerified;
    _otpRequested = widget.initiallyRequested || widget.initiallyVerified;
  }

  @override
  void didUpdateWidget(covariant OtpVerificationWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initiallyVerified && !_isVerified) {
      _isVerified = true;
      _otpRequested = true;
    } else if (widget.initiallyRequested && !_otpRequested) {
      _otpRequested = true;
    }
  }

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
    if (!widget.isEnabled || _isBusy || _isVerified) return;
    setState(() => _isBusy = true);
    final result = await _repository.generate(widget.activityFacilityId);
    if (!mounted) return;
    setState(() {
      _isBusy = false;
      if (result.success) _otpRequested = true;
    });
    _showMessage(result.success
        ? context.translate(i18.machineForm.otpRequestSent)
        : result.message ??
            context.translate(i18.machineForm.otpRequestFailed));
    if (result.success) await widget.onRequestSucceeded?.call();
  }

  Future<void> _resendOtp() async {
    if (!widget.isEnabled || _isBusy || _isVerified) return;
    setState(() => _isBusy = true);
    final result = await _repository.resend(widget.activityFacilityId);
    if (!mounted) return;
    _controller.clear();
    setState(() => _isBusy = false);
    _setVerified(false);
    _showMessage(result.success
        ? context.translate(i18.machineForm.otpResent)
        : result.message ??
            context.translate(i18.machineForm.otpRequestFailed));
  }

  Future<void> _verify() async {
    if (!widget.isEnabled || _isBusy || _isVerified || !_otpRequested) return;
    if (_controller.text.trim().isEmpty) {
      _showMessage(context.translate(i18.machineForm.otpRequired));
      return;
    }
    setState(() => _isBusy = true);
    final result = await _repository.validate(
        widget.activityFacilityId, _controller.text.trim());
    if (!mounted) return;
    setState(() => _isBusy = false);
    _setVerified(result.success);
    _showMessage(result.success
        ? context.translate(i18.machineForm.otpVerified)
        : result.message ?? context.translate(i18.machineForm.otpRequired));
    if (result.success) await widget.onVerificationSucceeded?.call();
  }

  void _onOtpChanged(String _) {
    final wasVerified = _isVerified;
    setState(() => _isVerified = false);
    if (wasVerified) widget.onVerificationChanged(false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final prefix = widget.keyPrefix;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
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
                onChange: _onOtpChanged,
                isDisabled: !widget.isEnabled || _isVerified,
              ),
            ),
            const SizedBox(width: spacer2),
            Expanded(
              child: DigitButton(
                key: ValueKey('$prefix-verify-otp-button'),
                mainAxisSize: MainAxisSize.max,
                label: context.translate(i18.machineForm.verify),
                onPressed: () => _verify(),
                isDisabled: !widget.isEnabled ||
                    _isBusy ||
                    _isVerified ||
                    !_otpRequested ||
                    _controller.text.trim().isEmpty,
                type: DigitButtonType.secondary,
                size: DigitButtonSize.large,
              ),
            ),
          ],
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
          key: ValueKey('$prefix-otp-request-resend-button'),
          label: context.translate(_otpRequested
              ? i18.machineForm.resendOtp
              : i18.machineForm.requestOtp),
          onPressed: () => _otpRequested ? _resendOtp() : _requestOtp(),
          isDisabled: !widget.isEnabled || _isBusy || _isVerified,
          type: DigitButtonType.tertiary,
          size: DigitButtonSize.medium,
          textColor: theme.colorTheme.primary.primary1,
        ),
      ],
    );
  }
}
