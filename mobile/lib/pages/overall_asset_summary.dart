import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/atoms/digit_divider.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../model/solar_installation_draft.dart';
import '../router/app_router.dart';
import '../widgets/file_upload_widget.dart';
import '../widgets/image_uploader.dart';
import '../widgets/otp_verification_widget.dart';
import '../widgets/solar_workflow_widgets.dart';

typedef SolarPickFiles = Future<List<PlatformFile>> Function();

@RoutePage()
class OverallAssetSummaryPage extends StatefulWidget {
  const OverallAssetSummaryPage({
    super.key,
    required this.draft,
    this.pickMedia,
    this.pickFiles,
  });

  final SolarInstallationDraft draft;
  final SolarPickMedia? pickMedia;
  final SolarPickFiles? pickFiles;

  @override
  State<OverallAssetSummaryPage> createState() =>
      _OverallAssetSummaryPageState();
}

class _OverallAssetSummaryPageState extends State<OverallAssetSummaryPage> {
  bool _otpVerified = false;

  List<String> _dynamicSections(BuildContext context) => <String>[
        context.translate(i18.installationReport.systemParameters),
        context.translate(i18.installationReport.bomSolarSystem),
        context.translate(i18.installationReport.bomRms),
        context.translate(i18.installationReport.bomLoadWiring),
        context.translate(i18.installationReport.bomLuminaries),
      ];

  String get _actionPrefix => switch (widget.draft.mode) {
        SolarWorkflowMode.newReport => context.translate(i18.common.add),
        SolarWorkflowMode.resubmission => context.translate(i18.common.edit),
        SolarWorkflowMode.pending ||
        SolarWorkflowMode.approved =>
          context.translate(i18.common.view),
      };

  void _placeholder() {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(context.translate(i18.installationReport.dynamicFormNotConnected))),
      );
  }

  void _openAssetDetails(SolarAssetType type) {
    context.router.push(
      SpecificationRoute(
        draft: widget.draft,
        assetType: type,
        pickMedia: widget.pickMedia,
      ),
    );
  }

  void _openAssetSummary(SolarAssetType type) {
    context.router.push(
      AssetSummaryRoute(
        draft: widget.draft,
        assetType: type,
        readOnly: widget.draft.isReadOnly,
      ),
    );
  }

  Future<void> _openInstallationImages() async {
    await context.router.push<void>(
      InstallationImagesRoute(
        draft: widget.draft,
        readOnly: widget.draft.isReadOnly,
        pickMedia: widget.pickMedia,
      ),
    );
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final draft = widget.draft;
    return SolarWorkflowScaffold(
      pageKey: 'solar-overall-summary-${draft.mode.name}',
      footer: draft.isReadOnly
          ? null
          : SolarFooterButton(
              label: draft.mode == SolarWorkflowMode.resubmission
                  ? context.translate(i18.installationReport.resubmit)
                  : context.translate(i18.common.submit),
              isDisabled: !draft.allCountsEntered || !_otpVerified,
              onPressed: () =>
                  context.router.push(const SubmittedSaveSuccessRoute()),
            ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.translate(i18.assetFlow.summary),
            style: textTheme.headingXl.copyWith(
              color: theme.colorTheme.primary.primary2,
            ),
          ),
          const SizedBox(height: spacer4),
          DigitCard(
            key: const ValueKey('solar-overall-asset-summary'),
            children: [
              for (var index = 0; index < SolarAssetType.values.length; index++)
                draft.isReadOnly
                    ? _ElementAssetSummary(
                        type: SolarAssetType.values[index],
                        count: draft.countFor(SolarAssetType.values[index]),
                        lastCard: index == SolarAssetType.values.length - 1,
                        onPress: () => _openAssetSummary(
                          SolarAssetType.values[index],
                        ),
                      )
                    : _InitialElementAssetSummary(
                        type: SolarAssetType.values[index],
                        count: draft.countFor(SolarAssetType.values[index]),
                        hasSummary:
                            draft.completeFor(SolarAssetType.values[index]),
                        lastCard: index == SolarAssetType.values.length - 1,
                        onCountChanged: (count) => setState(
                          () => draft.setCount(
                            SolarAssetType.values[index],
                            count,
                          ),
                        ),
                        onSummary: () => _openAssetSummary(
                          SolarAssetType.values[index],
                        ),
                        onAddDetails: () => _openAssetDetails(
                          SolarAssetType.values[index],
                        ),
                      ),
            ],
          ),
          const SizedBox(height: spacer4),
          DigitCard(
            key: const ValueKey('solar-installation-completion-card'),
            children: [
              Text(
                context.translate(i18.installationReport.installationCompletionReport),
                style: textTheme.headingM.copyWith(
                  color: theme.colorTheme.primary.primary2,
                ),
              ),
              if (!draft.isReadOnly)
                Text(
                  context.translate(i18.installationReport.completionInstructions),
                  style: textTheme.bodyS.copyWith(
                    color: theme.colorTheme.primary.primary2,
                  ),
                ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final section in _dynamicSections(context)) ...[
                    _CompletionButton(
                      key: ValueKey('solar-dynamic-${section.toLowerCase()}'),
                      label: '$_actionPrefix $section',
                      onPressed: _placeholder,
                    ),
                    const SizedBox(height: spacer4),
                  ],
                  _CompletionButton(
                    key: const ValueKey('solar-installation-images'),
                    label: '$_actionPrefix ${context.translate(i18.installationReport.installationImages)}',
                    onPressed: _openInstallationImages,
                  ),
                  const SizedBox(height: spacer4),
                ],
              ),
              FileUploadWidget(
                key: const ValueKey('solar-overall-file-uploader'),
                label: context.translate(i18.installationReport.uploadPrompt),
                allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png'],
                allowMultiples: true,
                showPreview: true,
                isDisabled: draft.isReadOnly,
                initialFiles: draft.completionReportFiles,
                pickFiles: widget.pickFiles,
                onFilesSelected: (files) => setState(() {
                  draft.completionReportFiles
                    ..clear()
                    ..addAll(files);
                }),
              ),
              if (!draft.isReadOnly) ...[
                const SizedBox(height: spacer4),
                OtpVerificationWidget(
                  key: const ValueKey('solar-otp-widget'),
                  keyPrefix: 'solar',
                  label: context.translate(i18.machineForm.validateInstallationOtp),
                  onVerificationChanged: (verified) =>
                      setState(() => _otpVerified = verified),
                ),
              ],
              if (draft.mode == SolarWorkflowMode.resubmission)
                const _RejectionReasonsPanel(),
            ],
          ),
        ],
      ),
    );
  }
}

