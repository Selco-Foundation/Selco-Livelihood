import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/atoms/digit_divider.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';

import '../router/app_router.dart';
import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../widgets/footer_button.dart';
import '../widgets/livelihood_app_bar.dart';

@RoutePage()
class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key});

  void _openLogin(BuildContext context) {
    context.router.replace(const LoginRoute());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: const LivelihoodAppBar(),
      body: ScrollableContent(
        key: const ValueKey('welcome-scroll-view'),
        enableFixedDigitButton: true,
        backgroundColor: theme.colorTheme.generic.background,
        footer: FooterButton(
          text: context.translate(i18.welcome.proceed),
          onPressed: () => _openLogin(context),
        ),
        children: const [Expanded(child: _WelcomeContent())],
      ),
    );
  }
}

class _WelcomeItem {
  const _WelcomeItem({
    required this.title,
    required this.description,
    required this.imagePath,
  });

  final String title;
  final String description;
  final String imagePath;
}

class _WelcomeContent extends StatelessWidget {
  const _WelcomeContent();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).digitTextTheme(context);
    final items = <_WelcomeItem>[
      _WelcomeItem(
        title: context.translate(i18.welcome.viewFacilitiesTitle),
        description: context.translate(i18.welcome.viewFacilitiesDescription),
        imagePath: 'assets/images/welcome_1.png',
      ),
      _WelcomeItem(
        title: context.translate(i18.welcome.createReportsTitle),
        description: context.translate(i18.welcome.createReportsDescription),
        imagePath: 'assets/images/welcome_2.png',
      ),
      _WelcomeItem(
        title: context.translate(i18.welcome.saveReportsTitle),
        description: context.translate(i18.welcome.saveReportsDescription),
        imagePath: 'assets/images/welcome_3.png',
      ),
      _WelcomeItem(
        title: context.translate(i18.welcome.submitForApprovalTitle),
        description:
            context.translate(i18.welcome.submitForApprovalDescription),
        imagePath: 'assets/images/welcome_4.png',
      ),
      _WelcomeItem(
        title: context.translate(i18.welcome.editReportsTitle),
        description: context.translate(i18.welcome.editReportsDescription),
        imagePath: 'assets/images/welcome_5.png',
      ),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(
        vertical: spacer4,
        horizontal: spacer2,
      ),
      child: DigitCard(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.translate(i18.welcome.welcomeTitle),
                style: textTheme.headingXl.copyWith(
                  color: const DigitColors().light.primary2,
                ),
              ),
              const SizedBox(height: spacer3),
              Text(
                context.translate(i18.welcome.welcomeDescription),
                style: textTheme.bodyL,
              ),
              ...items.asMap().entries.map((entry) {
                final index = entry.key;
                final item = entry.value;

                return Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: spacer5),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Image.asset(
                            item.imagePath,
                            key: ValueKey(item.imagePath),
                            height: spacer12 * 2,
                            width: spacer12 * 2,
                          ),
                          const SizedBox(width: spacer6),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.title,
                                  style: textTheme.headingS.copyWith(
                                    color: const DigitColors().light.primary2,
                                  ),
                                ),
                                const SizedBox(height: spacer3),
                                Padding(
                                  padding: const EdgeInsets.only(
                                    right: spacer7,
                                  ),
                                  child: Text(
                                    item.description,
                                    style: textTheme.headingXS.copyWith(
                                      color: const DigitColors()
                                          .light
                                          .textSecondary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (index != items.length - 1)
                      const DigitDivider(dividerType: DividerType.small),
                  ],
                );
              }),
            ],
          ),
        ],
      ),
    );
  }
}
