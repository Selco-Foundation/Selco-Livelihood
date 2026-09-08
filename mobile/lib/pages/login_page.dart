import 'dart:async';

import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../blocs/auth/authbloc.dart';
import '../data/secure_storage/secureStore.dart';
import '../router/app_router.dart';
import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../widgets/errors/app_error_notifier.dart';
import '../widgets/livelihood_app_bar.dart';
import '../widgets/login_consent_checkbox.dart';
import '../widgets/privacy_policy/policy_dialog_launcher.dart';

@RoutePage()
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _userIdController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _consentAccepted = false;
  bool _isConsentStatusLoading = true;
  bool _hasAcceptedConsent = false;
  bool _shouldPersistConsentOnAuthentication = false;
  String? _userIdError;
  String? _passwordError;

  @override
  void initState() {
    super.initState();
    unawaited(_loadConsentStatus());
  }

  Future<void> _loadConsentStatus() async {
    var hasAcceptedConsent = false;
    try {
      hasAcceptedConsent = await SecureStore().hasAcceptedLoginConsent();
    } catch (error, stackTrace) {
      debugPrint('Login consent read failed: $error\n$stackTrace');
    }

    if (!mounted) return;
    setState(() {
      _hasAcceptedConsent = hasAcceptedConsent;
      _isConsentStatusLoading = false;
    });
  }

  Future<void> _persistConsentAfterAuthentication() async {
    if (_hasAcceptedConsent || !_shouldPersistConsentOnAuthentication) {
      return;
    }

    try {
      await SecureStore().setLoginConsentAccepted();
      _hasAcceptedConsent = true;
    } catch (error, stackTrace) {
      debugPrint('Login consent write failed: $error\n$stackTrace');
    }
  }

  @override
  void dispose() {
    _userIdController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _showMessage(String message) {
    FocusManager.instance.primaryFocus?.unfocus();
    AppErrorNotifier.show(message);
  }

  void _submit() {
    final userId = _userIdController.text.trim();
    final password = _passwordController.text.trim();
    final userIdMissing = userId.isEmpty;
    final passwordMissing = password.isEmpty;

    setState(() {
      _userIdError =
          userIdMissing ? context.translate(i18.common.requiredMessage) : null;
      _passwordError = passwordMissing
          ? context.translate(i18.common.requiredMessage)
          : null;
    });

    final canSubmitConsent =
        !_isConsentStatusLoading && (_hasAcceptedConsent || _consentAccepted);
    if (!userIdMissing && !passwordMissing && canSubmitConsent) {
      _shouldPersistConsentOnAuthentication =
          !_hasAcceptedConsent && _consentAccepted;
      FocusManager.instance.primaryFocus?.unfocus();
      context.read<AuthBloc>().add(
            AuthEvent.login(username: userId, password: password),
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

    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        state.whenOrNull(
          authenticated: (accessToken, refreshToken, userRequest) async {
            await _persistConsentAfterAuthentication();
            if (!context.mounted) return;
            context.router.root.replaceAll(
              const [
                AuthenticatedRouteWrapper(children: [HomeRoute()])
              ],
            );
          },
          error: (message) {
            _shouldPersistConsentOnAuthentication = false;
            _showMessage(context.translate(message));
          },
        );
      },
      builder: (context, state) {
        final isLoading =
            state.maybeWhen(loading: () => true, orElse: () => false);

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
                    context.translate(i18.login.login),
                    style: textTheme.headingXl.copyWith(
                      color: theme.colorTheme.primary.primary2,
                    ),
                  ),
                  LabeledField(
                    label: context.translate(i18.login.userId),
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
                    label: context.translate(i18.login.password),
                    isRequired: true,
                    child: DigitPasswordFormInput(
                      key: const ValueKey('password-field'),
                      controller: _passwordController,
                      keyboardType: TextInputType.text,
                      errorMessage: _passwordError,
                      onChange: _clearPasswordError,
                    ),
                  ),
                  if (!_isConsentStatusLoading && !_hasAcceptedConsent)
                    LoginConsentCheckbox(
                      value: _consentAccepted,
                      onChanged: (value) {
                        setState(() => _consentAccepted = value);
                      },
                      prefixText: context.translate(i18.login.consentPrefix),
                      privacyPolicyText:
                          context.translate(i18.login.privacyPolicy),
                      connectorText:
                          context.translate(i18.login.consentConnector),
                      termsAndConditionsText:
                          context.translate(i18.login.termsOfUse),
                      onPrivacyPolicyTap: () => showPrivacyPolicy(context),
                      onTermsAndConditionsTap: () =>
                          showTermsAndConditions(context),
                    ),
                  DigitButton(
                    key: const ValueKey('login-button'),
                    isDisabled: isLoading ||
                        _isConsentStatusLoading ||
                        (!_hasAcceptedConsent && !_consentAccepted),
                    label: context.translate(i18.login.login),
                    type: DigitButtonType.primary,
                    onPressed: _submit,
                    size: DigitButtonSize.large,
                    mainAxisSize: MainAxisSize.max,
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
