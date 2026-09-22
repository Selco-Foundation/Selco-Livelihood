import 'dart:async';

import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/TextTheme/digit_text_theme.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';

import '../blocs/asset_submission/asset_submission.dart';
import '../blocs/activity_facility_counts/activity_facility_counts.dart';
import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../model/facility_report.dart';
import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../model/solar_installation_draft.dart';
import '../model/mdms/common_masters.dart';
import '../repositories/asset_mdms_repository.dart';
import '../repositories/asset_repository.dart';
import '../repositories/installation_cache_repo.dart';
import '../repositories/operation_progress_repo.dart';
import '../repositories/pending_submission_repository.dart';
import '../router/app_router.dart';
import '../utils/app_permission_gateway.dart';
import '../utils/submission_payload.dart';
import '../utils/document_metadata.dart';
import '../utils/workflow_status.dart';
import '../widgets/image_uploader.dart';
import '../widgets/machine_media_picker.dart';
import '../widgets/operation_progress_overlay.dart';
import '../widgets/otp_verification_widget.dart';
import '../widgets/report_navigation_header.dart';
import '../widgets/video_uploader.dart';
import '../widgets/workflow_rejection_reasons.dart';
import '../widgets/workflow_report_documents.dart';
import 'machine_report_success_page.dart';
import 'media_viewer.dart';

@RoutePage()
class MachineFormPage extends StatefulWidget {
  const MachineFormPage({
    super.key,
    required this.workflow,
    this.pickMedia,
    this.readOnly = false,
  });

  final MachinePickMedia? pickMedia;
  final ActivityFacilityWorkflow workflow;
  final bool readOnly;

  @override
  State<MachineFormPage> createState() => _MachineFormPageState();
}

class _MachineFormPageState extends State<MachineFormPage> {
  final _poController = TextEditingController();
  final _serialController = TextEditingController();
  final _invoiceController = TextEditingController();
  final _capacityController = TextEditingController();
  final _warrantyController = TextEditingController();
  final Map<String, TextEditingController> _extraControllers = {};

  final Map<String, List<SolarFileRef>> _mediaByField = {};
  // Document ids freed by a removal, banked per field until a later pick
  // consumes them — a remove and its replacement pick are two separate
  // callbacks (two separate `_setSchemaMedia` calls), so the id can't be
  // computed fresh from a single call's before/after diff; it must survive
  // between calls or it's lost and the replacement goes out as a fresh
  // insert instead of an update.
  final Map<String, List<String>> _freedDocumentIds = {};
  String? _assetId;
  bool _trainedEndUser = true;
  bool _otpVerified = false;
  bool _otpRequested = false;
  bool _submissionStartInFlight = false;
  MachineFormSchema? _schema;
  bool _schemaLoaded = false;

  String get _cacheKey => widget.workflow.activityFacilityCacheKey;
  String get _workflowMode {
    final status = (widget.workflow.workflow?.state ??
            widget.workflow.status ??
            widget.workflow.activityFacility.status ??
            '')
        .trim()
        .toUpperCase();
    return status == FacilityInstallationStatus.rejectedByQcSpoc
        ? 'resubmission'
        : 'newReport';
  }

  @override
  void initState() {
    super.initState();
    _schema = assetMdmsRepository.machineFormSchema;
    _schemaLoaded = _schema != null;
    unawaited(_initialize());
    unawaited(_restorePendingState());
  }

  Future<void> _initialize() async {
    await assetMdmsRepository.load();
    _schema = assetMdmsRepository.machineFormSchema;
    for (final field in _schema?.fields ?? const <MachineFormField>[]) {
      if (field.type == 'boolean' && field.fieldName == 'trainedEndUser') {
        _trainedEndUser = field.defaultValue == true;
      }
    }
    _seed(
      widget.workflow.activityFacility.billOfMaterial?.data ??
          widget.workflow.activityFacility.additionalDetails?.bom ??
          const {},
      includeCapacity: false,
    );
    await _loadDraft();
    if (mounted) setState(() => _schemaLoaded = true);
  }