class _RejectionReasonsPanel extends StatelessWidget {
  const _RejectionReasonsPanel();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    return Column(
      key: const ValueKey('solar-rejection-reasons-panel'),
      children: [
        const SizedBox(height: spacer2),
        Container(
          key: const ValueKey('solar-rejection-reasons-surface'),
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
              Container(
                key: const ValueKey('solar-rejection-reason-chip'),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: theme.colorTheme.primary.primary2,
                  ),
                  borderRadius: BorderRadius.circular(spacer2),
                  color: theme.colorTheme.paper.primary,
                ),
                padding: const EdgeInsets.symmetric(
                  vertical: spacer1,
                  horizontal: spacer3,
                ),
                child: Text(
                  context.translate(i18.installationReport.incorrectInstallationDetails),
                  style: textTheme.label.copyWith(
                    color: theme.colorTheme.primary.primary2,
                  ),
                ),
              ),
              const SizedBox(height: spacer2),
              Text(
                context.translate(i18.installationReport.rejectedSerialReason),
                style: textTheme.label.copyWith(
                  color: theme.colorTheme.text.primary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _AssetCounter extends StatelessWidget {
  const _AssetCounter({required this.symbol, required this.onTap});

  final String symbol;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          height: spacer9,
          width: spacer9,
          decoration: BoxDecoration(
            color: Theme.of(context).colorTheme.generic.background,
            border: Border.all(
              color: Theme.of(context).colorTheme.generic.inputBorder,
            ),
          ),
          alignment: Alignment.center,
          child:
              Text(symbol, style: const TextStyle(fontWeight: FontWeight.bold)),
        ),
      );
}

class _InitialElementAssetSummary extends StatelessWidget {
  const _InitialElementAssetSummary({
    required this.type,
    required this.count,
    required this.hasSummary,
    required this.lastCard,
    required this.onCountChanged,
    required this.onSummary,
    required this.onAddDetails,
  });

  final SolarAssetType type;
  final int count;
  final bool hasSummary;
  final bool lastCard;
  final ValueChanged<int> onCountChanged;
  final VoidCallback onSummary;
  final VoidCallback onAddDetails;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).digitTextTheme(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Stack(
          alignment: Alignment.center,
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Text(type.pluralLabel, style: textTheme.headingS),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _AssetCounter(
                  symbol: '-',
                  onTap: count > 0 ? () => onCountChanged(count - 1) : null,
                ),
                Container(
                  height: spacer9,
                  width: spacer9,
                  decoration: BoxDecoration(
                    border: Border.symmetric(
                      horizontal: BorderSide(
                        color: Theme.of(context).colorTheme.generic.inputBorder,
                      ),
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text('$count', style: textTheme.bodyL),
                ),
                _AssetCounter(
                  symbol: '+',
                  onTap: count < 10 ? () => onCountChanged(count + 1) : null,
                ),
              ],
            ),
            if (hasSummary)
              Align(
                alignment: Alignment.centerRight,
                child: GestureDetector(
                  onTap: onSummary,
                  child: Text(
                    context.translate(i18.assetFlow.summary),
                    style: textTheme.bodyS.copyWith(
                      color: Theme.of(context).colorTheme.primary.primary1,
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: spacer2),
        DigitButton(
          key: ValueKey('solar-add-details-${type.name}'),
          mainAxisSize: MainAxisSize.max,
          label: 'Add Details',
          type: DigitButtonType.secondary,
          size: DigitButtonSize.medium,
          isDisabled: count <= 0,
          onPressed: onAddDetails,
        ),
        const SizedBox(height: spacer2),
        if (!lastCard) ...[
          const SizedBox(height: spacer2),
          const DigitDivider(dividerType: DividerType.small),
        ],
      ],
    );
  }
}

class _ElementAssetSummary extends StatelessWidget {
  const _ElementAssetSummary({
    required this.type,
    required this.count,
    required this.lastCard,
    required this.onPress,
  });

  final SolarAssetType type;
  final int count;
  final bool lastCard;
  final VoidCallback onPress;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).digitTextTheme(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Stack(
          alignment: Alignment.center,
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Text(type.pluralLabel, style: textTheme.headingS),
            ),
            Center(child: Text('$count', style: textTheme.bodyL)),
          ],
        ),
        const SizedBox(height: spacer2),
        if (count > 0) ...[
          DigitButton(
            key: ValueKey('solar-asset-action-${type.name}'),
            mainAxisSize: MainAxisSize.max,
            label: context.translate(i18.installationReportHome.viewSummary),
            type: DigitButtonType.secondary,
            size: DigitButtonSize.medium,
            onPressed: onPress,
          ),
          const SizedBox(height: spacer2),
        ],
        if (!lastCard) ...[
          const SizedBox(height: spacer2),
          const DigitDivider(dividerType: DividerType.small),
        ],
      ],
    );
  }
}

