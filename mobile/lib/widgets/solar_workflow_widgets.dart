import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/atoms/digit_stepper.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../router/app_router.dart';
import '../model/solar_installation_draft.dart';
import 'livelihood_app_bar.dart';
import 'report_navigation_header.dart';

typedef SolarPickMedia = Future<XFile?> Function(
  SolarFileKind kind,
  ImageSource source,
);

class SolarWorkflowScaffold extends StatelessWidget {
  const SolarWorkflowScaffold({
    super.key,
    required this.pageKey,
    required this.child,
    this.stepIndex,
    this.footer,
    this.onBack,
  });

  final String pageKey;
  final Widget child;
  final int? stepIndex;
  final Widget? footer;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: LivelihoodAppBar(
        showMenu: true,
        onMenuPressed: () => ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.translate(i18.installationReportHome.reportActionNotConnected))),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: spacer2),
        child: ScrollableContent(
          key: ValueKey(pageKey),
          enableFixedDigitButton: footer != null,
          backgroundColor: theme.colorTheme.generic.background,
          header: ReportNavigationHeader(
            onBackPressed: onBack ?? () => context.router.maybePop(),
          ),
          footer: footer,
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.symmetric(
                horizontal: spacer2,
                vertical: spacer4,
              ),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (stepIndex != null) ...[
                      Center(
                        child: SolarWorkflowStepper(activeIndex: stepIndex!),
                      ),
                      const SizedBox(height: spacer4),
                    ],
                    child,
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SolarWorkflowStepper extends StatelessWidget {
  const SolarWorkflowStepper({super.key, required this.activeIndex});

  final int activeIndex;

  @override
  Widget build(BuildContext context) => SizedBox(
        key: const ValueKey('solar-workflow-stepper'),
        height: spacer8,
        width: MediaQuery.sizeOf(context).width * .9,
        child: DigitStepper(
          activeIndex: activeIndex.clamp(0, 5),
          stepperList: List.generate(6, (_) => const StepperData()),
          stepperDirection: Axis.horizontal,
          inverted: true,
        ),
      );
}

class SolarFooterButton extends StatelessWidget {
  const SolarFooterButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isDisabled = false,
    this.type = DigitButtonType.primary,
  });

  final String label;
  final VoidCallback onPressed;
  final bool isDisabled;
  final DigitButtonType type;

  @override
  Widget build(BuildContext context) => DigitCard(
        key: const ValueKey('solar-fixed-footer'),
        margin: const EdgeInsets.only(top: spacer2),
        children: [
          DigitButton(
            key: ValueKey('solar-footer-${label.toLowerCase()}'),
            mainAxisSize: MainAxisSize.max,
            label: label,
            isDisabled: isDisabled,
            type: type,
            size: DigitButtonSize.large,
            onPressed: onPressed,
          ),
        ],
      );
}
