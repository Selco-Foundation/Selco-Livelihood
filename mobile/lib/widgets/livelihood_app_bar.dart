import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;

class LivelihoodAppBar extends StatelessWidget implements PreferredSizeWidget {
  const LivelihoodAppBar({
    super.key,
    this.showMenu = false,
    this.onMenuPressed,
  });

  final bool showMenu;
  final VoidCallback? onMenuPressed;

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
      toolbarHeight: spacer12,
      leading: showMenu
          ? GestureDetector(
              onTap: onMenuPressed,
              child: IconButton(
                key: const ValueKey('home-menu-button'),
                icon: const Icon(
                  Icons.menu,
                  color: Colors.white,
                  size: spacer6,
                ),
                onPressed: onMenuPressed,
                tooltip: 'Menu',
              ),
            )
          : null,
      title: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          Text(
            context.translate(i18.common.appName),
            style: textTheme.headingM.copyWith(
              color: const DigitColors().light.paperPrimary,
            ),
          ),
          const SizedBox(width: spacer2),
          Container(
            key: const ValueKey('navbar-title-divider'),
            width: 1,
            height: spacer6,
            color: const DigitColors().light.paperPrimary,
          ),
          const SizedBox(width: spacer2),
          Expanded(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                context.translate(i18.common.appDescriptor),
                maxLines: 1,
                softWrap: false,
                style: textTheme.bodyS.copyWith(
                  color: const DigitColors().light.paperPrimary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
