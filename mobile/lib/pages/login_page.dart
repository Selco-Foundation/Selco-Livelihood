import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';

import '../app/app_strings.dart';
import '../widgets/livelihood_app_bar.dart';
import '../widgets/login_consent_checkbox.dart';
import 'home_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _userIdController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _consentAccepted = false;
  String? _userIdError;
  String? _passwordError;

  @override
  void dispose() {
    _userIdController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _showPolicy(String title) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: const Text(AppStrings.policyNotConnected),
        actions: [
          DigitButton(
            label: 'Close',
            type: DigitButtonType.tertiary,
            size: DigitButtonSize.medium,
            onPressed: () => Navigator.of(dialogContext).pop(),
          ),
        ],
      ),
    );
  }

  void _showMessage(String message) {
    FocusManager.instance.primaryFocus?.unfocus();
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  void _submit() {
    final userIdMissing = _userIdController.text.trim().isEmpty;
    final passwordMissing = _passwordController.text.trim().isEmpty;

    setState(() {
      _userIdError = userIdMissing ? AppStrings.requiredMessage : null;
      _passwordError = passwordMissing ? AppStrings.requiredMessage : null;
    });

    if (!userIdMissing && !passwordMissing) {
      FocusManager.instance.primaryFocus?.unfocus();
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(builder: (_) => const HomePage()),
      );
    }
  }

  void _clearUserIdError(String value) {
    if (_userIdError != null && value.trim().isNotEmpty) {
      setState(() => _userIdError = null);
    }
  }

  void _clearPasswordError(String value) {
    if (_passwordError != null && value.trim().isNotEmpty) {
      setState(() => _passwordError = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    return Scaffold(
      appBar: const LivelihoodAppBar(),
      body: ScrollableContent(
        key: const ValueKey('login-scroll-view'),
        backgroundColor: theme.colorTheme.generic.background,
        footer: const Padding(
          padding: EdgeInsets.only(bottom: spacer2),
          child: PoweredByDigit(version: ''),
        ),
        children: [
          DigitCard(
            margin: const EdgeInsets.all(spacer2),
            children: [
              Text(
                AppStrings.login,
                style: textTheme.headingXl.copyWith(
                  color: theme.colorTheme.primary.primary2,
                ),
              ),
              LabeledField(
                label: AppStrings.userId,
                capitalizedFirstLetter: false,
                isRequired: true,
                child: DigitTextFormInput(
                  key: const ValueKey('user-id-field'),
                  controller: _userIdController,
                  keyboardType: TextInputType.text,
                  errorMessage: _userIdError,
                  onChange: _clearUserIdError,
                ),
              ),
              LabeledField(
                label: AppStrings.password,
                isRequired: true,
                child: DigitPasswordFormInput(
                  key: const ValueKey('password-field'),
                  controller: _passwordController,
                  keyboardType: TextInputType.text,
                  errorMessage: _passwordError,
                  onChange: _clearPasswordError,
                ),
              ),
              LoginConsentCheckbox(
                value: _consentAccepted,
                onChanged: (value) {
                  setState(() => _consentAccepted = value);
                },
                prefixText: AppStrings.consentPrefix,
                privacyPolicyText: AppStrings.privacyPolicy,
                connectorText: AppStrings.consentConnector,
                termsAndConditionsText: AppStrings.termsOfUse,
                onPrivacyPolicyTap: () => _showPolicy(
                  AppStrings.privacyPolicy,
                ),
                onTermsAndConditionsTap: () => _showPolicy(
                  AppStrings.termsOfUse,
                ),
              ),
              DigitButton(
                key: const ValueKey('login-button'),
                isDisabled: !_consentAccepted,
                label: AppStrings.login,
                type: DigitButtonType.primary,
                onPressed: _submit,
                size: DigitButtonSize.large,
                mainAxisSize: MainAxisSize.max,
              ),
              DigitButton(
                key: const ValueKey('forgot-password-button'),
                label: AppStrings.forgotPassword,
                mainAxisSize: MainAxisSize.max,
                type: DigitButtonType.tertiary,
                size: DigitButtonSize.medium,
                onPressed: () => _showMessage(
                  AppStrings.forgotPasswordNotConnected,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
