import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/atoms/digit_divider.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../app/app_strings.dart';
import '../models/solar_installation_draft.dart';
import '../widgets/file_upload_widget.dart';
import '../widgets/image_uploader.dart';
import '../widgets/solar_workflow_widgets.dart';
import 'asset_flow_pages.dart';
import 'submitted_save_success.dart';

typedef SolarPickFiles = Future<List<PlatformFile>> Function();

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
  static const _dynamicSections = <String>[
    AppStrings.systemParameters,
    AppStrings.bomSolarSystem,
    AppStrings.bomRms,
    AppStrings.bomLoadWiring,
    AppStrings.bomLuminaries,
  ];

  String get _actionPrefix => switch (widget.draft.mode) {
        SolarWorkflowMode.newReport => AppStrings.add,
        SolarWorkflowMode.resubmission => AppStrings.edit,
        SolarWorkflowMode.pending ||
        SolarWorkflowMode.approved =>
          AppStrings.view,
      };

  void _placeholder() {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(content: Text(AppStrings.dynamicFormNotConnected)),
      );
  }

  void _openAssetDetails(SolarAssetType type) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => SpecificationPage(
          draft: widget.draft,
          assetType: type,
          pickMedia: widget.pickMedia,
        ),
      ),
    );
  }

  void _openAssetSummary(SolarAssetType type) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AssetSummaryPage(
          draft: widget.draft,
          assetType: type,
          readOnly: widget.draft.isReadOnly,
        ),
      ),
    );
  }

  Future<void> _openDocument(SolarDocumentType type) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => type == SolarDocumentType.certificate
            ? InstallationCompletionCertificatePage(
                draft: widget.draft,
                readOnly: widget.draft.isReadOnly,
                pickMedia: widget.pickMedia,
                pickFiles: widget.pickFiles,
              )
            : AssetHandoverDocumentPage(
                draft: widget.draft,
                readOnly: widget.draft.isReadOnly,
                pickMedia: widget.pickMedia,
                pickFiles: widget.pickFiles,
              ),
      ),
    );
    if (!mounted) return;
    setState(() {});
    if (saved == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(AppStrings.documentSaved)),
      );
    }
  }

  Future<void> _openInstallationImages() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => InstallationImagesPage(
          draft: widget.draft,
          readOnly: widget.draft.isReadOnly,
          pickMedia: widget.pickMedia,
        ),
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
                  ? AppStrings.resubmit
                  : AppStrings.submit,
              isDisabled: !draft.allCountsEntered,
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const SubmittedSaveSuccessPage(),
                ),
              ),
            ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppStrings.summary,
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
                AppStrings.installationCompletionReport,
                style: textTheme.headingM.copyWith(
                  color: theme.colorTheme.primary.primary2,
                ),
              ),
              if (!draft.isReadOnly)
                Text(
                  AppStrings.completionInstructions,
                  style: textTheme.bodyS.copyWith(
                    color: theme.colorTheme.primary.primary2,
                  ),
                ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final section in _dynamicSections) ...[
                    _CompletionButton(
                      key: ValueKey('solar-dynamic-${section.toLowerCase()}'),
                      label: '$_actionPrefix $section',
                      onPressed: _placeholder,
                    ),
                    const SizedBox(height: spacer4),
                  ],
                  _CompletionButton(
                    key: const ValueKey('solar-completion-certificate'),
                    label:
                        '$_actionPrefix ${AppStrings.installationCompletionCertificate}',
                    onPressed: () =>
                        _openDocument(SolarDocumentType.certificate),
                  ),
                  const SizedBox(height: spacer4),
                  _CompletionButton(
                    key: const ValueKey('solar-handover-document'),
                    label: '$_actionPrefix ${AppStrings.assetHandoverDocument}',
                    onPressed: () => _openDocument(SolarDocumentType.handover),
                  ),
                  const SizedBox(height: spacer4),
                  _CompletionButton(
                    key: const ValueKey('solar-installation-images'),
                    label: '$_actionPrefix ${AppStrings.installationImages}',
                    onPressed: _openInstallationImages,
                  ),
                  const SizedBox(height: spacer4),
                ],
              ),
              FileUploadWidget(
                key: const ValueKey('solar-overall-file-uploader'),
                label: AppStrings.uploadPrompt,
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
                AppStrings.rejectionReasons,
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
                  AppStrings.incorrectInstallationDetails,
                  style: textTheme.label.copyWith(
                    color: theme.colorTheme.primary.primary2,
                  ),
                ),
              ),
              const SizedBox(height: spacer2),
              Text(
                AppStrings.rejectedSerialReason,
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
                    AppStrings.summary,
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
            label: AppStrings.viewSummary,
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

enum SolarDocumentType { certificate, handover }

extension on SolarDocumentType {
  String get title => this == SolarDocumentType.certificate
      ? AppStrings.installationCompletionCertificate
      : AppStrings.assetHandoverDocument;
}

class InstallationCompletionCertificatePage extends StatelessWidget {
  const InstallationCompletionCertificatePage({
    super.key,
    required this.draft,
    required this.readOnly,
    this.pickMedia,
    this.pickFiles,
  });

  final SolarInstallationDraft draft;
  final bool readOnly;
  final SolarPickMedia? pickMedia;
  final SolarPickFiles? pickFiles;

  @override
  Widget build(BuildContext context) => _DocumentUploadPage(
        draft: draft,
        type: SolarDocumentType.certificate,
        readOnly: readOnly,
        pickMedia: pickMedia,
        pickFiles: pickFiles,
      );
}

class AssetHandoverDocumentPage extends StatelessWidget {
  const AssetHandoverDocumentPage({
    super.key,
    required this.draft,
    required this.readOnly,
    this.pickMedia,
    this.pickFiles,
  });

  final SolarInstallationDraft draft;
  final bool readOnly;
  final SolarPickMedia? pickMedia;
  final SolarPickFiles? pickFiles;

  @override
  Widget build(BuildContext context) => _DocumentUploadPage(
        draft: draft,
        type: SolarDocumentType.handover,
        readOnly: readOnly,
        pickMedia: pickMedia,
        pickFiles: pickFiles,
      );
}

class _DocumentUploadPage extends StatefulWidget {
  const _DocumentUploadPage({
    required this.draft,
    required this.type,
    required this.readOnly,
    this.pickMedia,
    this.pickFiles,
  });

  final SolarInstallationDraft draft;
  final SolarDocumentType type;
  final bool readOnly;
  final SolarPickMedia? pickMedia;
  final SolarPickFiles? pickFiles;

  @override
  State<_DocumentUploadPage> createState() => _DocumentUploadPageState();
}

class _DocumentUploadPageState extends State<_DocumentUploadPage> {
  static const maxFiles = 3;
  late List<SolarFileRef> images;
  late List<SolarFileRef> pdfs;

  List<SolarFileRef> get source => widget.type == SolarDocumentType.certificate
      ? widget.draft.completionCertificate
      : widget.draft.handoverDocuments;

  @override
  void initState() {
    super.initState();
    images = source.where((file) => file.kind == SolarFileKind.image).toList();
    pdfs = source.where((file) => file.kind == SolarFileKind.pdf).toList();
  }

  void _save() {
    source
      ..clear()
      ..addAll(images)
      ..addAll(pdfs);
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final total = images.length + pdfs.length;
    return SolarWorkflowScaffold(
      pageKey: 'solar-document-${widget.type.name}',
      footer: SolarFooterButton(
        label: widget.readOnly ? AppStrings.back : AppStrings.submit,
        isDisabled: !widget.readOnly && (total == 0 || total > maxFiles),
        onPressed: widget.readOnly ? () => Navigator.of(context).pop() : _save,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.type.title,
            style: textTheme.headingXl.copyWith(
              color: theme.colorTheme.primary.primary2,
            ),
          ),
          const SizedBox(height: spacer4),
          DigitCard(
            key: ValueKey('solar-document-card-${widget.type.name}'),
            children: [
              if (!widget.readOnly) ...[
                Text(
                  AppStrings.uploadPrompt,
                  style: textTheme.bodyL.copyWith(
                    color: theme.colorTheme.primary.primary2,
                  ),
                ),
                Text(AppStrings.documentUploadInstructions,
                    style: textTheme.bodyL),
                Text(AppStrings.acceptedFormats, style: textTheme.bodyS),
                Text('Maximum file size: 5 MB.', style: textTheme.bodyS),
                Text(AppStrings.maxFiles, style: textTheme.bodyS),
                const SizedBox(height: spacer1),
              ],
              ImageUploader(
                label: AppStrings.uploadImages,
                allowMultiples: true,
                maxImages: maxFiles - pdfs.length,
                isDisabled: widget.readOnly,
                initialImages: images,
                pickMedia: widget.pickMedia,
                onImagesSelected: (selected) =>
                    setState(() => images = selected),
              ),
              const SizedBox(height: spacer1),
              FileUploadWidget(
                key: ValueKey('solar-document-files-${widget.type.name}'),
                label: AppStrings.uploadPdf,
                allowedExtensions: const ['pdf'],
                allowMultiples: true,
                showPreview: true,
                maxFiles: maxFiles - images.length,
                isDisabled: widget.readOnly,
                initialFiles: pdfs,
                pickFiles: widget.pickFiles,
                onFilesSelected: (selected) => setState(() => pdfs = selected),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

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
        label: widget.readOnly ? AppStrings.back : AppStrings.submit,
        isDisabled:
            !widget.readOnly && !widget.draft.installationImagesComplete,
        onPressed: () => Navigator.of(context).pop(),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppStrings.installationImages,
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