  bool get _formComplete {
    final schema = _schema;
    if (schema == null) return false;
    return schema.fields.every((field) {
      if (field.isMedia) {
        final media = _mediaFor(field.fieldName);
        return field.mediaCountComplete(media.length) && documentsReady(media);
      }
      if (!field.requiredField) return true;
      if (field.type == 'boolean') return true;
      return _textValue(field.fieldName).trim().isNotEmpty;
    });
  }

  Future<void> _restorePendingState() async {
    final id = widget.workflow.activityFacility.id;
    if (id == null) return;
    final record = await pendingSubmissionRepository.read(id);
    if (_workflowMode == 'resubmission' &&
        record != null &&
        !record.matchesAttempt(widget.workflow, _workflowMode)) {
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
      widget.workflow,
      workflowMode: _workflowMode,
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

  @override
  void dispose() {
    _poController.dispose();
    _serialController.dispose();
    _invoiceController.dispose();
    _capacityController.dispose();
    _warrantyController.dispose();
    for (final controller in _extraControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<XFile?> _pickMedia(
    MachineMediaKind kind,
    ImageSource source,
  ) {
    final override = widget.pickMedia;
    if (override != null) return override(kind, source);
    final picker = ImagePicker();
    return kind == MachineMediaKind.image
        ? picker.pickImage(source: source)
        : picker.pickVideo(source: source);
  }

  Future<XFile?> _pickSolarMedia(
    SolarFileKind kind,
    ImageSource source,
  ) =>
      _pickMedia(
        kind == SolarFileKind.video
            ? MachineMediaKind.video
            : MachineMediaKind.image,
        source,
      );

  void _refresh([String? _]) {
    setState(() {});
    _saveSoon();
  }

  void _seed(
    Map<String, dynamic> values, {
    bool includeCapacity = true,
  }) {
    _poController.text = (values['poNumber'] ??
            values['po_number'] ??
            values['purchase_order_number'] ??
            _poController.text)
        .toString();
    _serialController.text = (values['serialNumber'] ??
            values['serial_number'] ??
            _serialController.text)
        .toString();
    _invoiceController.text = (values['invoiceNumber'] ??
            values['manufacturerInvoiceNumber'] ??
            _invoiceController.text)
        .toString();
    final capacity = values['capacity']?.toString().trim();
    if (includeCapacity && capacity?.isNotEmpty == true) {
      _capacityController.text = capacity!;
    }
    _warrantyController.text = (values['warrantyDuration'] ??
            values['warrantyYears'] ??
            values['warranty'] ??
            _warrantyController.text)
        .toString();
    if (values['trainedEndUser'] is bool) {
      _trainedEndUser = values['trainedEndUser'] as bool;
    }
    for (final field in _schema?.fields ?? const <MachineFormField>[]) {
      if (field.isMedia || field.type == 'boolean') continue;
      // Capacity is hydrated explicitly from Asset Registry or a local
      // draft. BOM values must never prefill the Machine form field.
      if (field.fieldName == 'capacity') continue;
      final value = values[field.fieldName];
      if (value != null) {
        _controllerFor(field.fieldName).text = value.toString();
      }
    }
  }

  String _textValue(String fieldName) => switch (fieldName) {
        'poNumber' => _poController.text,
        'serialNumber' => _serialController.text,
        'invoiceNumber' => _invoiceController.text,
        'capacity' => _capacityController.text,
        'warrantyDuration' => _warrantyController.text,
        _ => _extraControllers[fieldName]?.text ?? '',
      };

  TextEditingController _controllerFor(String fieldName) => switch (fieldName) {
        'poNumber' => _poController,
        'serialNumber' => _serialController,
        'invoiceNumber' => _invoiceController,
        'capacity' => _capacityController,
        'warrantyDuration' => _warrantyController,
        _ =>
          _extraControllers.putIfAbsent(fieldName, TextEditingController.new),
      };

  List<SolarFileRef> _mediaFor(String fieldName) =>
      List<SolarFileRef>.of(_mediaByField[fieldName] ?? const []);

  Map<String, dynamic> get _formValues => {
        for (final field in _schema?.fields ?? const <MachineFormField>[])
          if (!field.isMedia)
            field.fieldName: field.type == 'boolean'
                ? _trainedEndUser
                : _textValue(field.fieldName).trim(),
      };

  Map<String, List<SolarFileRef>> get _formMedia => {
        for (final field in _schema?.fields ?? const <MachineFormField>[])
          if (field.isMedia && _mediaFor(field.fieldName).isNotEmpty)
            field.fieldName: _mediaFor(field.fieldName),
      };

  Future<void> _loadDraft() async {
    final shouldHydrateAsset = widget.readOnly || _workflowMode == 'resubmission';
    if (shouldHydrateAsset && _cacheKey.isNotEmpty) {
      final assets = await assetRepository.search(_cacheKey);
      if (assets.isNotEmpty) {
        final asset = assets.first;
        _assetId = (asset['assetId'] ?? asset['assetID'])?.toString();
        final details = <String, dynamic>{
          if (asset['additionalDetails'] is Map)
            ...Map<String, dynamic>.from(asset['additionalDetails'] as Map),
          if (asset['assetDetails'] is Map)
            ...Map<String, dynamic>.from(asset['assetDetails'] as Map),
          for (final field in _schema?.fields ?? const <MachineFormField>[])
            if (asset[field.fieldName] != null)
              field.fieldName: asset[field.fieldName],
        };
        details['serialNumber'] ??= asset['serialNumber'];
        details['warrantyDuration'] ??= asset['warrantyDurationYears'];
        _seed(details);
        _loadDocuments(asset['documents']);
      }
    }
    final cached =
        await installationCacheRepository.getJson('machine-draft', _cacheKey);
    if (!widget.readOnly && cached is Map) {
      final values = Map<String, dynamic>.from(cached);
      _seed(values);
      _assetId ??= values['assetId']?.toString();
      _trainedEndUser = values['trainedEndUser'] != false;
      final media = values['media'] is Map
          ? Map<String, dynamic>.from(values['media'] as Map)
          : const <String, dynamic>{};
      for (final field in _schema?.fields ?? const <MachineFormField>[]) {
        if (!field.isMedia || media[field.fieldName] is! List) continue;
        // A cache entry written before this device last saw the backend's
        // document ids (e.g. an older app session) won't carry one — backfill
        // it from the freshly backend-hydrated media above (matched by
        // fileStoreId) so an unmodified/replaced photo still round-trips its
        // id instead of silently going out as a brand-new document.
        final backendMedia = _mediaByField[field.fieldName] ?? const [];
        _mediaByField[field.fieldName] = (media[field.fieldName] as List)
            .whereType<Map>()
            .map((value) {
              var file = SolarFileRef.fromJson(
                Map<String, dynamic>.from(value),
              ).copyWith(displayTitle: field.title);
              if (file.id?.trim().isNotEmpty != true) {
                final match = backendMedia.cast<SolarFileRef?>().firstWhere(
                      (item) =>
                          item?.remoteId?.isNotEmpty == true &&
                          item?.remoteId == file.remoteId,
                      orElse: () => null,
                    );
                if (match?.id?.trim().isNotEmpty == true) {
                  file = file.copyWith(id: match!.id);
                }
              }
              return file;
            })
            .toList();
      }
    }
    if (mounted) setState(() {});
  }

  void _loadDocuments(dynamic value) {
    final documents = (value as List<dynamic>? ?? const []).whereType<Map>();
    final byField = <String, List<SolarFileRef>>{};
    for (final raw in documents) {
      final document = Map<String, dynamic>.from(raw);
      final documentType =
          (document['documentType'] ?? document['type'] ?? '').toString();
      final field = _schema?.fields.cast<MachineFormField?>().firstWhere(
            (candidate) =>
                candidate?.isMedia == true &&
                candidate!.fieldName == documentType,
            orElse: () => null,
          );
      if (field == null) continue;
      final id =
          (document['fileStoreId'] ?? document['fileStore'] ?? '').toString();
      if (id.isEmpty) continue;
      final kind =
          field.type == 'video' ? SolarFileKind.video : SolarFileKind.image;
      final media = SolarFileRef(
        name: (document['fileName'] ?? document['name'] ?? documentType)
            .toString(),
        path: id,
        remoteId: id,
        displayTitle: field.title,
        documentType: documentType,
        kind: kind,
        id: document['id']?.toString(),
        documentUid: document['documentUid']?.toString(),
        status: document['status']?.toString() ?? 'ACTIVE',
        additionalDetails: document['additionalDetails'] is Map
            ? Map<String, dynamic>.from(document['additionalDetails'] as Map)
            : null,
        geoLocation: document['geoLocation'] is Map
            ? Map<String, dynamic>.from(document['geoLocation'] as Map)
            : null,
      );
      final bucket = byField.putIfAbsent(field.fieldName, () => []);
      final duplicate = bucket.any((item) =>
          (media.documentUid?.isNotEmpty == true &&
              item.documentUid == media.documentUid) ||
          (media.id?.isNotEmpty == true && item.id == media.id) ||
          item.path == media.path);
      if (!duplicate) bucket.add(media);
    }
    for (final entry in byField.entries) {
      _mediaByField[entry.key] = entry.value;
    }
  }

  Future<void> _save() {
    if (_cacheKey.isEmpty) return Future.value();
    return installationCacheRepository.putJson('machine-draft', _cacheKey, {
      ..._formValues,
      if (_assetId?.trim().isNotEmpty == true) 'assetId': _assetId,
      'media': {
        for (final entry in _formMedia.entries)
          entry.key: entry.value.map((media) => media.toJson()).toList(),
      },
    });
  }

  void _saveSoon() {
    if (!widget.readOnly) unawaited(_save());
  }

  Future<void> _setSchemaMedia(
    MachineFormField field,
    List<SolarFileRef> selected,
  ) async {
    final existing = _mediaFor(field.fieldName);
    final selectedPaths = selected.map((file) => file.path).toSet();
    // Ids of slots the user removed this round (their photo is no longer in
    // `selected`) — banked for this field so a *later, separate* pick (a
    // different callback entirely — remove and add are two distinct taps)
    // can still reuse them, rather than being lost the moment this call's
    // `existing` no longer includes the removed item.
    final freedPool = _freedDocumentIds.putIfAbsent(field.fieldName, () => []);
    for (final item in existing) {
      if (item.id?.trim().isNotEmpty == true &&
          !selectedPaths.contains(item.path)) {
        freedPool.add(item.id!);
      }
    }
    final prepared = <SolarFileRef>[];
    final newFiles = <SolarFileRef>[];
    for (final selectedFile in selected.take(field.requiredCount)) {
      final retained = existing.cast<SolarFileRef?>().firstWhere(
            (item) => item?.path == selectedFile.path,
            orElse: () => null,
          );
      if (retained != null) {
        prepared.add(retained.copyWith(displayTitle: field.title));
        continue;
      }
      final reuseId = freedPool.isNotEmpty ? freedPool.removeAt(0) : null;
      final committed = commitDocumentMetadata(
        context,
        selectedFile.copyWith(displayTitle: field.title, id: reuseId),
        documentType: field.fieldName,
        uidPrefix: 'DOC-MACHINE-${field.fieldName}',
      );
      prepared.add(committed);
      newFiles.add(committed);
    }
    if (mounted) setState(() => _mediaByField[field.fieldName] = prepared);

    final persisted = <SolarFileRef>[];
    for (final media in prepared) {
      if (!newFiles.contains(media)) {
        persisted.add(media);
        continue;
      }
      persisted.add(await installationCacheRepository.persistMediaRef(
        media,
        '$_cacheKey-${field.fieldName}-${media.documentUid}',
      ));
    }
    if (!mounted) return;
    setState(() => _mediaByField[field.fieldName] = persisted);
    _saveSoon();
  }

  Widget _buildSchemaField(MachineFormField field) {
    if (field.type == 'boolean') {
      return LabeledField(
        key: ValueKey('machine-${field.fieldName}'),
        label: field.title,
        isRequired: field.requiredField,
        capitalizedFirstLetter: false,
        child: Row(children: [
          Expanded(
            child: _TrainingChoice(
              key: ValueKey(field.fieldName == 'trainedEndUser'
                  ? 'trained-yes'
                  : '${field.fieldName}-yes'),
              label: context.translate(i18.common.yes),
              selected: _trainedEndUser,
              onPressed: widget.readOnly
                  ? () {}
                  : () {
                      setState(() => _trainedEndUser = true);
                      _saveSoon();
                    },
            ),
          ),
          const SizedBox(width: spacer4),
          Expanded(
            child: _TrainingChoice(
              key: ValueKey(field.fieldName == 'trainedEndUser'
                  ? 'trained-no'
                  : '${field.fieldName}-no'),
              label: context.translate(i18.common.no),
              selected: !_trainedEndUser,
              onPressed: widget.readOnly
                  ? () {}
                  : () {
                      setState(() => _trainedEndUser = false);
                      _saveSoon();
                    },
            ),
          ),
        ]),
      );
    }
    if (field.isMedia) {
      return LabeledField(
        key: ValueKey('machine-${field.fieldName}'),
        label: field.title,
        isRequired: field.requiredField,
        capitalizedFirstLetter: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              field.requiredLabel,
              style: Theme.of(context).digitTextTheme(context).bodyS.copyWith(
                    color: Theme.of(context).colorTheme.text.secondary,
                  ),
            ),
            const SizedBox(height: spacer2),
            if (widget.readOnly)
              _ReadOnlyMachineMedia(media: _mediaFor(field.fieldName))
            else if (field.type == 'video')
              VideoUploader(
                key: ValueKey(switch (field.fieldName) {
                  'MACHINE_DEMO_VIDEO' => 'demo-video-picker',
                  _ => 'machine-media-${field.fieldName}',
                }),
                initialVideos: _mediaFor(field.fieldName),
                allowMultiples: field.allowMultiples,
                maxVideos: field.requiredCount,
                pickMedia: _pickSolarMedia,
                permissionGateway:
                    widget.pickMedia == null ? defaultPermissionGateway : null,
                onVideosSelected: (files) =>
                    unawaited(_setSchemaMedia(field, files)),
              )
            else
              ImageUploader(
                key: ValueKey(switch (field.fieldName) {
                  'MACHINE_ELECTRIC_BOARD' => 'electric-board-picker',
                  'MACHINE_END_USER_PHOTO' => 'end-user-photo-picker',
                  _ => 'machine-media-${field.fieldName}',
                }),
                initialImages: _mediaFor(field.fieldName),
                allowMultiples: field.allowMultiples,
                maxImages: field.requiredCount,
                pickMedia: widget.pickMedia == null ? null : _pickSolarMedia,
                permissionGateway:
                    widget.pickMedia == null ? defaultPermissionGateway : null,
                onImagesSelected: (files) =>
                    unawaited(_setSchemaMedia(field, files)),
              ),
          ],
        ),
      );
    }
    return _TextField(
      key: ValueKey(switch (field.fieldName) {
        'poNumber' => 'po-number-field',
        'serialNumber' => 'machine-serial-field',
        'invoiceNumber' => 'invoice-number-field',
        'capacity' => 'machine-capacity-field',
        'warrantyDuration' => 'warranty-years-field',
        _ => 'machine-${field.fieldName}',
      }),
      label: field.title,
      hint: field.title,
      controller: _controllerFor(field.fieldName),
      isRequired: field.requiredField,
      keyboardType:
          field.type == 'number' ? TextInputType.number : TextInputType.text,
      inputFormatters: field.type == 'number'
          ? [FilteringTextInputFormatter.digitsOnly]
          : null,
      onChanged: _refresh,
      disabled: widget.readOnly,
    );
  }

  Future<void> _openSuccess(MachineReportSuccessMode mode) async {
    FocusManager.instance.primaryFocus?.unfocus();
    if (_schema == null || !_formComplete) return;
    _refreshMediaLocations();
    if (!documentsReady(_formMedia.values.expand((files) => files))) return;
    await _save();
    if (mode == MachineReportSuccessMode.draft) {
      await pendingSubmissionRepository.saveDraft(
        widget.workflow,
        workflowMode: _workflowMode,
      );
      if (!mounted) return;
      _refreshCounts();
    }
    if (!mounted) return;
    context.router.push(MachineReportSuccessRoute(mode: mode));
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
    FocusManager.instance.primaryFocus?.unfocus();
    _refreshMediaLocations();
    if (!_otpVerified || !_formComplete) return;
    final activityFacilityId = widget.workflow.activityFacility.id;
    final facilityId = widget.workflow.activityFacility.facilityId;
    if (activityFacilityId == null || facilityId == null) return;
    _submissionStartInFlight = true;
    try {
      if (persistOtpApproval) {
        await pendingSubmissionRepository.markOtpVerified(
          widget.workflow,
          workflowMode: _workflowMode,
        );
      }
      await _save();
      await installationCacheRepository.ensureSubmissionPayload(
        activityFacilityId,
        () => buildMachineSubmissionPayload(
          workflow: widget.workflow,
          values: _formValues,
          media: _formMedia,
          assetId: _assetId,
        ),
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

  void _refreshMediaLocations() {
    for (final field in _schema?.fields ?? const <MachineFormField>[]) {
      if (!field.isMedia) continue;
      _mediaByField[field.fieldName] = _mediaFor(field.fieldName)
          .map((media) =>
              media.isRemote ? media : refreshDocumentLocation(context, media))
          .toList();
    }
  }

  void _onRetrySubmit() => unawaited(_startSubmission(
        persistOtpApproval: false,
        preserveExistingPayload: true,
      ));

  @override
  Widget build(BuildContext context) {
    observeDocumentLocation(context);
    _refreshMediaLocationsSilently();
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    return BlocConsumer<AssetSubmissionBloc, AssetSubmissionState>(
      listener: (context, state) {
        if (state is AssetSubmissionSuccess) {
          context.read<AssetSubmissionBloc>().add(const DismissSubmission());
          context.router.push(MachineReportSuccessRoute(
              mode: MachineReportSuccessMode.submitted));
        }
      },
      builder: (context, state) => Stack(
        children: [
          _buildScaffold(context, theme, textTheme),
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

  void _refreshMediaLocationsSilently() {
    for (final entry in _mediaByField.entries.toList()) {
      _mediaByField[entry.key] = entry.value
          .map((file) =>
              file.isRemote ? file : refreshDocumentLocation(context, file))
          .toList();
    }
  }

  Widget _buildScaffold(
    BuildContext context,
    ThemeData theme,
    DigitTextTheme textTheme,
  ) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: spacer2),
        child: ScrollableContent(
          key: ValueKey('machine-form-${widget.workflow.facilityTitle}'),
          enableFixedDigitButton: !widget.readOnly,
          backgroundColor: theme.colorTheme.generic.background,
          header: ReportNavigationHeader(
            onBackPressed: () => context.router.maybePop(),
          ),
          footer: widget.readOnly
              ? null
              : _MachineFormFooter(
                  canSubmit: _formComplete,
                  otpVerified: _otpVerified,
                  onSaveDraft: () =>
                      _openSuccess(MachineReportSuccessMode.draft),
                  onSubmit: _submit,
                ),
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: spacer2,
                vertical: spacer4,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _schema?.title ??
                        context.translate(i18.machineForm.machineReportTitle),
                    style: textTheme.headingXl.copyWith(
                      color: theme.colorTheme.primary.primary2,
                    ),
                  ),
                  const SizedBox(height: spacer8),
                  if (!_schemaLoaded)
                    const Center(child: CircularProgressIndicator())
                  else if (_schema == null)
                    const DigitCard(children: [
                      Text('Machine form configuration is unavailable.'),
                    ])
                  else
                    DigitCard(
                      key: const ValueKey('machine-form-card'),
                      children: [
                        for (final field in _schema!.fields) ...[
                          _buildSchemaField(field),
                          const SizedBox(height: spacer5),
                        ],
                        if (widget.readOnly || _workflowMode == 'resubmission')
                          WorkflowReportDocuments(
                            key: const ValueKey(
                                'machine-workflow-report-documents'),
                            documents:
                                widget.workflow.workflow?.documents ?? const [],
                          ),
                        if (_workflowMode == 'resubmission')
                          WorkflowRejectionReasons(
                            panelKey: const ValueKey(
                                'machine-rejection-reasons-panel'),
                            comments: widget.workflow.latestTransactionComments,
                            showSectionLabel: true,
                          ),
                        if (!widget.readOnly)
                          OtpVerificationWidget(
                            key: const ValueKey('machine-otp-widget'),
                            keyPrefix: 'machine',
                            activityFacilityId:
                                widget.workflow.activityFacility.id ?? '',
                            initiallyRequested: _otpRequested,
                            initiallyVerified: _otpVerified,
                            isEnabled: _formComplete,
                            onRequestSucceeded: _onOtpRequested,
                            onVerificationSucceeded: _onOtpVerified,
                            onVerificationChanged: (verified) =>
                                setState(() => _otpVerified = verified),
                          ),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReadOnlyMachineMedia extends StatelessWidget {
  const _ReadOnlyMachineMedia({required this.media});
  final List<SolarFileRef> media;

  @override
  Widget build(BuildContext context) => media.isEmpty
      ? Container(
          height: 120,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(color: const DigitColors().light.genericDivider),
          ),
          child: const Text('No media available'),
        )
      : Wrap(
          spacing: spacer2,
          runSpacing: spacer2,
          children: [
            for (final file in media)
              MediaThumbnail(
                media: file,
                width: media.length == 1 ? double.infinity : Base.imageSize,
                height: media.length == 1 ? 180 : Base.imageSize,
              ),
          ],
        );
}

class _TextField extends StatelessWidget {
  const _TextField({
    super.key,
    required this.label,
    required this.hint,
    required this.controller,
    required this.onChanged,
    this.isRequired = false,
    this.keyboardType,
    this.inputFormatters,
    this.disabled = false,
  });

  final String label;
  final String hint;
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final bool isRequired;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    return LabeledField(
      label: label,
      isRequired: isRequired,
      capitalizedFirstLetter: false,
      child: DigitTextFormInput(
        controller: controller,
        isRequired: isRequired,
        innerLabel: hint,
        keyboardType: keyboardType,
        inputFormatters: inputFormatters,
        isDisabled: disabled,
        readOnly: disabled,
        onChange: onChanged,
      ),
    );
  }
}

class _TrainingChoice extends StatelessWidget {
  const _TrainingChoice({
    super.key,
    required this.label,
    required this.selected,
    required this.onPressed,
  });

  final String label;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    return InkWell(
      onTap: onPressed,
      child: Container(
        height: spacer12,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected
              ? theme.colorTheme.primary.primary1
              : theme.colorTheme.generic.background,
          borderRadius: BorderRadius.circular(spacer1),
        ),
        child: Text(
          label,
          style: textTheme.headingS.copyWith(
            color: selected
                ? theme.colorTheme.paper.primary
                : theme.colorTheme.text.primary,
          ),
        ),
      ),
    );
  }
}

class _MachineFormFooter extends StatelessWidget {
  const _MachineFormFooter({
    required this.canSubmit,
    required this.otpVerified,
    required this.onSaveDraft,
    required this.onSubmit,
  });

  final bool canSubmit;
  final bool otpVerified;
  final VoidCallback onSaveDraft;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return DigitCard(
      key: const ValueKey('machine-form-footer'),
      margin: const EdgeInsets.only(top: spacer2),
      children: [
        Row(
          children: [
            Expanded(
              child: DigitButton(
                key: const ValueKey('save-draft-button'),
                mainAxisSize: MainAxisSize.max,
                label: context.translate(i18.machineForm.saveAsDraft),
                onPressed: onSaveDraft,
                isDisabled: !canSubmit,
                type: DigitButtonType.secondary,
                size: DigitButtonSize.large,
              ),
            ),
            const SizedBox(width: spacer4),
            Expanded(
              child: DigitButton(
                key: const ValueKey('submit-machine-report-button'),
                mainAxisSize: MainAxisSize.max,
                label: context.translate(i18.machineForm.submitReport),
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
