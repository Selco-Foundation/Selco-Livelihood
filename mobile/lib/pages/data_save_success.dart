import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/panel_cards.dart';
import 'package:flutter/material.dart';

import '../app/app_strings.dart';
import '../models/solar_installation_draft.dart';
import '../widgets/solar_workflow_widgets.dart';
import 'overall_asset_summary.dart';

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
              title: AppStrings.dataSavedSuccessfully,
              description: AppStrings.dataSavedDescription,
              actions: [
                DigitButton(
                  key: const ValueKey('solar-success-next'),
                  label: AppStrings.next,
                  type: DigitButtonType.primary,
                  size: DigitButtonSize.large,
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => OverallAssetSummaryPage(
                        draft: draft,
                        pickMedia: pickMedia,
                      ),
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
