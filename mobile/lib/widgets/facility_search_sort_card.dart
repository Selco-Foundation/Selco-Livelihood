import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/models/RadioButtonModel.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/atoms/pop_up_card.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:digit_ui_components/widgets/molecules/show_pop_up.dart';
import 'package:flutter/material.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;

class FacilitySearchSortCard extends StatefulWidget {
  const FacilitySearchSortCard({
    super.key,
    required this.onSearchChanged,
    required this.onSortApplied,
  });

  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String> onSortApplied;

  @override
  State<FacilitySearchSortCard> createState() => _FacilitySearchSortCardState();
}

class _FacilitySearchSortCardState extends State<FacilitySearchSortCard> {
  String? _sortDirection;

  void _showSortPopup() {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    showCustomPopup(
      context: context,
      builder: (popupContext) => StatefulBuilder(
        builder: (popupContext, popupSetState) => Popup(
          key: const ValueKey('facility-sort-popup'),
          onCrossTap: () => Navigator.of(popupContext).pop(),
          title: context.translate(i18.installationReportHome.sortBy),
          type: PopUpType.simple,
          additionalWidgets: [
            Text(
              context.translate(i18.installationReportHome.submissionDate),
              style: textTheme.headingS.copyWith(
                color: theme.colorTheme.text.primary,
              ),
            ),
            RadioList(
              groupValue: _sortDirection ?? '',
              containerPadding: const EdgeInsets.symmetric(
                horizontal: 0,
                vertical: spacer2,
              ),
              onChanged: (value) {
                popupSetState(() => _sortDirection = value.code);
              },
              radioDigitButtons: [
                RadioButtonModel(code: 'DESC', name: context.translate(i18.installationReportHome.newestFirst)),
                RadioButtonModel(code: 'ASC', name: context.translate(i18.installationReportHome.oldestFirst)),
              ],
            ),
            Row(
              children: [
                Expanded(
                  child: DigitButton(
                    key: const ValueKey('sort-clear-button'),
                    label: context.translate(i18.common.clear),
                    onPressed: () {
                      setState(() => _sortDirection = null);
                      Navigator.of(popupContext).pop();
                    },
                    type: DigitButtonType.secondary,
                    size: DigitButtonSize.large,
                    mainAxisSize: MainAxisSize.min,
                  ),
                ),
                const SizedBox(width: spacer5),
                Expanded(
                  child: DigitButton(
                    key: const ValueKey('sort-apply-button'),
                    label: context.translate(i18.common.sort),
                    isDisabled: _sortDirection == null,
                    onPressed: () {
                      Navigator.of(popupContext).pop();
                      widget.onSortApplied(_sortDirection!);
                    },
                    type: DigitButtonType.primary,
                    size: DigitButtonSize.large,
                    mainAxisSize: MainAxisSize.min,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    return DigitCard(
      key: const ValueKey('facility-search-sort-card'),
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.translate(i18.installationReportHome.searchHealthFacility),
              style: textTheme.bodyL.copyWith(
                color: theme.colorTheme.text.primary,
              ),
            ),
            const SizedBox(height: spacer1),
            Row(
              children: [
                Expanded(
                  child: DigitSearchFormInput(
                    key: const ValueKey('facility-search-field'),
                    innerLabel: context.translate(i18.installationReportHome.searchHealthFacility),
                    suffixIcon: Icons.search,
                    onChange: widget.onSearchChanged,
                  ),
                ),
                const SizedBox(width: spacer2),
                InkWell(
                  key: const ValueKey('facility-sort-button'),
                  onTap: _showSortPopup,
                  child: Row(
                    children: [
                      Icon(
                        Icons.import_export,
                        color: theme.colorTheme.primary.primary1,
                        size: spacer8,
                      ),
                      Text(
                        context.translate(i18.common.sort),
                        style: textTheme.headingS.copyWith(
                          color: theme.colorTheme.primary.primary1,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}