class _CompletionButton extends StatelessWidget {
  const _CompletionButton({
    super.key,
    required this.label,
    required this.onPressed,
  });

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => DigitButton(
        capitalizeLetters: false,
        mainAxisSize: MainAxisSize.max,
        label: label,
        type: DigitButtonType.secondary,
        size: DigitButtonSize.large,
        onPressed: onPressed,
      );
}

@RoutePage()
class InstallationImagesPage extends StatefulWidget {
  const InstallationImagesPage({
    super.key,
    required this.draft,
    required this.readOnly,
    this.pickMedia,
  });

  final SolarInstallationDraft draft;
  final bool readOnly;
  final SolarPickMedia? pickMedia;

  @override
  State<InstallationImagesPage> createState() => _InstallationImagesPageState();
}

class _InstallationImagesPageState extends State<InstallationImagesPage> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    return SolarWorkflowScaffold(
      pageKey: 'solar-installation-images-page',
      footer: SolarFooterButton(
        label: widget.readOnly ? context.translate(i18.common.back) : context.translate(i18.common.submit),
        isDisabled:
            !widget.readOnly && !widget.draft.installationImagesComplete,
        onPressed: () => context.router.maybePop(),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.translate(i18.installationReport.installationImages),
            style: textTheme.headingXl.copyWith(
              color: theme.colorTheme.primary.primary2,
            ),
          ),
          const SizedBox(height: spacer4),
          for (final requirement in SolarInstallationDraft.imageRequirements)
            Padding(
              padding: const EdgeInsets.only(bottom: spacer4),
              child: DigitCard(
                key: ValueKey('solar-installation-image-$requirement'),
                children: [
                  LabeledField(
                    label: requirement,
                    isRequired: true,
                    capitalizedFirstLetter: false,
                    child: ImageUploader(
                      isDisabled: widget.readOnly,
                      initialImage:
                          widget.draft.installationImages[requirement],
                      label: 'Click to add photo',
                      pickMedia: widget.pickMedia,
                      onImageSelected: (file) => setState(
                        () =>
                            widget.draft.installationImages[requirement] = file,
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
