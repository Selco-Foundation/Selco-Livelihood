import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';

import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../repositories/asset_mdms_repository.dart';
import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;

class WorkflowRejectionReasons extends StatelessWidget {
  const WorkflowRejectionReasons({
    super.key,
    required this.comments,
    this.panelKey,
    this.surfaceKey,
    this.showSectionLabel = false,
  });

  final List<WorkflowComment> comments;
  final Key? panelKey;
  final Key? surfaceKey;
  final bool showSectionLabel;

  String _reason(WorkflowComment comment, int index) {
    final reason = comment.reason;
    if (reason?.isNotEmpty == true) return reason!;
    final code = comment.reasonCode;
    if (code?.isNotEmpty == true) {
      return assetMdmsRepository.rejectionReasonName(code!) ?? code;
    }
    return 'Reason ${index + 1}';
  }

  String? _sectionTitle(
    BuildContext context,
    WorkflowComment comment,
  ) {
    final sectionLabel = comment.sectionLabel?.trim();
    if (sectionLabel == null || sectionLabel.isEmpty) return null;

    const prefix = 'INSTALLATION_IMAGE_';
    final assetType = comment.assetType?.trim().toUpperCase() ?? '';
    final installationImageCode = assetType.startsWith(prefix)
        ? assetType.substring(prefix.length)
        : sectionLabel.toUpperCase().startsWith(prefix)
            ? sectionLabel.substring(prefix.length)
            : null;

    if (installationImageCode != null) {
      for (final requirement in assetMdmsRepository.installationImages) {
        if (requirement.code.trim().toUpperCase() != installationImageCode) {
          continue;
        }
        final shortTitle = requirement.shortTitle?.trim();
        if (shortTitle?.isNotEmpty == true) return shortTitle;
        final description = requirement.description.trim();
        if (description.isNotEmpty) return description;
      }
    }

    final isLocalizationCode = sectionLabel == sectionLabel.toUpperCase() &&
        !sectionLabel.contains(' ');
    return isLocalizationCode ? context.translate(sectionLabel) : sectionLabel;
  }

  Widget _reasonCard(
    BuildContext context,
    WorkflowComment comment,
    int index,
  ) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final sectionTitle =
        showSectionLabel ? _sectionTitle(context, comment) : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (sectionTitle != null) ...[
          Text(
            sectionTitle,
            style: textTheme.label.copyWith(
              color: theme.colorTheme.text.primary,
            ),
          ),
          const SizedBox(height: spacer2),
        ],
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: theme.colorTheme.primary.primary2),
            borderRadius: BorderRadius.circular(spacer2),
            color: theme.colorTheme.paper.primary,
          ),
          padding: const EdgeInsets.symmetric(
            vertical: spacer1,
            horizontal: spacer3,
          ),
          child: Text(
            _reason(comment, index),
            style: textTheme.label.copyWith(
              color: theme.colorTheme.primary.primary2,
            ),
          ),
        ),
        if (comment.details.isNotEmpty) ...[
          const SizedBox(height: spacer2),
          Text(
            comment.details,
            style: textTheme.label.copyWith(
              color: theme.colorTheme.text.primary,
            ),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (comments.isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    return Column(
      key: panelKey,
      children: [
        const SizedBox(height: spacer2),
        Container(
          key: surfaceKey,
          width: double.infinity,
          decoration: BoxDecoration(
            color: theme.colorTheme.paper.secondary,
            border: Border.all(color: theme.colorTheme.generic.divider),
            borderRadius: BorderRadius.circular(spacer1),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: spacer3,
            vertical: spacer4,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.translate(i18.installationReport.rejectionReasons),
                style: textTheme.headingS.copyWith(
                  color: theme.colorTheme.text.primary,
                ),
              ),
              const SizedBox(height: spacer5),
              for (final indexed in comments.asMap().entries) ...[
                _reasonCard(context, indexed.value, indexed.key),
                if (indexed.key < comments.length - 1)
                  const SizedBox(height: spacer4),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
