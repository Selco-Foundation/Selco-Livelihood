import 'dart:ui' show PathMetric;

import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../blocs/asset_submission/asset_submission.dart';
import '../router/app_router.dart';
import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import 'machine_report_success_page.dart';

/// Which success page to land on once the background submission job
/// reports `submission_successful` — Solar and Machine already have their
/// own, differently-worded success screens (`SubmittedSaveSuccessPage`,
/// `MachineReportSuccessPage`), so this reuses them rather than inventing a
/// third.
enum SyncSuccessTarget { solar, machine }

@RoutePage()
class SyncLoadingPage extends StatefulWidget {
  const SyncLoadingPage({
    super.key,
    required this.activityFacilityId,
    required this.facilityId,
    required this.target,
  });

  final String activityFacilityId;
  final String facilityId;
  final SyncSuccessTarget target;

  @override
  State<SyncLoadingPage> createState() => _SyncLoadingPageState();
}

class _SyncLoadingPageState extends State<SyncLoadingPage> {
  @override
  void initState() {
    super.initState();
    context.read<AssetSubmissionBloc>().add(SubmitAll(
          activityFacilityId: widget.activityFacilityId,
          facilityId: widget.facilityId,
        ));
  }

  void _goToSuccess() {
    if (widget.target == SyncSuccessTarget.machine) {
      context.router.replace(
        MachineReportSuccessRoute(mode: MachineReportSuccessMode.submitted),
      );
    } else {
      context.router.replace(const SubmittedSaveSuccessRoute());
    }
  }

