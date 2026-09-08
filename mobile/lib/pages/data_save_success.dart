import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/panel_cards.dart';
import 'package:flutter/material.dart';
// Required by auto_route when expanding the imported SolarPickMedia typedef.
// ignore: unused_import
import 'package:image_picker/image_picker.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../model/solar_installation_draft.dart';
import '../router/app_router.dart';
import '../widgets/solar_workflow_widgets.dart';

@RoutePage()
class DataSaveSuccessPage extends StatelessWidget {
  const DataSaveSuccessPage({
    super.key,
    required this.draft,
    this.pickMedia,
  });

  final SolarInstallationDraft draft;
  final SolarPickMedia? pickMedia;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: ScrollableContent(
        key: const ValueKey('solar-data-saved-success'),
        backgroundColor: theme.colorTheme.generic.background,
        footer: const Padding(
          padding: EdgeInsets.only(bottom: spacer2),
          child: PoweredByDigit(version: ''),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(spacer2),
            child: PanelCard(
              animate: true,
              repeat: true,
              type: PanelType.success,
              title: context.translate(i18.machineForm.dataSavedSuccessfully),
              description:
                  context.translate(i18.machineForm.dataSavedDescription),
              actions: [
                DigitButton(
                  key: const ValueKey('solar-success-next'),
                  label: context.translate(i18.common.next),
                  type: DigitButtonType.primary,
                  size: DigitButtonSize.large,
                  onPressed: () => context.router.push(
                    OverallAssetSummaryRoute(
                      draft: draft,
                      pickMedia: pickMedia,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
