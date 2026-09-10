import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../utils/operation_progress.dart';

/// Drawn as a `Stack` child over the page being submitted (`overall_asset_
/// summary.dart`, `machine_form.dart`) — mirrors E4H's `OperationProgressOverlay`:
/// submission progress shows in place, never as a separate route. Renders
/// nothing while there's no active/failed job for this page.
class OperationProgressOverlay extends StatelessWidget {
  const OperationProgressOverlay({
    super.key,
    required this.progress,
    required this.onRetry,
    required this.onClose,
  });

  final OperationProgressModel? progress;
  final VoidCallback onRetry;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final progress = this.progress;
    if (progress == null || (!progress.isActive && !progress.isFailure)) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final isFailure = progress.isFailure;
    final progressValue =
        (progress.progressPercent.clamp(0, 100).toDouble() / 100).clamp(0.0, 1.0);

    return Positioned.fill(
      child: ColoredBox(
        color: theme.colorTheme.generic.background.withOpacity(0.92),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(spacer4),
            child: DigitCard(
              key: const ValueKey('operation-progress-overlay'),
              children: [
                Text(
                  isFailure
                      ? context.translate(i18.syncLoading.failed)
                      : context.translate(i18.syncLoading.syncingReports),
                  style: textTheme.headingM.copyWith(
                    color: isFailure
                        ? theme.colorTheme.alert.error
                        : theme.colorTheme.primary.primary2,
                  ),
                ),
                const SizedBox(height: spacer2),
                Text(
                  isFailure
                      ? (progress.errorMessage ?? progress.stageLabel)
                      : progress.stageLabel,
                  key: const ValueKey('operation-progress-stage-label'),
                  textAlign: TextAlign.center,
                  style: textTheme.bodyL.copyWith(
                    color: theme.colorTheme.text.primary,
                  ),
                ),
                const SizedBox(height: spacer4),
                LinearProgressIndicator(
                  key: const ValueKey('operation-progress-linear'),
                  borderRadius: BorderRadius.circular(spacer2),
                  backgroundColor: theme.colorTheme.generic.background,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    isFailure
                        ? theme.colorTheme.alert.error
                        : theme.colorTheme.alert.success,
                  ),
                  value: progress.status == OperationStatuses.queued
                      ? null
                      : progressValue,
                  minHeight: spacer3,
                ),
                const SizedBox(height: spacer2),
                Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    '${progress.progressPercent}%',
                    key: const ValueKey('operation-progress-percent'),
                    style: textTheme.headingS
                        .copyWith(color: theme.colorTheme.primary.primary2),
                  ),
                ),
                if (isFailure) ...[
                  const SizedBox(height: spacer4),
                  Row(
                    children: [
                      Expanded(
                        child: DigitButton(
                          key: const ValueKey('operation-progress-close-button'),
                          label: context.translate(i18.common.back),
                          mainAxisSize: MainAxisSize.max,
                          type: DigitButtonType.secondary,
                          size: DigitButtonSize.large,
                          onPressed: onClose,
                        ),
                      ),
                      const SizedBox(width: spacer4),
                      Expanded(
                        child: DigitButton(
                          key: const ValueKey('operation-progress-retry-button'),
                          label: context.translate(i18.common.retry),
                          mainAxisSize: MainAxisSize.max,
                          type: DigitButtonType.primary,
                          size: DigitButtonSize.large,
                          onPressed: onRetry,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
