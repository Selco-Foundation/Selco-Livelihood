import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';

class HomeItemCard extends StatelessWidget {
  const HomeItemCard({
    super.key,
    required this.label,
    required this.contentColor,
    required this.onPressed,
    this.icon,
    this.count,
    this.accentColor,
    this.labelPadding,
    this.scaleLabelToFit = false,
  }) : assert(
          (icon == null) != (count == null),
          'Provide either an icon or a count.',
        );

  final IconData? icon;
  final String? count;
  final String label;
  final Color contentColor;
  final Color? accentColor;
  final EdgeInsets? labelPadding;
  final bool scaleLabelToFit;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).digitTextTheme(context);

    return Stack(
      children: [
        Positioned.fill(
          child: DigitCard(
            onPressed: onPressed,
            padding: const EdgeInsets.all(spacer1),
            margin: const EdgeInsets.all(spacer2),
            inline: true,
            children: [
              const Padding(padding: EdgeInsets.only(top: spacer1)),
              Align(
                alignment: Alignment.center,
                child: icon != null
                    ? Icon(
                        icon,
                        key: const ValueKey('home-card-icon'),
                        color: contentColor,
                        size: 50,
                      )
                    : SizedBox(
                        key: const ValueKey('home-card-count-position'),
                        height: 50,
                        child: Center(
                          child: Text(
                            count!,
                            style: textTheme.headingXl.copyWith(
                              color: contentColor,
                            ),
                          ),
                        ),
                      ),
              ),
              Align(
                alignment: Alignment.center,
                child: Wrap(
                  children: [
                    Padding(
                      key: const ValueKey('home-card-label-padding'),
                      padding: labelPadding ??
                          const EdgeInsets.symmetric(horizontal: spacer10),
                      child: scaleLabelToFit
                          ? FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                label,
                                maxLines: 2,
                                softWrap: false,
                                style: textTheme.headingS.copyWith(
                                  color: contentColor,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            )
                          : Text(
                              label,
                              style: textTheme.headingS.copyWith(
                                color: contentColor,
                              ),
                              textAlign: TextAlign.center,
                            ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (accentColor != null)
          Positioned(
            left: spacer2,
            top: spacer2,
            bottom: spacer2,
            child: Container(
              key: const ValueKey('home-card-status-line'),
              width: 2,
              decoration: BoxDecoration(
                color: accentColor,
                borderRadius: const BorderRadius.horizontal(
                  left: Radius.circular(spacer1),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
