import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/atoms/digit_divider.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../model/facility_report_sample.dart';

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

  String _status(BuildContext context) => switch (mode) {
        FacilityReportMode.newReport => context.translate(
            i18.installationReportHome.pendingInstallation),
        FacilityReportMode.pendingApproval =>
          context.translate(i18.home.pendingApproval),
        FacilityReportMode.resubmissionNeeded => context.translate(
            i18.installationReportHome.resubmissionNeededSingleLine),
        FacilityReportMode.approved => context.translate(i18.home.approved),
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
            _DetailRow(label: context.translate(i18.common.status), value: _status(context)),
            if (isNew) ...[
              _DetailRow(
                label: context.translate(i18.installationReportHome.startDate),
                value: sample.startDate,
              ),
              _DetailRow(label: context.translate(i18.installationReportHome.endDate), value: sample.endDate),
            ] else
              _DetailRow(
                label: context.translate(i18.installationReportHome.submissionDate),
                value: sample.submissionDate,
              ),
            _DetailRow(label: context.translate(i18.installationReportHome.state), value: sample.state),
            _DetailRow(label: context.translate(i18.installationReportHome.district), value: sample.district),
            _DetailRow(label: context.translate(i18.installationReportHome.block), value: sample.block),
            if (isNew) _NewReportActions(sample: sample, onAction: onAction),
            if (mode == FacilityReportMode.pendingApproval ||
                mode == FacilityReportMode.approved) ...[
              const SizedBox(height: spacer4),
              DigitButton(
                key: const ValueKey('view-summary-button'),
                mainAxisSize: MainAxisSize.max,
                label: context.translate(i18.installationReportHome.viewSummary),
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
                label: context.translate(i18.installationReportHome.viewDetails),
                onPressed: onAction,
                type: DigitButtonType.primary,
                size: DigitButtonSize.large,
              ),
              const SizedBox(height: spacer4),
              DigitButton(
                key: const ValueKey('resubmit-button'),
                isDisabled: true,
                mainAxisSize: MainAxisSize.max,
                label: context.translate(i18.installationReportHome.resubmitForApproval),
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
              ? context.translate(i18.installationReportHome.resumeInstallationReport)
              : context.translate(i18.installationReportHome.startInstallationReport),
          onPressed: onAction,
          type: DigitButtonType.primary,
          size: DigitButtonSize.large,
        ),
        const SizedBox(height: spacer4),
        DigitButton(
          key: const ValueKey('submit-approval-button'),
          mainAxisSize: MainAxisSize.max,
          label: context.translate(i18.installationReportHome.submitForApproval),
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
