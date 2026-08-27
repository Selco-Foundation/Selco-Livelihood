import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/atoms/digit_divider.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';

import '../app/app_strings.dart';
import '../router/app_router.dart';
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
          text: AppStrings.proceed,
          onPressed: () => _openLogin(context),
        ),
        children: const [Expanded(child: _WelcomeContent())],
      ),
    );
  }
}

class _WelcomeContent extends StatelessWidget {
  const _WelcomeContent();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).digitTextTheme(context);
    const items = AppStrings.welcomeItems;

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
                AppStrings.welcomeTitle,
                style: textTheme.headingXl.copyWith(
                  color: const DigitColors().light.primary2,
                ),
              ),
              const SizedBox(height: spacer3),
              Text(
                AppStrings.welcomeDescription,
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