  void _retry() {
    context.read<AssetSubmissionBloc>().add(RetrySubmission(
          activityFacilityId: widget.activityFacilityId,
          facilityId: widget.facilityId,
        ));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    return BlocConsumer<AssetSubmissionBloc, AssetSubmissionState>(
      listener: (context, state) {
        if (state is AssetSubmissionSuccess) _goToSuccess();
      },
      builder: (context, state) {
        final isFailure = state is AssetSubmissionFailure;
        final progressPercent = switch (state) {
          AssetSubmissionInProgress(:final progress) => progress.progressPercent,
          AssetSubmissionFailure(:final progress) => progress.progressPercent,
          _ => 0,
        };
        final stageLabel = switch (state) {
          AssetSubmissionInProgress(:final progress) => progress.stageLabel,
          AssetSubmissionFailure(:final progress) =>
            progress.errorMessage ?? progress.stageLabel,
          _ => context.translate(i18.syncLoading.preparingSync),
        };
        final progressValue =
            (progressPercent.clamp(0, 100).toDouble() / 100).clamp(0.0, 1.0);

        return Scaffold(
          body: ScrollableContent(
            key: const ValueKey('sync-loading-page'),
            backgroundColor: theme.colorTheme.generic.background,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(
                    vertical: spacer2, horizontal: spacer6),
                child: Column(
                  children: [
                    SizedBox(height: context.height * 0.15),
                    CloudProgressIndicator(
                      key: const ValueKey('sync-loading-cloud-indicator'),
                      progress: progressValue,
                      size: const Size(120, 90),
                      strokeWidth: 3,
                      baseColor: isFailure
                          ? theme.colorTheme.alert.errorBg
                          : theme.colorTheme.alert.infoBg,
                      progressColor: isFailure
                          ? theme.colorTheme.alert.error
                          : theme.colorTheme.primary.primary1,
                    ),
                    SizedBox(height: context.height * 0.03),
                    Text(
                      isFailure
                          ? context.translate(i18.syncLoading.failed)
                          : progressPercent >= 100
                              ? context.translate(i18.syncLoading.successful)
                              : context.translate(i18.syncLoading.syncingReports),
                      style: textTheme.headingS.copyWith(
                        color: isFailure
                            ? theme.colorTheme.alert.error
                            : theme.colorTheme.primary.primary2,
                      ),
                    ),
                    const SizedBox(height: spacer2),
                    Text(
                      stageLabel,
                      key: const ValueKey('sync-loading-stage-label'),
                      textAlign: TextAlign.center,
                      style: textTheme.bodyL
                          .copyWith(color: theme.colorTheme.text.primary),
                    ),
                    const SizedBox(height: spacer6),
                    LinearProgressIndicator(
                      key: const ValueKey('sync-loading-linear-progress'),
                      borderRadius: BorderRadius.circular(spacer2),
                      backgroundColor: theme.colorTheme.generic.background,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        isFailure
                            ? theme.colorTheme.alert.error
                            : theme.colorTheme.alert.success,
                      ),
                      value: progressValue,
                      minHeight: spacer3,
                    ),
                    const SizedBox(height: spacer2),
                    Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        '$progressPercent%',
                        key: const ValueKey('sync-loading-percent-text'),
                        style: textTheme.headingS
                            .copyWith(color: theme.colorTheme.primary.primary2),
                      ),
                    ),
                    if (isFailure) ...[
                      const SizedBox(height: spacer6),
                      DigitButton(
                        key: const ValueKey('sync-loading-retry-button'),
                        label: context.translate(i18.common.retry),
                        mainAxisSize: MainAxisSize.max,
                        type: DigitButtonType.primary,
                        size: DigitButtonSize.large,
                        onPressed: _retry,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Ported as-is from e4h's `sync_loading.dart` — self-contained custom
/// painter, no app-specific logic to adapt.
class CloudProgressIndicator extends StatelessWidget {
  const CloudProgressIndicator({
    super.key,
    required this.progress,
    this.strokeWidth = 6.0,
    this.baseColor = const Color(0xFFE0E0E0),
    this.progressColor = const Color(0xFF4CAF50),
    this.size = const Size(200, 120),
  });

  final double progress;
  final double strokeWidth;
  final Color baseColor;
  final Color progressColor;
  final Size size;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: size,
      painter: _CloudPainter(
        progress: progress.clamp(0.0, 1.0),
        strokeWidth: strokeWidth,
        baseColor: baseColor,
        progressColor: progressColor,
      ),
    );
  }
}

class _CloudPainter extends CustomPainter {
  final double progress;
  final double strokeWidth;
  final Color baseColor;
  final Color progressColor;

  _CloudPainter({
    required this.progress,
    required this.strokeWidth,
    required this.baseColor,
    required this.progressColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final path = Path()
      ..moveTo(w * 0.15, h * 0.65)
      ..cubicTo(
        w * 0.05, h * 0.65,
        w * 0.05, h * 0.45,
        w * 0.20, h * 0.40,
      )
      ..cubicTo(
        w * 0.23, h * 0.25,
        w * 0.33, h * 0.20,
        w * 0.40, h * 0.25,
      )
      ..cubicTo(
        w * 0.45, h * 0.02,
        w * 0.70, h * 0.02,
        w * 0.80, h * 0.40,
      )
      ..cubicTo(
        w * 0.95, h * 0.45,
        w * 0.95, h * 0.65,
        w * 0.85, h * 0.65,
      )
      ..lineTo(w * 0.60, h * 0.65)
      ..moveTo(w * 0.40, h * 0.65)
      ..lineTo(w * 0.15, h * 0.65);

    final basePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..color = baseColor
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(path, basePaint);

    final metrics = path.computeMetrics().toList();
    final totalLength = metrics.fold(0.0, (sum, metric) => sum + metric.length);

    final curve3Top = Offset(w * 0.575, h * 0.02);
    double? startDistance;

    double currentDistance = 0;
    double minDistance = double.infinity;

    for (final metric in metrics) {
      for (double d = 0; d < metric.length; d += 1) {
        final tangent = metric.getTangentForOffset(d)!;
        final distance = (tangent.position - curve3Top).distance;

        if (distance < minDistance) {
          minDistance = distance;
          startDistance = currentDistance + d;
        }
      }
      currentDistance += metric.length;
    }

    startDistance ??= totalLength * 0.55;

    final extractPath = Path();
    if (progress > 0) {
      final progressLength = progress * totalLength;
      final start = startDistance;
      final end = start + progressLength;

      if (end > totalLength) {
        _addPathSegment(metrics, start, totalLength, extractPath);
        final remaining = end - totalLength;
        _addPathSegment(metrics, 0, remaining, extractPath);
      } else {
        _addPathSegment(metrics, start, end, extractPath);
      }
    }

    final progressPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..color = progressColor
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(extractPath, progressPaint);
  }

  void _addPathSegment(
      List<PathMetric> metrics, double start, double end, Path destPath) {
    double current = 0;
    for (final metric in metrics) {
      final metricLength = metric.length;
      final metricStart = current;
      final metricEnd = current + metricLength;

      if (start < metricEnd && end > metricStart) {
        final segStart = (start - metricStart).clamp(0.0, metricLength);
        final segEnd = (end - metricStart).clamp(0.0, metricLength);
        if (segStart < segEnd) {
          destPath.addPath(metric.extractPath(segStart, segEnd), Offset.zero);
        }
      }

      current += metricLength;
      if (current > end) break;
    }
  }

  @override
  bool shouldRepaint(covariant _CloudPainter old) {
    return old.progress != progress ||
        old.baseColor != baseColor ||
        old.progressColor != progressColor;
  }
}
