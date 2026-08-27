import 'dart:async';

import 'package:badges/badges.dart' as badges;
import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:digit_ui_components/widgets/molecules/panel_cards.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:livelihood/app/app_strings.dart';
import 'package:livelihood/main.dart';
import 'package:livelihood/models/facility_report_sample.dart';
import 'package:livelihood/models/solar_installation_draft.dart';
import 'package:livelihood/pages/installation_report_home_page.dart';
import 'package:livelihood/pages/installation_report_list_pages.dart';
import 'package:livelihood/pages/home_page.dart';
import 'package:livelihood/pages/login_page.dart';
import 'package:livelihood/pages/machine_form.dart';
import 'package:livelihood/pages/machine_report_success_page.dart';
import 'package:livelihood/pages/add_new_asset.dart';
import 'package:livelihood/pages/asset_count.dart';
import 'package:livelihood/pages/asset_summary.dart';
import 'package:livelihood/pages/installation_completion_certificate.dart';
import 'package:livelihood/pages/installation_images.dart';
import 'package:livelihood/pages/media_upload.dart';
import 'package:livelihood/pages/overall_asset_summary.dart'
    show OverallAssetSummaryPage;
import 'package:livelihood/widgets/image_uploader.dart';
import 'package:livelihood/widgets/file_upload_widget.dart';
import 'package:livelihood/widgets/video_uploader.dart';
import 'package:livelihood/widgets/facility_report_card.dart';
import 'package:livelihood/widgets/facility_search_sort_card.dart';
import 'package:livelihood/widgets/home_help_header.dart';
import 'package:livelihood/widgets/home_item_card.dart';
import 'package:livelihood/widgets/livelihood_app_bar.dart';
import 'package:livelihood/widgets/machine_media_picker.dart';

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

    await tester.tap(find.byKey(const ValueKey('sync-pending-card')));
    await tester.pump();
    expect(find.text(AppStrings.homeActionNotConnected), findsOneWidget);
    expect(find.byType(HomePage), findsOneWidget);
  });

  testWidgets('home opens Installation Report and renders four menu cards', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: const HomePage(),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('installation-report-card')));
    await tester.pumpAndSettle();

    expect(find.byType(InstallationReportHomePage), findsOneWidget);
    expect(find.text(AppStrings.installationReportHome), findsOneWidget);
    expect(find.byKey(const ValueKey('report-back-button')), findsOneWidget);
    expect(find.byKey(const ValueKey('report-help-button')), findsOneWidget);
    expect(find.byType(PoweredByDigit), findsOneWidget);

    for (final key in <String>[
      'new-report-menu-card',
      'pending-approval-menu-card',
      'resubmission-menu-card',
      'approved-menu-card',
    ]) {
      expect(find.byKey(ValueKey(key)), findsOneWidget);
    }
    for (final count in <String>['48', '12', '6', '35']) {
      expect(find.text(count), findsOneWidget);
    }

    final countBadges = tester.widgetList<badges.Badge>(
      find.byKey(const ValueKey('report-menu-count-badge')),
    );
    expect(countBadges, hasLength(4));
    for (final badge in countBadges) {
      expect(badge.badgeStyle.shape, badges.BadgeShape.square);
      expect(
        badge.badgeStyle.badgeColor,
        const DigitColors().light.alertError,
      );
      expect(
        badge.badgeStyle.padding,
        const EdgeInsets.symmetric(
          horizontal: spacer3,
          vertical: spacer1,
        ),
      );
      expect(badge.badgeStyle.borderRadius, BorderRadius.circular(20));
      expect((badge.badgeContent as Text).style?.color, Colors.white);
    }

    await tester.tap(find.byKey(const ValueKey('report-help-button')));
    await tester.pump();
    expect(find.text(AppStrings.reportActionNotConnected), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('report-back-button')));
    await tester.pumpAndSettle();
    expect(find.byType(HomePage), findsOneWidget);
  });

  testWidgets('report menu cards open their separated facility pages', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));

    Future<void> expectDestination(String key, Type pageType) async {
      await tester.pumpWidget(
        MaterialApp(
          key: UniqueKey(),
          theme: DigitTheme.instance.mobileTheme,
          home: const InstallationReportHomePage(),
        ),
      );
      final card = find.byKey(ValueKey(key));
      final cardCenter = tester.getCenter(card);
      if (cardCenter.dy > 700) {
        await tester.drag(
          find.byType(CustomScrollView),
          Offset(0, 650 - cardCenter.dy),
        );
        await tester.pumpAndSettle();
      }
      await tester.tap(card);
      await tester.pumpAndSettle();
      expect(find.byType(pageType), findsOneWidget);
    }

    await expectDestination('new-report-menu-card', NewReportFacilitiesPage);
    await expectDestination('pending-approval-menu-card', PendingApprovalPage);
    await expectDestination(
      'resubmission-menu-card',
      ResubmissionNeededPage,
    );
    await expectDestination('approved-menu-card', ApprovedReportsPage);
  });

  testWidgets('facility pages use the correct search and progress variants', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));

    Future<void> pumpPage(Widget page) => tester.pumpWidget(
          MaterialApp(
            theme: DigitTheme.instance.mobileTheme,
            home: page,
          ),
        );

    await pumpPage(const NewReportFacilitiesPage());
    expect(find.byType(FacilitySearchSortCard), findsOneWidget);
    expect(find.byType(FacilityReportCard), findsNWidgets(2));
    expect(find.byType(LinearProgressIndicator), findsNWidgets(2));
    expect(find.byKey(const ValueKey('start-resume-report-button')),
        findsNWidgets(2));
    expect(
        find.byKey(const ValueKey('submit-approval-button')), findsNWidgets(2));

    await pumpPage(const PendingApprovalPage());
    expect(find.byType(FacilitySearchSortCard), findsNothing);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.byKey(const ValueKey('view-summary-button')), findsNWidgets(2));

    await pumpPage(const ResubmissionNeededPage());
    expect(find.byType(FacilitySearchSortCard), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.byKey(const ValueKey('view-details-button')), findsNWidgets(2));
    expect(find.byKey(const ValueKey('resubmit-button')), findsNWidgets(2));

    await pumpPage(const ApprovedReportsPage());
    expect(find.byType(FacilitySearchSortCard), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.byKey(const ValueKey('view-summary-button')), findsNWidgets(2));
  });

  testWidgets('search pages expose the E4H sort popup without filtering', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: const ApprovedReportsPage(),
      ),
    );

    expect(find.byKey(const ValueKey('facility-search-field')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('facility-sort-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('facility-sort-popup')), findsOneWidget);
    expect(find.text('Newest first'), findsOneWidget);
    expect(find.text('Oldest first'), findsOneWidget);
    expect(find.byType(FacilityReportCard), findsNWidgets(2));
  });

  testWidgets('pending solar opens its read-only overall summary', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: const PendingApprovalPage(),
      ),
    );

    final summaryButton =
        find.byKey(const ValueKey('view-summary-button')).first;
    await tester.ensureVisible(summaryButton);
    await tester.tap(summaryButton);
    await tester.pump();

    await tester.pumpAndSettle();
    expect(find.byType(OverallAssetSummaryPage), findsOneWidget);
    expect(
      find.byKey(const ValueKey('solar-overall-summary-pending')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsNothing);
  });

  testWidgets('solar and machine facilities open their separate flows', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));

    Future<void> pumpNewReports() => tester.pumpWidget(
          MaterialApp(
            key: UniqueKey(),
            theme: DigitTheme.instance.mobileTheme,
            home: const NewReportFacilitiesPage(),
          ),
        );

    await pumpNewReports();
    final solarAction =
        find.byKey(const ValueKey('start-resume-report-button')).first;
    await tester.ensureVisible(solarAction);
    await tester.tap(solarAction);
    await tester.pumpAndSettle();
    expect(find.byType(AssetCountPage), findsOneWidget);
    expect(find.text(AppStrings.assetCountTitle), findsOneWidget);

    await pumpNewReports();
    final machineAction =
        find.byKey(const ValueKey('start-resume-report-button')).last;
    await tester.drag(
      find.byType(CustomScrollView),
      const Offset(0, -900),
    );
    await tester.pumpAndSettle();
    await tester.tap(machineAction);
    await tester.pumpAndSettle();
    expect(find.byType(MachineFormPage), findsOneWidget);
    expect(find.text(AppStrings.machineReportTitle), findsOneWidget);
  });

  testWidgets('overall summary shows all E4H BOM buttons in order', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 3000));
    final draft = SolarInstallationDraft.prefilled(
      facility: facilityReportSamples.first,
      mode: SolarWorkflowMode.newReport,
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: OverallAssetSummaryPage(draft: draft),
      ),
    );

    const labels = [
      'Add System Parameters',
      'Add BOM Solar System',
      'Add BOM RMS',
      'Add BOM Load Wiring',
      'Add BOM Luminaries',
    ];
    for (final label in labels) {
      expect(find.text(label), findsOneWidget);
    }
    final firstButton = tester.getRect(
      find.byKey(const ValueKey('solar-dynamic-system parameters')),
    );
    final secondButton = tester.getRect(
      find.byKey(const ValueKey('solar-dynamic-bom solar system')),
    );
    expect(secondButton.top - firstButton.bottom, spacer4);
    await tester.tap(find.text('Add BOM RMS'));
    await tester.pump();
    expect(find.text(AppStrings.dynamicFormNotConnected), findsOneWidget);
    expect(find.byType(OverallAssetSummaryPage), findsOneWidget);
  });

  testWidgets('solar status variants use view and edit actions', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 3000));

    Future<void> pumpMode(SolarWorkflowMode mode) => tester.pumpWidget(
          MaterialApp(
            key: UniqueKey(),
            theme: DigitTheme.instance.mobileTheme,
            home: OverallAssetSummaryPage(
              draft: SolarInstallationDraft.prefilled(
                facility: facilityReportSamples.first,
                mode: mode,
              ),
            ),
          ),
        );

    await pumpMode(SolarWorkflowMode.pending);
    expect(find.text('View System Parameters'), findsOneWidget);
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsNothing);

    await pumpMode(SolarWorkflowMode.approved);
    expect(find.text('View BOM Luminaries'), findsOneWidget);
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsNothing);

    await pumpMode(SolarWorkflowMode.resubmission);
    expect(find.text('Edit System Parameters'), findsOneWidget);
    expect(find.byKey(const ValueKey('solar-rejection-card')), findsOneWidget);
    expect(find.text(AppStrings.resubmit), findsOneWidget);
  });

  testWidgets('solar completion controls and submit gate reflect draft data', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final incomplete = SolarInstallationDraft(
      facility: facilityReportSamples.first,
      mode: SolarWorkflowMode.newReport,
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: OverallAssetSummaryPage(draft: incomplete),
      ),
    );
    final enabledByDefaultSubmit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-submit')),
    );
    expect(incomplete.countFor(SolarAssetType.battery), 1);
    expect(incomplete.countFor(SolarAssetType.inverter), 1);
    expect(incomplete.countFor(SolarAssetType.panel), 1);
    expect(enabledByDefaultSubmit.isDisabled, isFalse);
    expect(find.byKey(const ValueKey('solar-installation-completion-card')),
        findsOneWidget);
    expect(find.byType(FileUploadWidget), findsOneWidget);
    expect(find.byKey(const ValueKey('solar-completion-certificate')),
        findsOneWidget);
    expect(
        find.byKey(const ValueKey('solar-handover-document')), findsOneWidget);
    expect(find.byKey(const ValueKey('solar-installation-images')),
        findsOneWidget);

    final complete = SolarInstallationDraft.prefilled(
      facility: facilityReportSamples.first,
      mode: SolarWorkflowMode.newReport,
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: OverallAssetSummaryPage(draft: complete),
      ),
    );
    final enabledSubmit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-submit')),
    );
    expect(enabledSubmit.isDisabled, isFalse);
  });

  testWidgets('add new asset assigns injected scanner result directly', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final draft = SolarInstallationDraft(
      facility: facilityReportSamples.first,
      mode: SolarWorkflowMode.newReport,
    )..setCount(SolarAssetType.panel, 2);
    draft.assets[SolarAssetType.panel]!.warrantyDuration = '5 Years';
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AddNewAssetPage(
          draft: draft,
          assetType: SolarAssetType.panel,
          scanSerial: (_) async => 'SOLAR-QR-001',
        ),
      ),
    );

    expect(find.text('1/2'), findsOneWidget);
    expect(find.text('2/2'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('solar-scan-0')));
    await tester.pump();

    expect(draft.assets[SolarAssetType.panel]!.assets.first.serialNumber,
        'SOLAR-QR-001');
    final secondSerial = find.byKey(const ValueKey('asset-serial-scanner-1'));
    await tester.ensureVisible(secondSerial);
    await tester.pumpAndSettle();
    await tester.tap(secondSerial);
    await tester.pump();
    expect(draft.assets[SolarAssetType.panel]!.assets.last.serialNumber,
        'SOLAR-QR-001');
    expect(find.byType(ImageUploader), findsNWidgets(2));
  });

  testWidgets('shared image uploader matches E4H single-file states', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    SolarFileRef? selected;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: ImageUploader(
            label: 'Click to add photo',
            initialImage: selected,
            pickMedia: (_, __) async => XFile('/tmp/supporting-photo.jpg'),
            onImageSelected: (file) => selected = file,
          ),
        ),
      ),
    );

    final empty = tester.widget<Container>(
      find.byKey(const ValueKey('image-uploader-empty')),
    );
    expect(empty.constraints?.maxHeight, 120);
    final decoration = empty.decoration! as BoxDecoration;
    expect((decoration.border! as Border).top.width, 1);

    await tester.tap(find.byKey(const ValueKey('image-uploader-empty')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('image-uploader-camera')), findsOneWidget);
    expect(find.byKey(const ValueKey('image-uploader-files')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('image-uploader-files')));
    await tester.pumpAndSettle();

    expect(
        find.byKey(const ValueKey('image-uploader-preview')), findsOneWidget);
    final closeInk = tester.widget<InkWell>(
      find.byKey(const ValueKey('image-uploader-remove')),
    );
    final closeContainer = closeInk.child! as Container;
    expect(closeContainer.constraints?.maxWidth, spacer6);
    expect(closeContainer.constraints?.maxHeight, spacer6);

    await tester.tap(find.byKey(const ValueKey('image-uploader-remove')));
    await tester.pump();
    expect(selected, isNull);
    expect(find.byKey(const ValueKey('image-uploader-empty')), findsOneWidget);
  });

  testWidgets('solar media page uses E4H multiple image and video uploaders', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 1200));
    final draft = SolarInstallationDraft(
      facility: facilityReportSamples.first,
      mode: SolarWorkflowMode.newReport,
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: MediaUploadPage(
          draft: draft,
          assetType: SolarAssetType.battery,
        ),
      ),
    );

    expect(find.byType(ImageUploader), findsOneWidget);
    expect(find.byType(VideoUploader), findsOneWidget);
    expect(find.byKey(const ValueKey('image-uploader-empty')), findsOneWidget);
    expect(find.byKey(const ValueKey('video-uploader-empty')), findsOneWidget);
    expect(find.text('Cancel'), findsNothing);
  });

  testWidgets('E4H file uploader shows selection count and preview tile', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    List<SolarFileRef> selected = [];
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: FileUploadWidget(
            label: AppStrings.uploadPdf,
            allowMultiples: true,
            showPreview: true,
            pickFiles: () async => [
              PlatformFile(
                name: 'certificate.pdf',
                size: 10,
                path: '/tmp/certificate.pdf',
              ),
            ],
            onFilesSelected: (files) => selected = files,
          ),
        ),
      ),
    );

    expect(find.text('No File Selected'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('file-uploader-button')));
    await tester.pumpAndSettle();
    expect(find.text('1 Selected'), findsOneWidget);
    expect(find.text('certificate.pdf'), findsOneWidget);
    expect(
        find.byKey(const ValueKey('file-uploader-preview-0')), findsOneWidget);
    expect(selected.single.kind, SolarFileKind.pdf);
  });

  testWidgets('solar asset summary has edit controls only when editable', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 3000));
    final draft = SolarInstallationDraft.prefilled(
      facility: facilityReportSamples.first,
      mode: SolarWorkflowMode.newReport,
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AssetSummaryPage(
          draft: draft,
          assetType: SolarAssetType.inverter,
        ),
      ),
    );
    expect(find.text(AppStrings.edit), findsWidgets);
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsOneWidget);

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: AssetSummaryPage(
          draft: draft,
          assetType: SolarAssetType.inverter,
          readOnly: true,
        ),
      ),
    );
    expect(find.text(AppStrings.edit), findsNothing);
    expect(find.byKey(const ValueKey('solar-fixed-footer')), findsNothing);
  });

  testWidgets('solar completion pages enforce their local requirements', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final draft = SolarInstallationDraft(
      facility: facilityReportSamples.first,
      mode: SolarWorkflowMode.newReport,
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: InstallationCompletionCertificatePage(
          draft: draft,
          readOnly: false,
          pickMedia: (_, __) async => XFile('/tmp/certificate.jpg'),
        ),
      ),
    );
    var submit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-submit')),
    );
    expect(submit.isDisabled, isTrue);
    await tester.tap(find.byKey(const ValueKey('image-uploader-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('image-uploader-files')));
    await tester.pumpAndSettle();
    submit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-submit')),
    );
    expect(submit.isDisabled, isFalse);

    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: InstallationImagesPage(
          draft: draft,
          readOnly: false,
        ),
      ),
    );
    submit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-submit')),
    );
    expect(submit.isDisabled, isTrue);
    expect(find.byType(ImageUploader), findsNWidgets(3));
    for (final requirement in SolarInstallationDraft.imageRequirements) {
      draft.installationImages[requirement] = SolarFileRef(
        name: '$requirement.jpg',
        path: '/tmp/$requirement.jpg',
        kind: SolarFileKind.image,
      );
    }
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: InstallationImagesPage(
          draft: draft,
          readOnly: false,
        ),
      ),
    );
    submit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('solar-footer-submit')),
    );
    expect(submit.isDisabled, isFalse);
  });

  testWidgets('machine form renders its DIGIT fields and fixed actions', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: MachineFormPage(sample: facilityReportSamples[1]),
      ),
    );

    expect(find.byKey(const ValueKey('machine-form-card')), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-form-footer')), findsOneWidget);
    expect(find.byKey(const ValueKey('po-number-field')), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-serial-field')), findsOneWidget);
    expect(find.byKey(const ValueKey('invoice-number-field')), findsOneWidget);
    expect(
        find.byKey(const ValueKey('machine-capacity-field')), findsOneWidget);
    expect(find.byKey(const ValueKey('warranty-years-field')), findsOneWidget);
    expect(find.byKey(const ValueKey('electric-board-picker')), findsOneWidget);
    expect(find.byKey(const ValueKey('demo-video-picker')), findsOneWidget);
    expect(find.byKey(const ValueKey('end-user-photo-picker')), findsOneWidget);
    expect(find.byKey(const ValueKey('trained-yes')), findsOneWidget);
    expect(find.byKey(const ValueKey('trained-no')), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-otp-field')), findsOneWidget);

    final submit = tester.widget<DigitButton>(
      find.byKey(const ValueKey('submit-machine-report-button')),
    );
    expect(submit.isDisabled, isTrue);
  });

  testWidgets('machine image picker matches E4H states and handles errors', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    var callCount = 0;
    XFile? selected;

    Future<XFile?> picker(MachineMediaKind kind, ImageSource source) async {
      callCount++;
      if (callCount == 1) return null;
      if (callCount == 3) throw Exception('picker failed');
      return XFile('/tmp/photo-$callCount.jpg', name: 'photo-$callCount.jpg');
    }

    Widget buildPicker() => MaterialApp(
          theme: DigitTheme.instance.mobileTheme,
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) => MachineMediaPicker(
                kind: MachineMediaKind.image,
                selectedFile: selected,
                pickMedia: picker,
                onChanged: (file) => setState(() => selected = file),
              ),
            ),
          ),
        );

    await tester.pumpWidget(buildPicker());
    final uploadControl = tester.widget<Container>(
      find.byKey(const ValueKey('machine-media-upload-control')),
    );
    expect(uploadControl.constraints?.maxHeight, 120);
    final uploadDecoration = uploadControl.decoration! as BoxDecoration;
    final uploadBorder = uploadDecoration.border! as Border;
    expect(uploadBorder.top.width, 1);
    expect(
      uploadBorder.top.color,
      const DigitColors().light.genericInputBorder,
    );
    final cameraIcon = tester.widget<Icon>(find.byIcon(Icons.camera_enhance));
    expect(cameraIcon.size, spacer10);
    expect(cameraIcon.color, const DigitColors().light.primary1);
    expect(find.text(AppStrings.takePhoto), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('machine-media-empty')));
    await tester.pumpAndSettle();
    final galleryIcon = tester.widget<Icon>(find.byIcon(Icons.perm_media));
    expect(galleryIcon.size, spacer10);
    expect(galleryIcon.color, const DigitColors().light.primary1);
    await tester.tap(find.byKey(const ValueKey('machine-picker-camera')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('machine-media-empty')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('machine-media-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('machine-picker-camera')));
    await tester.pumpAndSettle();
    final imagePreview = tester.widget<AspectRatio>(
      find.byKey(const ValueKey('machine-media-image-preview')),
    );
    expect(imagePreview.aspectRatio, 3 / 2);
    expect(find.text('photo-2.jpg'), findsNothing);
    expect(find.byKey(const ValueKey('machine-media-replace')), findsNothing);
    expect(
      tester.getSize(find.byKey(const ValueKey('machine-media-remove'))),
      const Size(spacer6, spacer6),
    );

    await tester.tap(find.byKey(const ValueKey('machine-media-remove')));
    await tester.pump();
    expect(find.byKey(const ValueKey('machine-media-empty')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('machine-media-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('machine-picker-camera')));
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.mediaPickerError), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-media-error')), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-media-empty')), findsOneWidget);
  });

  testWidgets('machine video picker uses the E4H video tile', (tester) async {
    setMobileViewport(tester, const Size(390, 844));
    XFile? selected;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => MachineMediaPicker(
              kind: MachineMediaKind.video,
              selectedFile: selected,
              pickMedia: (_, __) async =>
                  XFile('/tmp/demo.mp4', name: 'demo.mp4'),
              onChanged: (file) => setState(() => selected = file),
            ),
          ),
        ),
      ),
    );

    expect(find.byIcon(Icons.videocam), findsOneWidget);
    expect(find.text(AppStrings.takeVideo), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('machine-media-empty')));
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.video_library), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('machine-picker-files')));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('machine-media-video-tile')),
      findsOneWidget,
    );
    expect(find.byIcon(Icons.video_file), findsOneWidget);
    expect(find.text('demo.mp4'), findsOneWidget);
    expect(find.byKey(const ValueKey('machine-media-replace')), findsNothing);
    expect(
      tester.getSize(find.byKey(const ValueKey('machine-media-remove'))),
      const Size(spacer6, spacer6),
    );
  });

  testWidgets('machine picker shows opening state and ignores duplicate taps', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));
    final pendingPick = Completer<XFile?>();
    var pickCount = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: MachineMediaPicker(
            kind: MachineMediaKind.image,
            selectedFile: null,
            pickMedia: (_, __) {
              pickCount++;
              return pendingPick.future;
            },
            onChanged: (_) {},
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('machine-media-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('machine-picker-camera')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const ValueKey('machine-media-opening')), findsOneWidget);
    expect(pickCount, 1);

    await tester.tap(find.byKey(const ValueKey('machine-media-empty')));
    await tester.pump();
    expect(pickCount, 1);
    expect(find.byKey(const ValueKey('machine-picker-camera')), findsNothing);

    pendingPick.complete(null);
    await tester.pump();
    expect(find.byKey(const ValueKey('machine-media-opening')), findsNothing);
  });

  testWidgets('machine draft and completed submit use success panels', (
    tester,
  ) async {
    setMobileViewport(tester, const Size(390, 844));

    Future<void> pumpForm() => tester.pumpWidget(
          MaterialApp(
            key: UniqueKey(),
            theme: DigitTheme.instance.mobileTheme,
            home: MachineFormPage(
              sample: facilityReportSamples[1],
              pickMedia: (kind, source) async => XFile(
                kind == MachineMediaKind.image
                    ? '/tmp/photo.jpg'
                    : '/tmp/video.mp4',
                name:
                    kind == MachineMediaKind.image ? 'photo.jpg' : 'video.mp4',
              ),
            ),
          ),
        );

    await pumpForm();
    await tester.ensureVisible(
      find.byKey(const ValueKey('save-draft-button')),
    );
    await tester.tap(find.byKey(const ValueKey('save-draft-button')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.byType(MachineReportSuccessPage), findsOneWidget);
    expect(find.text(AppStrings.dataSavedSuccessfully), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget.runtimeType.toString() == 'Lottie',
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
    await tester.tap(
      find.byKey(const ValueKey('machine-success-home-button')),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.byType(HomePage), findsOneWidget);
    expect(find.byType(MachineFormPage), findsNothing);

    await pumpForm();
    Future<void> enter(String key, String value) async {
      await tester.enterText(
        find.descendant(
          of: find.byKey(ValueKey(key)),
          matching: find.byType(EditableText),
        ),
        value,
      );
      await tester.pump();
    }

    await enter('po-number-field', 'PO-100');
    await enter('machine-capacity-field', '500 W');
    await enter('warranty-years-field', '2');

    Future<void> scrollIntoView(Finder target) async {
      final center = tester.getCenter(target);
      if (center.dy > 650) {
        await tester.drag(
          find.byType(CustomScrollView),
          Offset(0, 600 - center.dy),
        );
        await tester.pumpAndSettle();
      }
    }

    Future<void> selectMedia(String key) async {
      final target = find.byKey(ValueKey(key));
      await scrollIntoView(target);
      await tester.tap(target);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('machine-picker-files')));
      await tester.pumpAndSettle();
    }

    await selectMedia('electric-board-picker');
    await selectMedia('demo-video-picker');
    await selectMedia('end-user-photo-picker');

    await scrollIntoView(find.byKey(const ValueKey('trained-no')));
    await tester.tap(find.byKey(const ValueKey('trained-no')));
    await tester.pump();
    expect(find.byKey(const ValueKey('machine-otp-field')), findsOneWidget);
    expect(
      tester
          .widget<DigitButton>(
            find.byKey(const ValueKey('submit-machine-report-button')),
          )
          .isDisabled,
      isTrue,
    );

    await enter('machine-otp-field', '1234');
    await scrollIntoView(find.byKey(const ValueKey('verify-otp-button')));
    await tester.tap(find.byKey(const ValueKey('verify-otp-button')));
    await tester.pump();
    expect(find.byKey(const ValueKey('otp-verified-message')), findsOneWidget);
    expect(
      tester
          .widget<DigitButton>(
            find.byKey(const ValueKey('submit-machine-report-button')),
          )
          .isDisabled,
      isFalse,
    );

    await enter('machine-otp-field', '12345');
    expect(find.byKey(const ValueKey('otp-verified-message')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('verify-otp-button')));
    await tester.pump();
    await tester.tap(
      find.byKey(const ValueKey('submit-machine-report-button')),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.text(AppStrings.submittedSuccessfully), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) => widget.runtimeType.toString() == 'Lottie',
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('machine success screens match E4H panel and DIGIT footer', (
    tester,
  ) async {
    for (final mode in MachineReportSuccessMode.values) {
      setMobileViewport(tester, const Size(390, 844));
      await tester.pumpWidget(
        MaterialApp(
          key: ValueKey(mode),
          theme: DigitTheme.instance.mobileTheme,
          home: MachineReportSuccessPage(mode: mode),
        ),
      );
      await tester.pump(const Duration(milliseconds: 600));

      expect(find.byType(AppBar), findsNothing);
      expect(find.byType(PanelCard), findsOneWidget);
      expect(find.byType(PoweredByDigit), findsOneWidget);

      final panelCard = tester.widget<PanelCard>(find.byType(PanelCard));
      expect(panelCard.type, PanelType.success);
      expect(panelCard.animate, isTrue);
      expect(panelCard.repeat, isTrue);
      expect(panelCard.actions, hasLength(1));
      expect(panelCard.actions!.single.type, DigitButtonType.primary);
      expect(panelCard.actions!.single.size, DigitButtonSize.large);
      expect(panelCard.actions!.single.mainAxisSize, isNull);

      final panelPadding = tester.widget<Padding>(
        find.byKey(const ValueKey('machine-success-panel-padding')),
      );
      expect(panelPadding.padding, const EdgeInsets.all(spacer2));

      final footerPadding = tester.widget<Padding>(
        find.byKey(const ValueKey('machine-success-footer')),
      );
      expect(footerPadding.padding, const EdgeInsets.only(bottom: spacer2));

      final lottie = find.byWidgetPredicate(
        (widget) => widget.runtimeType.toString() == 'Lottie',
      );
      expect(lottie, findsOneWidget);
      expect(tester.getSize(lottie), const Size(80, 80));
      expect(tester.takeException(), isNull);
    }
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

      for (final page in <Widget>[
        const InstallationReportHomePage(),
        const NewReportFacilitiesPage(),
        const PendingApprovalPage(),
        const ResubmissionNeededPage(),
        const ApprovedReportsPage(),
        MachineFormPage(sample: facilityReportSamples[1]),
        const MachineReportSuccessPage(
          mode: MachineReportSuccessMode.draft,
        ),
        const MachineReportSuccessPage(
          mode: MachineReportSuccessMode.submitted,
        ),
      ]) {
        await tester.pumpWidget(
          MaterialApp(
            key: UniqueKey(),
            theme: DigitTheme.instance.mobileTheme,
            home: page,
          ),
        );
        await tester.pump();
        expect(
          tester.takeException(),
          isNull,
          reason: '${page.runtimeType} overflow at $size',
        );
      }
    }
  });
}
