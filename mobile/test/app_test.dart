import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/app/app_strings.dart';
import 'package:livelihood/main.dart';
import 'package:livelihood/pages/login_page.dart';

void main() {
  TextSpan findTextSpan(TextSpan root, String text) {
    if (root.text == text) return root;
    for (final child in root.children ?? const <InlineSpan>[]) {
      if (child is TextSpan) {
        try {
          return findTextSpan(child, text);
        } on StateError {
          // Continue through sibling spans.
        }
      }
    }
    throw StateError('Text span not found: $text');
  }

  void setMobileViewport(WidgetTester tester, Size size) {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  Future<void> pumpLogin(
    WidgetTester tester, {
    Size size = const Size(390, 844),
  }) {
    setMobileViewport(tester, size);
    return tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: const LoginPage(),
      ),
    );
  }

  testWidgets('welcome uses E4H DIGIT components and navigates to login', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(const LivelihoodApp());

    final appBar = tester.widget<AppBar>(find.byType(AppBar));
    expect(appBar.backgroundColor, const Color(0xFF0B4B66));
    expect(find.byType(ScrollableContent), findsOneWidget);
    expect(find.byType(DigitCard), findsNWidgets(2));

    final welcomeHeading = tester.widget<Text>(
      find.text(AppStrings.welcomeTitle),
    );
    expect(welcomeHeading.style?.fontFamily, 'Roboto Condensed');
    expect(welcomeHeading.style?.fontSize, 32);
    expect(welcomeHeading.style?.fontWeight, FontWeight.w700);

    for (final item in AppStrings.welcomeItems) {
      final image = tester.widget<Image>(find.byKey(ValueKey(item.imagePath)));
      expect(image.width, spacer12 * 2);
      expect(image.height, spacer12 * 2);
    }

    final proceedButton = tester.widget<DigitButton>(
      find.byKey(const ValueKey('proceed-button')),
    );
    expect(proceedButton.type, DigitButtonType.primary);
    expect(proceedButton.size, DigitButtonSize.large);
    expect(proceedButton.suffixIcon, Icons.arrow_forward_outlined);

    await tester.tap(find.byKey(const ValueKey('proceed-button')));
    await tester.pumpAndSettle();

    expect(find.byType(LoginPage), findsOneWidget);
    expect(find.text(AppStrings.login), findsNWidgets(2));
  });

  testWidgets('login uses DIGIT controls and local UI behavior', (
    tester,
  ) async {
    await pumpLogin(tester);

    expect(find.byType(DigitCard), findsOneWidget);
    expect(find.byType(DigitTextFormInput), findsOneWidget);
    expect(find.byType(DigitPasswordFormInput), findsOneWidget);
    expect(find.byType(PoweredByDigit), findsOneWidget);

    final loginButtonFinder = find.byKey(const ValueKey('login-button'));
    var loginButton = tester.widget<DigitButton>(loginButtonFinder);
    expect(loginButton.type, DigitButtonType.primary);
    expect(loginButton.size, DigitButtonSize.large);
    expect(loginButton.isDisabled, isTrue);

    final passwordField = find.byKey(const ValueKey('password-field'));
    final passwordInput = find.descendant(
      of: passwordField,
      matching: find.byType(EditableText),
    );
    expect(tester.widget<EditableText>(passwordInput).obscureText, isTrue);
    await tester.tap(find.byIcon(Icons.visibility));
    await tester.pump();
    expect(tester.widget<EditableText>(passwordInput).obscureText, isFalse);

    await tester.tap(find.byKey(const ValueKey('consent-checkbox')));
    await tester.pump();
    loginButton = tester.widget<DigitButton>(loginButtonFinder);
    expect(loginButton.isDisabled, isFalse);

    await tester.tap(loginButtonFinder);
    await tester.pump();
    expect(find.text(AppStrings.requiredMessage), findsNWidgets(2));

    final userIdInput = find.descendant(
      of: find.byKey(const ValueKey('user-id-field')),
      matching: find.byType(EditableText),
    );
    await tester.enterText(userIdInput, 'demo.user');
    await tester.enterText(passwordInput, 'password');
    await tester.tap(loginButtonFinder);
    await tester.pump();
    expect(find.text(AppStrings.loginNotConnected), findsOneWidget);

    final forgotButton = tester.widget<DigitButton>(
      find.byKey(const ValueKey('forgot-password-button')),
    );
    expect(forgotButton.type, DigitButtonType.tertiary);
    expect(forgotButton.size, DigitButtonSize.medium);
  });

  testWidgets('policy link opens a local DIGIT-themed dialog', (tester) async {
    await pumpLogin(tester);

    final consentTextFinder = find.byWidgetPredicate(
      (widget) =>
          widget is RichText &&
          widget.text.toPlainText().contains(AppStrings.privacyPolicy),
    );
    final consentText = tester.widget<RichText>(consentTextFinder);
    final rootSpan = consentText.text as TextSpan;
    final privacySpan = findTextSpan(rootSpan, AppStrings.privacyPolicy);
    (privacySpan.recognizer! as TapGestureRecognizer).onTap!();
    await tester.pumpAndSettle();

    expect(find.text(AppStrings.privacyPolicy), findsOneWidget);
    expect(find.text(AppStrings.policyNotConnected), findsOneWidget);
    expect(find.byType(DigitButton), findsNWidgets(3));
  });

  testWidgets('forgot password provides UI-only feedback', (tester) async {
    await pumpLogin(tester);

    await tester.tap(find.byKey(const ValueKey('forgot-password-button')));
    await tester.pump();

    expect(find.text(AppStrings.forgotPasswordNotConnected), findsOneWidget);
  });

  testWidgets('DIGIT layouts do not overflow at representative mobile sizes', (
    tester,
  ) async {
    for (final size in <Size>[const Size(360, 800), const Size(390, 844)]) {
      await pumpLogin(tester, size: size);
      expect(find.byKey(const ValueKey('login-scroll-view')), findsOneWidget);
      expect(tester.takeException(), isNull, reason: 'overflow at $size');
    }
  });
}
