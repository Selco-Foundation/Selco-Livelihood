import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/atoms/digit_divider.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';

import '../app/app_strings.dart';
import '../models/facility_report_sample.dart';

class FacilityReportCard extends StatelessWidget {
  const FacilityReportCard({
    super.key,
    required this.sample,
    required this.mode,
    required this.onAction,
  });

  final FacilityReportSample sample;
  final FacilityReportMode mode;
  final VoidCallback onAction;

  String get _status => switch (mode) {
        FacilityReportMode.newReport => AppStrings.pendingInstallation,
        FacilityReportMode.pendingApproval => AppStrings.pendingApproval,
        FacilityReportMode.resubmissionNeeded =>
          AppStrings.resubmissionNeededSingleLine,
        FacilityReportMode.approved => AppStrings.approved,
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final isNew = mode == FacilityReportMode.newReport;

    return DigitCard(
      key: ValueKey('facility-card-${mode.name}-${sample.title}'),
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              sample.title,
              style: (isNew ? textTheme.headingL : textTheme.headingM).copyWith(
                color: isNew
                    ? theme.colorTheme.text.primary
                    : theme.colorTheme.primary.primary2,
              ),
            ),
            const SizedBox(height: spacer4),
            const DigitDivider(dividerType: DividerType.small),
            _DetailRow(label: AppStrings.status, value: _status),
            if (isNew) ...[
              _DetailRow(
                label: AppStrings.startDate,
                value: sample.startDate,
              ),
              _DetailRow(label: AppStrings.endDate, value: sample.endDate),
            ] else
              _DetailRow(
                label: AppStrings.submissionDate,
                value: sample.submissionDate,
              ),
            _DetailRow(label: AppStrings.state, value: sample.state),
            _DetailRow(label: AppStrings.district, value: sample.district),
            _DetailRow(label: AppStrings.block, value: sample.block),
            if (isNew) _NewReportActions(sample: sample, onAction: onAction),
            if (mode == FacilityReportMode.pendingApproval ||
                mode == FacilityReportMode.approved) ...[
              const SizedBox(height: spacer4),
              DigitButton(
                key: const ValueKey('view-summary-button'),
                mainAxisSize: MainAxisSize.max,
                label: AppStrings.viewSummary,
                onPressed: onAction,
                type: DigitButtonType.secondary,
                size: DigitButtonSize.large,
              ),
            ],
            if (mode == FacilityReportMode.resubmissionNeeded) ...[
              const SizedBox(height: spacer8),
              DigitButton(
                key: const ValueKey('view-details-button'),
                mainAxisSize: MainAxisSize.max,
                label: AppStrings.viewDetails,
                onPressed: onAction,
                type: DigitButtonType.primary,
                size: DigitButtonSize.large,
              ),
              const SizedBox(height: spacer4),
              DigitButton(
                key: const ValueKey('resubmit-button'),
                isDisabled: true,
                mainAxisSize: MainAxisSize.max,
                label: AppStrings.resubmitForApproval,
                onPressed: onAction,
                type: DigitButtonType.secondary,
                size: DigitButtonSize.large,
              ),
            ],
          ],
        ),
      ],
    );
  }
}

class _NewReportActions extends StatelessWidget {
  const _NewReportActions({required this.sample, required this.onAction});

  final FacilityReportSample sample;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final percent = (sample.progress * 100).round();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: spacer4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: LinearProgressIndicator(
                  key: const ValueKey('installation-progress'),
                  borderRadius: BorderRadius.circular(spacer1),
                  backgroundColor: theme.colorTheme.generic.background,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    theme.colorTheme.alert.success,
                  ),
                  value: sample.progress,
                  minHeight: spacer3,
                ),
              ),
              const SizedBox(width: spacer3),
              Text(
                '$percent%',
                style: textTheme.bodyS.copyWith(
                  color: theme.colorTheme.text.secondary,
                ),
              ),
            ],
          ),
        ),
        DigitButton(
          key: const ValueKey('start-resume-report-button'),
          mainAxisSize: MainAxisSize.max,
          label: percent > 0
              ? AppStrings.resumeInstallationReport
              : AppStrings.startInstallationReport,
          onPressed: onAction,
          type: DigitButtonType.primary,
          size: DigitButtonSize.large,
        ),
        const SizedBox(height: spacer4),
        DigitButton(
          key: const ValueKey('submit-approval-button'),
          mainAxisSize: MainAxisSize.max,
          label: AppStrings.submitForApproval,
          onPressed: onAction,
          isDisabled: percent < 100,
          type: DigitButtonType.secondary,
          size: DigitButtonSize.large,
        ),
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    return Padding(
      padding: const EdgeInsets.only(top: spacer4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: textTheme.headingS.copyWith(
                color: theme.colorTheme.text.primary,
              ),
            ),
          ),
          const SizedBox(width: spacer12),
          Expanded(
            flex: 3,
            child: Text(
              value,
              style: textTheme.bodyL.copyWith(
                color: theme.colorTheme.text.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
