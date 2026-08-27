import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/app/app_strings.dart';
import 'package:livelihood/main.dart';
import 'package:livelihood/pages/home_page.dart';
import 'package:livelihood/pages/login_page.dart';
import 'package:livelihood/widgets/home_help_header.dart';
import 'package:livelihood/widgets/home_item_card.dart';
import 'package:livelihood/widgets/livelihood_app_bar.dart';

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

    final forgotButton = tester.widget<DigitButton>(
      find.byKey(const ValueKey('forgot-password-button')),
    );
    expect(forgotButton.type, DigitButtonType.tertiary);
    expect(forgotButton.size, DigitButtonSize.medium);

    final userIdInput = find.descendant(
      of: find.byKey(const ValueKey('user-id-field')),
      matching: find.byType(EditableText),
    );
    await tester.enterText(userIdInput, 'demo.user');
    await tester.enterText(passwordInput, 'password');
    await tester.tap(loginButtonFinder);
    await tester.pumpAndSettle();
    expect(find.byType(HomePage), findsOneWidget);
    expect(find.byType(LoginPage), findsNothing);
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

  testWidgets('home follows the requested section order and DIGIT styling', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: const HomePage(),
      ),
    );

    expect(find.byKey(const ValueKey('home-menu-button')), findsOneWidget);
    expect(find.byKey(const ValueKey('home-help-button')), findsOneWidget);
    expect(find.byType(HomeHelpHeader), findsOneWidget);
    expect(find.text(AppStrings.appDescriptor), findsOneWidget);
    expect(find.byType(PoweredByDigit), findsOneWidget);
    expect(find.byType(InfoCard), findsOneWidget);
    expect(find.byType(HomeItemCard), findsNWidgets(6));

    final homeCards = tester.widgetList<DigitCard>(
      find.descendant(
        of: find.byType(HomeItemCard),
        matching: find.byType(DigitCard),
      ),
    );
    expect(homeCards, hasLength(6));
    for (final card in homeCards) {
      expect(card.padding, const EdgeInsets.all(spacer1));
      expect(card.margin, const EdgeInsets.all(spacer2));
      expect(card.inline, isTrue);
    }

    final homeCardIcons = tester.widgetList<Icon>(
      find.byKey(const ValueKey('home-card-icon')),
    );
    expect(homeCardIcons, hasLength(2));
    expect(homeCardIcons.every((icon) => icon.size == 50), isTrue);
    expect(
      find.byKey(const ValueKey('home-card-count-position')),
      findsNWidgets(4),
    );
    expect(
      find.byKey(const ValueKey('home-card-label-padding')),
      findsNWidgets(6),
    );
    final resubmissionCard = find.byKey(
      const ValueKey('resubmission-report-card'),
    );
    final resubmissionLabelPadding = tester.widget<Padding>(
      find.descendant(
        of: resubmissionCard,
        matching: find.byKey(const ValueKey('home-card-label-padding')),
      ),
    );
    expect(
      resubmissionLabelPadding.padding,
      const EdgeInsets.symmetric(horizontal: spacer2),
    );

    final installationLabelPadding = tester.widget<Padding>(
      find.descendant(
        of: find.byKey(const ValueKey('installation-report-card')),
        matching: find.byKey(const ValueKey('home-card-label-padding')),
      ),
    );
    expect(
      installationLabelPadding.padding,
      const EdgeInsets.symmetric(horizontal: spacer10),
    );

    final resubmissionLabel = find.descendant(
      of: resubmissionCard,
      matching: find.text(AppStrings.resubmissionNeeded),
    );
    expect(resubmissionLabel, findsOneWidget);
    final labelSize = tester.getSize(resubmissionLabel);
    expect(labelSize.height, greaterThan(30));
    expect(labelSize.height, lessThan(40));

    final statusLines = find.byKey(
      const ValueKey('home-card-status-line'),
    );
    expect(statusLines, findsNWidgets(2));
    for (final line in statusLines.evaluate()) {
      expect(tester.getSize(find.byWidget(line.widget)).width, 2);
    }

    expect(
      find.byKey(const ValueKey('e4h-home-card-grid')),
      findsNWidgets(2),
    );
    for (final key in <String>[
      'installation-report-card',
      'assigned-report-card',
    ]) {
      final cardSize = tester.getSize(find.byKey(ValueKey(key)));
      expect(cardSize.width / cardSize.height, closeTo(375 / 340, 0.0001));
    }

    final quickCard = tester.getTopLeft(
      find.byKey(const ValueKey('installation-report-card')),
    );
    final reportsHeading = tester.getTopLeft(
      find.byKey(const ValueKey('my-reports-heading')),
    );
    final warning = tester.getTopLeft(
      find.byKey(const ValueKey('sync-warning-card')),
    );
    expect(quickCard.dy, lessThan(reportsHeading.dy));
    expect(reportsHeading.dy, lessThan(warning.dy));

    for (final key in <String>[
      'installation-report-card',
      'sync-pending-card',
      'assigned-report-card',
      'pending-approval-report-card',
      'approved-report-card',
      'resubmission-report-card',
    ]) {
      expect(find.byKey(ValueKey(key)), findsOneWidget);
    }

    for (final text in <String>[
      '48',
      '12',
      '35',
      '6',
      AppStrings.syncPendingWarning,
      AppStrings.pendingSyncDescription,
    ]) {
      expect(find.text(text), findsOneWidget);
    }
  });

  testWidgets('home navbar and help header match E4H placement and spacing', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: const HomePage(),
      ),
    );

    final livelihoodBar = tester.widget<LivelihoodAppBar>(
      find.byType(LivelihoodAppBar),
    );
    expect(livelihoodBar.preferredSize.height, spacer12);
    expect(livelihoodBar.showMenu, isTrue);

    final appBarFinder = find.byType(AppBar);
    final appBar = tester.widget<AppBar>(appBarFinder);
    expect(appBar.toolbarHeight, spacer12);
    expect(appBar.actions, isNull);

    final menuButton = tester.widget<IconButton>(
      find.byKey(const ValueKey('home-menu-button')),
    );
    final menuIcon = menuButton.icon as Icon;
    expect(menuIcon.icon, Icons.menu);
    expect(menuIcon.size, spacer6);
    expect(menuIcon.color, Colors.white);

    final titleRow = appBar.title! as Row;
    expect(titleRow.mainAxisAlignment, MainAxisAlignment.start);
    expect((titleRow.children[1] as SizedBox).width, spacer2);
    expect(
      tester.getSize(find.byKey(const ValueKey('navbar-title-divider'))),
      const Size(1, spacer6),
    );
    expect((titleRow.children[3] as SizedBox).width, spacer2);

    final helpFinder = find.byKey(const ValueKey('home-help-button'));
    expect(
      find.descendant(of: appBarFinder, matching: helpFinder),
      findsNothing,
    );
    final helpButton = tester.widget<DigitButton>(helpFinder);
    expect(helpButton.type, DigitButtonType.tertiary);
    expect(helpButton.size, DigitButtonSize.medium);
    expect(helpButton.suffixIcon, Icons.help_outline_outlined);
    expect(helpButton.textColor, const DigitColors().light.primary1);
    expect(helpButton.iconColor, const DigitColors().light.primary1);

    final helpPadding = tester.widget<Padding>(
      find.byKey(const ValueKey('home-help-header-padding')),
    );
    expect(
      helpPadding.padding,
      const EdgeInsets.fromLTRB(spacer2, spacer2, spacer2, 0),
    );
    expect(
      tester.getTopLeft(helpFinder).dy,
      greaterThanOrEqualTo(tester.getBottomLeft(appBarFinder).dy),
    );
  });

  testWidgets('home controls provide local placeholder feedback', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: const HomePage(),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('home-menu-button')));
    await tester.pump();
    expect(find.text(AppStrings.homeActionNotConnected), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('home-help-button')));
    await tester.pump();
    expect(find.text(AppStrings.homeActionNotConnected), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('installation-report-card')));
    await tester.pump();
    expect(find.text(AppStrings.homeActionNotConnected), findsOneWidget);
    expect(find.byType(HomePage), findsOneWidget);
  });

  testWidgets('DIGIT layouts do not overflow at representative mobile sizes', (
    tester,
  ) async {
    for (final size in <Size>[const Size(360, 800), const Size(390, 844)]) {
      await pumpLogin(tester, size: size);
      expect(find.byKey(const ValueKey('login-scroll-view')), findsOneWidget);
      expect(tester.takeException(), isNull, reason: 'overflow at $size');

      await tester.pumpWidget(
        MaterialApp(
          theme: DigitTheme.instance.mobileTheme,
          home: const HomePage(),
        ),
      );
      await tester.pump();
      expect(find.byKey(const ValueKey('home-scroll-view')), findsOneWidget);
      expect(tester.takeException(), isNull, reason: 'home overflow at $size');
    }
  });
}
