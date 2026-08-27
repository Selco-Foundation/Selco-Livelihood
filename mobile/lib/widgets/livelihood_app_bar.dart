import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';

import '../app/app_strings.dart';

class LivelihoodAppBar extends StatelessWidget implements PreferredSizeWidget {
  const LivelihoodAppBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(spacer12);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    return AppBar(
      automaticallyImplyLeading: false,
      foregroundColor: theme.colorTheme.paper.primary,
      backgroundColor: theme.colorTheme.primary.primary2,
      title: FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerLeft,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            Text(
              AppStrings.appName,
              style: textTheme.headingM.copyWith(
                color: const DigitColors().light.paperPrimary,
              ),
            ),
            const SizedBox(width: spacer2),
            Container(
              width: 1,
              height: spacer6,
              color: const DigitColors().light.paperPrimary,
            ),
            const SizedBox(width: spacer2),
            Text(
              AppStrings.appDescriptor,
              style: textTheme.bodyS.copyWith(
                color: const DigitColors().light.paperPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
