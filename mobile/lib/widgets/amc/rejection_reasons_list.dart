import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/theme/spacers.dart';
import 'package:flutter/material.dart';

import '../../model/amc/scheduled_visit.dart';
import '../../utils/extensions.dart';
import '../../utils/i18_key_constants.dart' as i18;

/// E4H `RejectionReasonsList` (from `pages/submit_for_approval.dart`).
class RejectionReasonsList extends StatelessWidget {
  final List<AmcComment>? comments;
  final bool excludeStandardTypes;
  final bool showSectionLabel;

  const RejectionReasonsList({
    super.key,
    required this.comments,
    this.excludeStandardTypes = false,
    this.showSectionLabel = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    if (comments == null || comments!.isEmpty) {
      return const SizedBox.shrink();
    }

    final filtered = excludeStandardTypes
        ? comments!.where((c) {
            final t = c.assetType?.toLowerCase().trim();
            return t != 'inverter' && t != 'battery' && t != 'panel';
          }).toList()
        : comments!;

    if (filtered.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        const SizedBox(height: spacer2),
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: theme.colorTheme.paper.secondary,
            border: Border.all(color: theme.colorTheme.generic.divider),
            borderRadius: BorderRadius.circular(spacer1),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(
                horizontal: spacer3, vertical: spacer4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.translate(i18.submitForApproval.rejectionReasons),
                  style: textTheme.headingS
                      .copyWith(color: theme.colorTheme.text.primary),
                ),
                const SizedBox(height: spacer5),
                for (var i = 0; i < filtered.length; i++) ...[
                  _oneReason(context, filtered[i], i + 1),
                  if (i < filtered.length - 1) const SizedBox(height: spacer4),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _oneReason(BuildContext context, AmcComment comment, int index) {
    final theme = Theme.of(context);
    final labelStyle = theme
        .digitTextTheme(context)
        .label
        .copyWith(color: theme.colorTheme.primary.primary2);
    final valueStyle = theme
        .digitTextTheme(context)
        .label
        .copyWith(color: theme.colorTheme.text.primary);

    final reason = comment.reason;
    final details = comment.displayComment;
    final sectionLabel = comment.sectionLabel?.trim();
    final reasonText =
        reason ?? '${context.translate(i18.submitForApproval.reason)} $index';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showSectionLabel &&
            sectionLabel != null &&
            sectionLabel.isNotEmpty) ...[
          Text(sectionLabel, style: valueStyle),
          const SizedBox(height: spacer2),
        ],
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: theme.colorTheme.primary.primary2),
            borderRadius: BorderRadius.circular(spacer2),
            color: theme.colorTheme.paper.primary,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(
                vertical: spacer1, horizontal: spacer3),
            child: Text(reasonText, style: labelStyle),
          ),
        ),
        const SizedBox(height: spacer2),
        Text(details, style: valueStyle),
      ],
    );
  }
}
