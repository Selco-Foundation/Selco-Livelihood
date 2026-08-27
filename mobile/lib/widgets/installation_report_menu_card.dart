import 'package:badges/badges.dart' as badges;
import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';

class InstallationReportMenuCard extends StatelessWidget {
  const InstallationReportMenuCard({
    super.key,
    required this.icon,
    required this.heading,
    required this.description,
    required this.count,
    required this.color,
    required this.onPressed,
    this.accentColor,
  });

  final IconData icon;
  final String heading;
  final String description;
  final String count;
  final Color color;
  final Color? accentColor;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    return Stack(
      children: [
        DigitCard(
          onPressed: onPressed,
          margin: const EdgeInsets.only(bottom: spacer4),
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Icon(icon, color: color, size: spacer8),
                    const SizedBox(width: spacer2),
                    Expanded(
                      child: Text(
                        heading,
                        maxLines: 2,
                        style: textTheme.headingL.copyWith(color: color),
                      ),
                    ),
                    const SizedBox(width: spacer2),
                    badges.Badge(
                      key: const ValueKey('report-menu-count-badge'),
                      badgeStyle: badges.BadgeStyle(
                        shape: badges.BadgeShape.square,
                        badgeColor: theme.colorTheme.alert.error,
                        padding: const EdgeInsets.symmetric(
                          horizontal: spacer3,
                          vertical: spacer1,
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      badgeContent: Text(
                        count,
                        style: textTheme.bodyS.copyWith(
                          color: theme.colorTheme.paper.primary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: spacer3),
                Text(
                  description,
                  style: textTheme.bodyL.copyWith(
                    color: accentColor ?? const DigitColors().light.textPrimary,
                  ),
                ),
              ],
            ),
          ],
        ),
        if (accentColor != null)
          Positioned(
            left: 0,
            top: 0,
            bottom: spacer4,
            child: Container(
              key: const ValueKey('report-menu-accent-line'),
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
