import 'package:digit_ui_components/enum/app_enums.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/theme/spacers.dart';
import 'package:digit_ui_components/widgets/atoms/digit_button.dart';
import 'package:digit_ui_components/widgets/atoms/digit_divider.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../utils/amc/amc_utils.dart';
import '../../utils/extensions.dart';
import '../../utils/i18_key_constants.dart' as i18;
import 'report_bookmarks.dart';
import 'report_detail_row.dart';

/// E4H `InboxReportCard` (AMC usage: `isAmc: true`). E4H wraps it in a
/// rectification-aware card; AMC visits are never rectification sites, so
/// the plain card is used.
class InboxReportCard extends StatelessWidget {
  final bool isBookmarked;
  final bool isSavingBookmark;
  final VoidCallback? onToggleBookmark;
  final String? title;
  final String? status;
  final String? state;
  final String? district;
  final String? block;
  final DateTime? dateAssigned;
  final String? dateLabelKey;
  final Function() onPress;
  final bool? isAmc;
  final bool? isOtp;
  final int? visitNumber;
  final int? durationMonths;
  final int? visitFrequencyMonths;

  const InboxReportCard({
    super.key,
    this.isBookmarked = false,
    this.isSavingBookmark = false,
    this.onToggleBookmark,
    this.title,
    this.status,
    this.state,
    this.district,
    this.block,
    required this.dateAssigned,
    this.dateLabelKey,
    required this.onPress,
    this.isAmc = false,
    this.isOtp = false,
    this.visitNumber,
    this.durationMonths,
    this.visitFrequencyMonths,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final date = dateAssigned;
    final formattedDate =
        date == null ? '—' : DateFormat('dd/MM/yy').format(date);

    return DigitCard(children: [
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
                child: Text(
              "$title",
              style: textTheme.headingM
                  .copyWith(color: theme.colorTheme.primary.primary2),
            )),
            if (onToggleBookmark != null)
              ReportBookmarkButton(
                  selected: isBookmarked,
                  saving: isSavingBookmark,
                  onPressed: onToggleBookmark,
                  addLabelKey: i18.amcBookmarks.add,
                  removeLabelKey: i18.amcBookmarks.remove),
          ]),
          const SizedBox(height: spacer4),
          const DigitDivider(dividerType: DividerType.small),
          ReportDetailRow(
            label: context.translate(i18.amcCommon.status),
            value: _detailText(
              context.translate(status ?? ''),
              textTheme,
              theme,
            ),
          ),
          ReportDetailRow(
            label: reportDateLabel(dateLabelKey ?? i18.amcCommon.submissionDate,
                context.translate),
            value: _detailText(formattedDate, textTheme, theme),
          ),
          ReportDetailRow(
            label: context.translate(i18.amcCommon.state),
            value: _detailText(_displayValue(state), textTheme, theme),
          ),
          ReportDetailRow(
            label: context.translate(i18.amcCommon.district),
            value: _detailText(_displayValue(district), textTheme, theme),
          ),
          ReportDetailRow(
            label: context.translate(i18.amcCommon.block),
            value: _detailText(_displayValue(block), textTheme, theme),
          ),
          if (isAmc == true)
            ReportDetailRow(
              label: context.translate(i18.amcSelectFacility.amcNumber),
              value: _detailText(
                formatAmcNumber(
                  visitNumber,
                  durationMonths,
                  visitFrequencyMonths,
                ),
                textTheme,
                theme,
              ),
            ),
          const SizedBox(height: spacer4),
          DigitButton(
              mainAxisSize: MainAxisSize.max,
              label: !(isAmc!)
                  ? context.translate(i18.sharedCards.viewSummary)
                  : isOtp!
                      ? context.translate(i18.sharedCards.submitForApproval)
                      : context.translate(i18.sharedCards.viewReport),
              onPressed: onPress,
              type: DigitButtonType.secondary,
              size: DigitButtonSize.large),
        ],
      ),
    ]);
  }

  String _displayValue(String? value) {
    final normalized = value?.trim() ?? '';
    return normalized.isEmpty ? '---' : normalized;
  }

  Widget _detailText(String value, dynamic textTheme, ThemeData theme) {
    return Text(
      value,
      style: textTheme.bodyL.copyWith(color: theme.colorTheme.text.primary),
      softWrap: true,
      overflow: TextOverflow.visible,
    );
  }
}
