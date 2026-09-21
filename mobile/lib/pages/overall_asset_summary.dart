import 'dart:async';
import 'dart:io';

import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/TextTheme/digit_text_theme.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/atoms/digit_divider.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
// Required by auto_route when expanding the imported SolarPickMedia typedef.
// ignore: unused_import
import 'package:image_picker/image_picker.dart';

import '../blocs/asset_submission/asset_submission.dart';
import '../blocs/installation_images/installation_images.dart';
import '../blocs/activity_facility_counts/activity_facility_counts.dart';
import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../model/solar_installation_draft.dart';
import '../model/mdms/common_masters.dart';
import '../repositories/installation_cache_repo.dart';
import '../repositories/installation_draft_repository.dart';
import '../repositories/operation_progress_repo.dart';
import '../repositories/asset_mdms_repository.dart';
import '../repositories/asset_progress_repo.dart';
import '../repositories/pending_submission_repository.dart';
import '../router/app_router.dart';
import '../utils/submission_payload.dart';
import '../utils/document_metadata.dart';
import '../widgets/file_upload_widget.dart';
import '../widgets/image_uploader.dart';
import '../widgets/operation_progress_overlay.dart';
import '../widgets/otp_verification_widget.dart';
import '../widgets/solar_workflow_widgets.dart';
import '../widgets/workflow_rejection_reasons.dart';
import '../widgets/workflow_report_documents.dart';

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
  bool _otpRequested = false;
  bool _submissionStartInFlight = false;
  final _invoiceNumberController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _invoiceNumberController.text = widget.draft.invoiceNumber ?? '';
    if (!Platform.environment.containsKey('FLUTTER_TEST')) {
      unawaited(_resync());
    }
    unawaited(_restorePendingState());
  }

  @override
  void dispose() {
    _invoiceNumberController.dispose();
    super.dispose();
  }

  Future<void> _restorePendingState() async {
    final id = widget.draft.workflow.activityFacility.id;
    if (id == null) return;
    final record = await pendingSubmissionRepository.read(id);
    if (widget.draft.mode == SolarWorkflowMode.resubmission &&
        record != null &&
        !record.matchesAttempt(widget.draft.workflow, widget.draft.mode.name)) {
      await pendingSubmissionRepository.remove(id);
      await installationCacheRepository.putJson('submission-payload', id, null);
      await operationProgressRepository.clearJob(id);
      return;
    }
    if (!mounted || record == null) return;
    setState(() {
      _otpRequested = record.otpRequested;
      _otpVerified = record.otpVerified;
    });
  }

  Future<void> _onOtpRequested() async {
    await pendingSubmissionRepository.markOtpRequested(
      widget.draft.workflow,
      workflowMode: widget.draft.mode.name,
    );
    if (!mounted) return;
    setState(() => _otpRequested = true);
    _refreshCounts();
  }

  Future<void> _onOtpVerified() async {
    if (!mounted) return;
    setState(() {
      _otpRequested = true;
      _otpVerified = true;
    });
    _refreshCounts();
    await _startSubmission(
      persistOtpApproval: true,
      preserveExistingPayload: false,
    );
  }

  void _refreshCounts() {
    try {
      context
          .read<ActivityFacilityCountsBloc>()
          .add(const ActivityFacilityCountsEvent.fetch(forceRefresh: true));
    } catch (_) {}
  }

  /// Mirrors E4H's overall/inbox summary pages, which resync BOM + asset
  /// data from the backend on every mount regardless of workflow state —
  /// unlike this page's original `createSolar`-only entry, which only
  /// reflected whatever the last report-list fetch happened to embed.
  /// Safe to run unconditionally: `hydrateSolar` merges backend data first,
  /// then (for non-read-only drafts) overlays the local in-progress draft
  /// on top via `_hydrateLocal`, so local edits always win over the
  /// backend snapshot.
  Future<void> _resync() async {
    try {
      await installationDraftRepository.hydrateSolar(widget.draft);
    } catch (_) {
      // Keep showing whatever's already in the draft if the resync fails.
    }
    if (_invoiceNumberController.text.isEmpty) {
      _invoiceNumberController.text = widget.draft.invoiceNumber ?? '';
    }
    if (mounted) setState(() {});
  }

  String get _actionPrefix => switch (widget.draft.mode) {
        SolarWorkflowMode.newReport => context.translate(i18.common.add),
        SolarWorkflowMode.resubmission => context.translate(i18.common.edit),
        SolarWorkflowMode.pending ||
        SolarWorkflowMode.approved =>
          context.translate(i18.common.view),
      };

  List<String> get _formNames => widget.draft.bomFormNames;

  bool _isAssociatedMachinesForm(String name) =>
      name.trim().toLowerCase().endsWith('_machines');

  String _formLabel(String name) {
    final normalized = name.toLowerCase();
    if (normalized.contains('luminar')) {
      return context.translate(i18.installationReport.bomLuminaries);
    }
    if (normalized.contains('wiring')) {
      return context.translate(i18.installationReport.bomLoadWiring);
    }
    if (normalized.endsWith('_machines')) {
      return 'Associated Machines';
    }
    if (normalized.endsWith('_system')) {
      return 'System Functionality Parameters';
    }
    if (normalized.contains('rms')) {
      return context.translate(i18.installationReport.bomRms);
    }
    if (normalized.endsWith('_solar')) {
      return context.translate(i18.installationReport.bomSolarSystem);
    }
    return name.replaceFirst('AssetForm.', '').replaceAll('_', ' ');
  }

  Map<String, List<String>> _missingRequirements(
    SolarInstallationDraft draft,
  ) {
    final missing = <String, List<String>>{};
    void add(String section, String field) {
      final fields = missing.putIfAbsent(section, () => []);
      if (!fields.contains(field)) fields.add(field);
    }

    for (final type in draft.applicableTypes) {
      final asset = draft.assets[type]!;
      final count = draft.countFor(type);
      final label = draft.labelFor(type);
      if (count == 0) {
        add(label, context.translate(i18.common.count));
        continue;
      }
      if (asset.warrantyDuration.trim().isEmpty) {
        add(label, context.translate(i18.assetFlow.warrantyDuration));
      }
      if (asset.selectedBrandCode?.trim().isNotEmpty != true) {
        add(label, 'Make');
      }
      if (asset.totalCapacity.trim().isEmpty) {
        add(label, context.translate(i18.assetFlow.capacity));
      }
      if (asset.assets.length != count) {
        add(label, context.translate(i18.common.count));
      }
      for (var index = 0; index < count; index++) {
        final entry = index < asset.assets.length ? asset.assets[index] : null;
        final entryLabel = count == 1 ? label : '$label ${index + 1}';
        if (entry?.itemCode?.trim().isNotEmpty != true) {
          add(entryLabel, 'Item Code');
        }
        if (entry?.serialNumber.trim().isNotEmpty != true) {
          add(entryLabel, context.translate(i18.assetFlow.serialNumber));
        }
        if (entry?.capacity.trim().isNotEmpty != true) {
          add(entryLabel, context.translate(i18.assetFlow.capacity));
        }
        if (type == SolarAssetType.battery &&
            !asset.typeOptions.contains(entry?.batteryType)) {
          add(entryLabel, 'Battery Type');
        }
        if (entry?.supportingPhoto?.hasCompleteNewDocumentMetadata != true) {
          add(entryLabel, context.translate(i18.assetFlow.supportingPhoto));
        }
      }
      if (asset.images.isEmpty ||
          asset.images.any((file) => !file.hasCompleteNewDocumentMetadata)) {
        add(label, context.translate(i18.assetFlow.images));
      }
      if (asset.videos.any((file) => !file.hasCompleteNewDocumentMetadata)) {
        add(label, context.translate(i18.assetFlow.videos));
      }
    }

    final installationLabel =
        context.translate(i18.installationReport.installationImages);
    if (draft.installationRequirements.isEmpty) {
      add(installationLabel, context.translate(i18.common.required));
    }
    for (final requirement in draft.installationRequirements) {
      final files = draft.installationMedia[requirement.code] ?? const [];
      if (files.length < requirement.requiredCount ||
          files.any((file) => !file.hasCompleteNewDocumentMetadata)) {
        add(
          installationLabel,
          requirement.shortTitle?.trim().isNotEmpty == true
              ? requirement.shortTitle!.trim()
              : requirement.description,
        );
      }
    }
    if (draft.completionReportFiles
        .any((file) => !file.hasCompleteNewDocumentMetadata)) {
      add(
        context.translate(i18.installationReport.installationCompletionReport),
        context.translate(i18.common.required),
      );
    }
    return missing;
  }

  Future<void> _openDynamicForm(String name) async {
    final schema = assetMdmsRepository.schemaFor(name);
    final pageName =
        schema == null || schema.pages.isEmpty ? null : schema.pages.first.code;
    await context.router.push(DynamicBomFormRoute(
      draft: widget.draft,
      schemaName: name,
      pageName: pageName ?? '',
      readOnly: widget.draft.isReadOnly || _isAssociatedMachinesForm(name),
    ));
    installationDraftRepository.applyBomDerivedValues(widget.draft);
    if (mounted) setState(() {});
  }

  void _openAssetDetails(SolarAssetType type) {
    final activityFacilityId = widget.draft.workflow.activityFacility.id;
    if (activityFacilityId != null) {
      unawaited(assetProgressRepository.recordStep(
        activityFacilityId: activityFacilityId,
        assetType: type.name,
        step: 1,
      ));
    }
    context.router.push(
      AssetTypeDetailRoute(
        draft: widget.draft,
        assetType: type,
        pickMedia: widget.pickMedia,
      ),
    );
  }

  Future<void> _openAssetSummary(SolarAssetType type) async {
    if (widget.draft.isReadOnly) {
      await installationDraftRepository.hydrateSolar(widget.draft);
      if (!mounted) return;
    }
    context.router.push(
      AssetSummaryRoute(
        draft: widget.draft,
        assetType: type,
        readOnly: widget.draft.isReadOnly,
      ),
    );
  }

  /// Awaits the cache writes **sequentially** before dispatching submit —
  /// firing them concurrently (as unawaited calls) alongside the bloc's own
  /// `upsertJob` write can deadlock Isar's per-instance write-transaction
  /// lock when multiple `writeTxn` calls race against each other. Since
  /// submit no longer navigates away (the overlay stays on this page),
  /// there's no UI-responsiveness reason to fire these concurrently anymore.
  ///
  /// Dispatches straight into `AssetSubmissionBloc` and stays on this page
  /// (matching E4H: submit progress is an in-place overlay, never a
  /// separate route) rather than navigating to a sync-loading screen.
  Future<void> _submit() => _startSubmission(
        persistOtpApproval: false,
        preserveExistingPayload: true,
      );

  Future<void> _startSubmission({
    required bool persistOtpApproval,
    required bool preserveExistingPayload,
  }) async {
    if (_submissionStartInFlight) return;
    final draft = widget.draft;
    _refreshDocumentLocations();
    if (!_otpVerified ||
        !draft.canSubmit ||
        !draft.allDocumentsMetadataComplete) {
      return;
    }
    final activityFacilityId = draft.workflow.activityFacility.id;
    final facilityId = draft.workflow.activityFacility.facilityId;
    if (activityFacilityId == null || facilityId == null) return;
    _submissionStartInFlight = true;
    try {
      if (persistOtpApproval) {
        await pendingSubmissionRepository.markOtpVerified(
          draft.workflow,
          workflowMode: draft.mode.name,
        );
      }
      await installationDraftRepository.saveSolar(draft);
      await installationCacheRepository.ensureSubmissionPayload(
        activityFacilityId,
        () => buildSolarSubmissionPayload(draft),
        preserveExisting: preserveExistingPayload,
      );
      if (!mounted) return;
      context.read<AssetSubmissionBloc>().add(SubmitAll(
            activityFacilityId: activityFacilityId,
            facilityId: facilityId,
          ));
    } catch (error, stackTrace) {
      debugPrint(
        'Submission preparation failed for $activityFacilityId: $error\n'
        '$stackTrace',
      );
      if (mounted) {
        context.read<AssetSubmissionBloc>().add(SubmissionPreparationFailed(
              activityFacilityId: activityFacilityId,
              error: error,
            ));
      }
    } finally {
      _submissionStartInFlight = false;
    }
  }

  Future<void> _saveDraft() async {
    _refreshDocumentLocations();
    if (!widget.draft.allDocumentsMetadataComplete) return;
    await installationDraftRepository.saveSolar(widget.draft);
    await pendingSubmissionRepository.saveDraft(
      widget.draft.workflow,
      workflowMode: widget.draft.mode.name,
    );
    if (!mounted) return;
    _refreshCounts();
    await context.router.push<void>(
      DataSaveSuccessRoute(
        draft: widget.draft,
        pickMedia: widget.pickMedia,
      ),
    );
  }

  void _refreshDocumentLocations() {
    final draft = widget.draft;
    void refreshList(List<SolarFileRef> files) {
      for (var index = 0; index < files.length; index++) {
        files[index] = refreshDocumentLocation(context, files[index]);
      }
    }

    refreshList(draft.completionReportFiles);
    for (final files in draft.installationMedia.values) {
      refreshList(files);
    }
    for (final asset in draft.assets.values) {
      refreshList(asset.images);
      refreshList(asset.videos);
      for (final entry in asset.assets) {
        final photo = entry.supportingPhoto;
        if (photo != null) {
          entry.supportingPhoto = refreshDocumentLocation(context, photo);
        }
      }
    }
    if (mounted) setState(() {});
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

  void _onRetrySubmit() => unawaited(_startSubmission(
        persistOtpApproval: false,
        preserveExistingPayload: true,
      ));

  @override
  Widget build(BuildContext context) {
    observeDocumentLocation(context);
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final draft = widget.draft;
    return BlocConsumer<AssetSubmissionBloc, AssetSubmissionState>(
      listener: (context, state) {
        if (state is AssetSubmissionSuccess) {
          context.read<AssetSubmissionBloc>().add(const DismissSubmission());
          context.router.push(const SubmittedSaveSuccessRoute());
        }
      },
      builder: (context, state) => Stack(
        children: [
          _buildScaffold(context, theme, textTheme, draft),
          OperationProgressOverlay(
            progress: switch (state) {
              AssetSubmissionInProgress(:final progress) => progress,
              AssetSubmissionFailure(:final progress) => progress,
              _ => null,
            },
            onRetry: _onRetrySubmit,
            onClose: () => context
                .read<AssetSubmissionBloc>()
                .add(const DismissSubmission()),
          ),
        ],
      ),
    );
  }

  Widget _buildScaffold(
    BuildContext context,
    ThemeData theme,
    DigitTextTheme textTheme,
    SolarInstallationDraft draft,
  ) {
    final missing = draft.mode == SolarWorkflowMode.resubmission
        ? _missingRequirements(draft)
        : const <String, List<String>>{};
    return SolarWorkflowScaffold(
      pageKey: 'solar-overall-summary-${draft.mode.name}',
      footer: draft.isReadOnly
          ? null
          : _SolarSummaryFooter(
              submitLabel: draft.mode == SolarWorkflowMode.resubmission
                  ? context.translate(i18.installationReport.resubmit)
                  : context.translate(i18.common.submit),
              canSubmit: draft.canSubmit,
              otpVerified: _otpVerified,
              onSaveDraft: _saveDraft,
              onSubmit: _submit,
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
              for (var index = 0; index < draft.applicableTypes.length; index++)
                draft.isReadOnly
                    ? _ElementAssetSummary(
                        type: draft.applicableTypes[index],
                        label: draft.labelFor(draft.applicableTypes[index]),
                        count: draft.countFor(draft.applicableTypes[index]),
                        rejectionComments:
                            draft.mode == SolarWorkflowMode.resubmission
                                ? draft.rejectionCommentsFor(
                                    draft.applicableTypes[index],
                                  )
                                : const [],
                        lastCard: index == draft.applicableTypes.length - 1,
                        onPress: () => _openAssetSummary(
                          draft.applicableTypes[index],
                        ),
                      )
                    : _InitialElementAssetSummary(
                        type: draft.applicableTypes[index],
                        label: draft.labelFor(draft.applicableTypes[index]),
                        count: draft.countFor(draft.applicableTypes[index]),
                        rejectionComments:
                            draft.mode == SolarWorkflowMode.resubmission
                                ? draft.rejectionCommentsFor(
                                    draft.applicableTypes[index],
                                  )
                                : const [],
                        hasSummary:
                            draft.completeFor(draft.applicableTypes[index]),
                        lastCard: index == draft.applicableTypes.length - 1,
                        onCountChanged: (count) => setState(() {
                          final type = draft.applicableTypes[index];
                          draft.setCount(type, count);
                          installationDraftRepository.saveSolarSoon(draft);
                          final activityFacilityId =
                              draft.workflow.activityFacility.id;
                          if (count > 0 && activityFacilityId != null) {
                            unawaited(assetProgressRepository.recordStep(
                              activityFacilityId: activityFacilityId,
                              assetType: type.name,
                              step: 1,
                            ));
                          }
                        }),
                        onSummary: () => _openAssetSummary(
                          draft.applicableTypes[index],
                        ),
                        onAddDetails: () => _openAssetDetails(
                          draft.applicableTypes[index],
                        ),
                      ),
            ],
          ),
          const SizedBox(height: spacer4),
          DigitCard(
            key: const ValueKey('solar-installation-completion-card'),
            children: [
              Text(
                context.translate(
                    i18.installationReport.installationCompletionReport),
                style: textTheme.headingM.copyWith(
                  color: theme.colorTheme.primary.primary2,
                ),
              ),
              if (!draft.isReadOnly)
                Text(
                  context
                      .translate(i18.installationReport.completionInstructions),
                  style: textTheme.bodyS.copyWith(
                    color: theme.colorTheme.primary.primary2,
                  ),
                ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_formNames.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(bottom: spacer4),
                      child: Text(
                          'Required BOM form configuration is unavailable. Refresh master data to continue.'),
                    ),
                  for (final formName in _formNames) ...[
                    _CompletionButton(
                      key: ValueKey('solar-dynamic-${formName.toLowerCase()}'),
                      label: _isAssociatedMachinesForm(formName)
                          ? 'View Associated Machines'
                          : '$_actionPrefix ${_formLabel(formName)}',
                      onPressed: () => _openDynamicForm(formName),
                    ),
                    const SizedBox(height: spacer4),
                  ],
                  _CompletionButton(
                    key: const ValueKey('solar-installation-images'),
                    label:
                        '$_actionPrefix ${context.translate(i18.installationReport.installationImages)}',
                    onPressed: _openInstallationImages,
                  ),
                  const SizedBox(height: spacer4),
                ],
              ),
              if (draft.isReadOnly)
                WorkflowReportDocuments(
                  key: const ValueKey('solar-workflow-report-documents'),
                  documents: draft.workflow.workflow?.documents ?? const [],
                )
              else
                FileUploadWidget(
                  key: const ValueKey('solar-overall-file-uploader'),
                  label: context.translate(i18.installationReport.uploadPrompt),
                  allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png'],
                  allowMultiples: true,
                  showPreview: true,
                  initialFiles: draft.completionReportFiles
                      .where((file) =>
                          file.documentType == null ||
                          isWorkflowReportType(file.documentType))
                      .toList(),
                  pickFiles: widget.pickFiles,
                  onFilesSelected: (files) async {
                    final persisted = <SolarFileRef>[];
                    for (var index = 0; index < files.length; index++) {
                      persisted.add(
                          await installationCacheRepository.persistMediaRef(
                              commitDocumentMetadata(
                                context,
                                files[index],
                                documentType: 'INSTALLATION_COMPLETION_REPORT',
                                uidPrefix:
                                    'INSTALLATION-REPORT-${files[index].kind.name.toUpperCase()}',
                              ),
                              '${draft.cacheKey}-completion-$index'));
                    }
                    if (!mounted) return;
                    setState(() => draft.completionReportFiles
                      ..clear()
                      ..addAll(persisted));
                    installationDraftRepository.saveSolarSoon(draft);
                  },
                ),
              const SizedBox(height: spacer1),
              LabeledField(
                label: context.translate(i18.installationReport.invoiceNumber),
                capitalizedFirstLetter: false,
                child: DigitTextFormInput(
                  key: const ValueKey('solar-invoice-number-field'),
                  controller: _invoiceNumberController,
                innerLabel: context.translate(i18.installationReport.invoiceNumber),
                  isDisabled: draft.isReadOnly,
                  readOnly: draft.isReadOnly,
                  onChange: (value) {
                    draft.invoiceNumber = value;
                    installationDraftRepository.saveSolarSoon(draft);
                  },
                ),
              ),
              if (draft.mode == SolarWorkflowMode.resubmission)
                WorkflowRejectionReasons(
                  panelKey: const ValueKey('solar-rejection-reasons-panel'),
                  surfaceKey: const ValueKey('solar-rejection-reasons-surface'),
                  comments: draft.otherRejectionComments,
                  showSectionLabel: true,
                ),
              if (!draft.isReadOnly) ...[
                const SizedBox(height: spacer1 * 0.5),
                OtpVerificationWidget(
                  key: const ValueKey('solar-otp-widget'),
                  keyPrefix: 'solar',
                  activityFacilityId: draft.workflow.activityFacility.id ?? '',
                  initiallyRequested: _otpRequested,
                  initiallyVerified: _otpVerified,
                  onRequestSucceeded: _onOtpRequested,
                  onVerificationSucceeded: _onOtpVerified,
                  onVerificationChanged: (verified) =>
                      setState(() => _otpVerified = verified),
                ),
              ],
            ],
          ),
          if (missing.isNotEmpty) ...[
            const SizedBox(height: spacer4),
            DigitCard(
              key: const ValueKey('solar-missing-requirements'),
              children: [
                Text(
                  context.translate(
                    i18.installationReport.completeBeforeResubmitting,
                  ),
                  style: textTheme.headingS,
                ),
                const SizedBox(height: spacer2),
                for (final entry in missing.entries)
                  Padding(
                    padding: const EdgeInsets.only(bottom: spacer1),
                    child: Text(
                      '${entry.key}: ${entry.value.join(', ')}',
                      style: textTheme.bodyS,
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _SolarSummaryFooter extends StatelessWidget {
  const _SolarSummaryFooter({
    required this.submitLabel,
    required this.canSubmit,
    required this.otpVerified,
    required this.onSaveDraft,
    required this.onSubmit,
  });

  final String submitLabel;
  final bool canSubmit;
  final bool otpVerified;
  final VoidCallback onSaveDraft;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return DigitCard(
      key: const ValueKey('solar-fixed-footer'),
      margin: const EdgeInsets.only(top: spacer2),
      children: [
        Row(
          children: [
            Expanded(
              child: DigitButton(
                key: const ValueKey('solar-footer-save-draft'),
                mainAxisSize: MainAxisSize.max,
                label: context.translate(i18.machineForm.saveAsDraft),
                onPressed: onSaveDraft,
                type: DigitButtonType.secondary,
                size: DigitButtonSize.large,
              ),
            ),
            const SizedBox(width: spacer4),
            Expanded(
              child: DigitButton(
                key: const ValueKey('solar-footer-submit'),
                mainAxisSize: MainAxisSize.max,
                label: submitLabel,
                onPressed: onSubmit,
                isDisabled: !otpVerified || !canSubmit,
                type: DigitButtonType.primary,
                size: DigitButtonSize.large,
              ),
            ),
          ],
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
    required this.label,
    required this.count,
    required this.rejectionComments,
    required this.hasSummary,
    required this.lastCard,
    required this.onCountChanged,
    required this.onSummary,
    required this.onAddDetails,
  });

  final SolarAssetType type;
  final String label;
  final int count;
  final List<WorkflowComment> rejectionComments;
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
              child: Text(label, style: textTheme.headingS),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _AssetCounter(
                  symbol: '-',
                  onTap: count > 1 ? () => onCountChanged(count - 1) : null,
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
                  onTap: () => onCountChanged(count == 0 ? 1 : count + 1),
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
        WorkflowRejectionReasons(
          panelKey: ValueKey('solar-rejection-${type.name}'),
          comments: rejectionComments,
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
    required this.label,
    required this.count,
    required this.rejectionComments,
    required this.lastCard,
    required this.onPress,
  });

  final SolarAssetType type;
  final String label;
  final int count;
  final List<WorkflowComment> rejectionComments;
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
              child: Text(label, style: textTheme.headingS),
            ),
            Center(child: Text('$count', style: textTheme.bodyL)),
          ],
        ),
        WorkflowRejectionReasons(
          panelKey: ValueKey('solar-rejection-${type.name}'),
          comments: rejectionComments,
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
    this.hydrateDraft,
  });

  final SolarInstallationDraft draft;
  final bool readOnly;
  final SolarPickMedia? pickMedia;
  final Future<void> Function(SolarInstallationDraft draft)? hydrateDraft;

  @override
  State<InstallationImagesPage> createState() => _InstallationImagesPageState();
}

class _InstallationImagesPageState extends State<InstallationImagesPage> {
  late final InstallationImagesBloc _bloc;
  String? _requestedSystemCode;

  List<InstallationImageRequirement> get _requirements =>
      widget.draft.installationRequirements;

  @override
  void initState() {
    super.initState();
    _bloc = InstallationImagesBloc(initialItems: _requirements);
    _fetchRequirementsIfResolved();
    unawaited(_hydrateDraft());
  }

  void _fetchRequirementsIfResolved() {
    final systemCode = widget.draft.systemCode?.trim() ?? '';
    if (systemCode.isEmpty || _requestedSystemCode == systemCode) return;
    _requestedSystemCode = systemCode;
    _bloc.add(FetchInstallationImages(systemCode: systemCode));
  }

  Future<void> _hydrateDraft() async {
    try {
      await (widget.hydrateDraft ?? installationDraftRepository.hydrateSolar)(
        widget.draft,
      );
    } catch (_) {
      // The MDMS bloc below owns the visible retry state. Existing cached
      // media remains usable if backend snapshot hydration is unavailable.
    }
    if (!mounted) return;
    _fetchRequirementsIfResolved();
    setState(() {});
  }

  @override
  void dispose() {
    _bloc.close();
    super.dispose();
  }

  List<SolarFileRef> _files(InstallationImageRequirement requirement) {
    final values = widget.draft.installationMedia.putIfAbsent(
      requirement.code,
      () => <SolarFileRef>[],
    );
    return values;
  }

  Future<void> _selectMany(
    InstallationImageRequirement requirement,
    List<SolarFileRef> files,
  ) async {
    final values = _files(requirement);
    final persisted = <SolarFileRef>[];
    for (var index = 0; index < files.length; index++) {
      persisted.add(await installationCacheRepository.persistMediaRef(
        commitDocumentMetadata(
          context,
          files[index],
          documentType: 'INSTALLATION_IMAGE-${requirement.code}',
          uidPrefix: 'INSTALLATION-IMAGE-${requirement.code}',
          index: index,
        ),
        '${widget.draft.cacheKey}-installation-${requirement.code}-$index',
      ));
    }
    values
      ..clear()
      ..addAll(persisted);
    installationDraftRepository.saveSolarSoon(widget.draft);
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    observeDocumentLocation(context);
    for (final files in widget.draft.installationMedia.values) {
      for (var index = 0; index < files.length; index++) {
        files[index] = refreshDocumentLocation(context, files[index]);
      }
    }
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    return SolarWorkflowScaffold(
      pageKey: 'solar-installation-images-page',
      footer: SolarFooterButton(
        label: widget.readOnly
            ? context.translate(i18.common.back)
            : context.translate(i18.common.submit),
        isDisabled:
            !widget.readOnly && !widget.draft.installationImagesComplete,
        onPressed: () {
          installationDraftRepository.saveSolarSoon(widget.draft);
          context.router.maybePop();
        },
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
          BlocConsumer<InstallationImagesBloc, InstallationImagesState>(
            bloc: _bloc,
            listener: (context, state) {
              if (state is InstallationImagesLoaded) {
                widget.draft.installationRequirements = state.items;
                installationDraftRepository.saveSolarSoon(widget.draft);
                if (mounted) setState(() {});
              }
            },
            builder: (context, state) {
              if (state is InstallationImagesInitial ||
                  state is InstallationImagesLoading) {
                return const DigitCard(
                  key: ValueKey('installation-images-loading-card'),
                  children: [
                    SizedBox(width: double.infinity),
                    SizedBox(height: spacer4),
                    Center(child: CircularProgressIndicator()),
                    SizedBox(height: spacer4),
                  ],
                );
              }
              if (state is InstallationImagesError) {
                return DigitCard(
                  key: const ValueKey('installation-images-error-card'),
                  children: [
                    const SizedBox(width: double.infinity),
                    Text(
                      state.message,
                      style: textTheme.bodyL.copyWith(
                        color: theme.colorTheme.alert.error,
                      ),
                    ),
                    const SizedBox(height: spacer3),
                    DigitButton(
                      label: context.translate(i18.common.retry),
                      mainAxisSize: MainAxisSize.max,
                      type: DigitButtonType.primary,
                      size: DigitButtonSize.large,
                      onPressed: () => _bloc.add(FetchInstallationImages(
                        systemCode: widget.draft.systemCode ?? '',
                        forceRefresh: true,
                      )),
                    ),
                  ],
                );
              }
              final requirements = (state as InstallationImagesLoaded).items;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final requirement in requirements)
                    Padding(
                      padding: const EdgeInsets.only(bottom: spacer4),
                      child: DigitCard(
                        key: ValueKey(
                            'solar-installation-image-${requirement.code}'),
                        children: [
                          const SizedBox(width: double.infinity),
                          Text(
                            '${requirement.code}. '
                            '${requirement.description}',
                            style: textTheme.bodyL.copyWith(
                              color: theme.colorTheme.primary.primary2,
                            ),
                          ),
                          Text(
                            requirement.requiredLabel,
                            style: textTheme.bodyS.copyWith(
                              color: theme.colorTheme.text.secondary,
                            ),
                          ),
                          const SizedBox(height: spacer2),
                          ImageUploader(
                            isDisabled: widget.readOnly,
                            initialImages: _files(requirement),
                            label:
                                context.translate(i18.assetFlow.uploadImages),
                            allowMultiples: requirement.allowMultiples,
                            maxImages: requirement.requiredCount,
                            pickMedia: widget.pickMedia,
                            onImagesSelected: (files) =>
                                _selectMany(requirement, files),
                          ),
                          if (widget.draft.mode ==
                              SolarWorkflowMode.resubmission)
                            WorkflowRejectionReasons(
                              panelKey: ValueKey(
                                'solar-installation-rejection-${requirement.code}',
                              ),
                              comments:
                                  widget.draft.installationRejectionComments(
                                requirement.code,
                              ),
                            ),
                        ],
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}
