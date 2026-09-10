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
import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../model/facility_report.dart';
import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../model/solar_installation_draft.dart';
import '../repositories/asset_repository.dart';
import '../repositories/installation_cache_repo.dart';
import '../router/app_router.dart';
import '../utils/app_permission_gateway.dart';
import '../utils/feature_flags.dart';
import '../utils/submission_payload.dart';
import '../widgets/machine_media_picker.dart';
import '../widgets/operation_progress_overlay.dart';
import '../widgets/otp_verification_widget.dart';
import '../widgets/report_navigation_header.dart';
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

  XFile? _electricBoardPhoto;
  XFile? _demoVideo;
  XFile? _endUserPhoto;
  SolarFileRef? _electricBoardMedia;
  SolarFileRef? _demoMedia;
  SolarFileRef? _endUserMedia;
  bool _trainedEndUser = true;
  bool _otpVerified = false;

  String get _cacheKey => widget.workflow.activityFacilityCacheKey;

  @override
  void initState() {
    super.initState();
    _seed(widget.workflow.activityFacility.additionalDetails?.bom ?? const {});
    unawaited(_loadDraft());
  }

  bool get _canSubmit =>
      _poController.text.trim().isNotEmpty &&
      _capacityController.text.trim().isNotEmpty &&
      _warrantyController.text.trim().isNotEmpty &&
      (_electricBoardPhoto != null || _electricBoardMedia != null) &&
      (_demoVideo != null || _demoMedia != null) &&
      (_endUserPhoto != null || _endUserMedia != null) &&
      (otpVerificationBypassed || _otpVerified);

  @override
  void dispose() {
    _poController.dispose();
    _serialController.dispose();
    _invoiceController.dispose();
    _capacityController.dispose();
    _warrantyController.dispose();
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

  void _refresh([String? _]) {
    setState(() {});
    _saveSoon();
  }

  void _seed(Map<String, dynamic> values) {
    _poController.text =
        (values['poNumber'] ?? values['po_number'] ?? _poController.text)
            .toString();
    _serialController.text = (values['serialNumber'] ??
            values['serial_number'] ??
            _serialController.text)
        .toString();
    _invoiceController.text = (values['invoiceNumber'] ??
            values['manufacturerInvoiceNumber'] ??
            _invoiceController.text)
        .toString();
    _capacityController.text = (values['capacity'] ??
            values['machineCapacity'] ??
            _capacityController.text)
        .toString();
    _warrantyController.text = (values['warrantyYears'] ??
            values['warranty'] ??
            _warrantyController.text)
        .toString();
    if (values['trainedEndUser'] is bool) {
      _trainedEndUser = values['trainedEndUser'] as bool;
    }
  }

  Future<void> _loadDraft() async {
    if (widget.readOnly && _cacheKey.isNotEmpty) {
      final assets = await assetRepository.search(_cacheKey);
      if (assets.isNotEmpty) {
        final asset = assets.first;
        final details = asset['additionalDetails'] is Map
            ? Map<String, dynamic>.from(asset['additionalDetails'] as Map)
            : <String, dynamic>{};
        details['serialNumber'] ??= asset['serialNumber'];
        _seed(details);
        _loadDocuments(asset['documents']);
      }
    }
    final cached =
        await installationCacheRepository.getJson('machine-draft', _cacheKey);
    if (!widget.readOnly && cached is Map) {
      final values = Map<String, dynamic>.from(cached);
      _seed(values);
      _trainedEndUser = values['trainedEndUser'] != false;
      _electricBoardMedia = _media(values['electricBoardPhoto']);
      _demoMedia = _media(values['demoVideo']);
      _endUserMedia = _media(values['endUserPhoto']);
      _electricBoardPhoto = _xfile(_electricBoardMedia);
      _demoVideo = _xfile(_demoMedia);
      _endUserPhoto = _xfile(_endUserMedia);
    }
    if (mounted) setState(() {});
  }

  void _loadDocuments(dynamic value) {
    final documents = (value as List<dynamic>? ?? const []).whereType<Map>();
    for (final raw in documents) {
      final document = Map<String, dynamic>.from(raw);
      final type = (document['documentType'] ?? document['type'] ?? '')
          .toString()
          .toLowerCase();
      final id =
          (document['fileStoreId'] ?? document['fileStore'] ?? '').toString();
      if (id.isEmpty) continue;
      final kind =
          type.contains('video') ? SolarFileKind.video : SolarFileKind.image;
      final media = SolarFileRef(
        name: (document['fileName'] ?? document['name'] ?? type).toString(),
        path: id,
        remoteId: id,
        documentType: type,
        kind: kind,
      );
      if (type.contains('electric')) {
        _electricBoardMedia = media;
      } else if (kind == SolarFileKind.video) {
        _demoMedia = media;
      } else {
        _endUserMedia = media;
      }
    }
  }

  SolarFileRef? _media(dynamic value) => value is Map
      ? SolarFileRef.fromJson(Map<String, dynamic>.from(value))
      : null;

  XFile? _xfile(SolarFileRef? value) => value == null || value.isRemote
      ? null
      : XFile(value.localPath ?? value.path, name: value.name);

  Future<void> _save() {
    if (_cacheKey.isEmpty) return Future.value();
    return installationCacheRepository.putJson('machine-draft', _cacheKey, {
      'poNumber': _poController.text,
      'serialNumber': _serialController.text,
      'invoiceNumber': _invoiceController.text,
      'capacity': _capacityController.text,
      'warrantyYears': _warrantyController.text,
      'trainedEndUser': _trainedEndUser,
      if (_electricBoardMedia != null)
        'electricBoardPhoto': _electricBoardMedia!.toJson(),
      if (_demoMedia != null) 'demoVideo': _demoMedia!.toJson(),
      if (_endUserMedia != null) 'endUserPhoto': _endUserMedia!.toJson(),
    });
  }

  void _saveSoon() {
    if (!widget.readOnly) unawaited(_save());
  }

  Future<void> _setMedia(MachineMediaKind kind, XFile? file) async {
    SolarFileRef? persisted;
    if (file != null) {
      final ref = SolarFileRef(
        name: file.name,
        path: file.path,
        kind: kind == MachineMediaKind.video
            ? SolarFileKind.video
            : SolarFileKind.image,
      );
      setState(() {
        if (kind == MachineMediaKind.video) {
          _demoVideo = file;
          _demoMedia = ref;
        }
      });
      persisted = await installationCacheRepository.persistMediaRef(
        ref,
        '$_cacheKey-${kind.name}-${DateTime.now().millisecondsSinceEpoch}',
      );
    }
    if (!mounted) return;
    setState(() {
      if (kind == MachineMediaKind.video) {
        _demoVideo =
            file == null ? null : XFile(persisted!.path, name: persisted.name);
        _demoMedia = persisted;
      }
    });
    _saveSoon();
  }

  void _openSuccess(MachineReportSuccessMode mode) {
    FocusManager.instance.primaryFocus?.unfocus();
    unawaited(_save());
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
  Future<void> _submit() async {
    FocusManager.instance.primaryFocus?.unfocus();
    final activityFacilityId = widget.workflow.activityFacility.id;
    final facilityId = widget.workflow.activityFacility.facilityId;
    if (activityFacilityId == null || facilityId == null) return;
    await _save();
    await installationCacheRepository.putJson(
      'submission-payload',
      activityFacilityId,
      buildMachineSubmissionPayload(
        workflow: widget.workflow,
        poNumber: _poController.text.trim(),
        serialNumber: _serialController.text.trim(),
        invoiceNumber: _invoiceController.text.trim(),
        capacity: _capacityController.text.trim(),
        warrantyYears: _warrantyController.text.trim(),
        trainedEndUser: _trainedEndUser,
        electricBoardMedia: _electricBoardMedia,
        demoMedia: _demoMedia,
        endUserMedia: _endUserMedia,
      ),
    );
    if (!mounted) return;
    context.read<AssetSubmissionBloc>().add(SubmitAll(
          activityFacilityId: activityFacilityId,
          facilityId: facilityId,
        ));
  }

  void _onRetrySubmit() {
    final activityFacilityId = widget.workflow.activityFacility.id;
    final facilityId = widget.workflow.activityFacility.facilityId;
    if (activityFacilityId == null || facilityId == null) return;
    context.read<AssetSubmissionBloc>().add(RetrySubmission(
          activityFacilityId: activityFacilityId,
          facilityId: facilityId,
        ));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    return BlocConsumer<AssetSubmissionBloc, AssetSubmissionState>(
      listener: (context, state) {
        if (state is AssetSubmissionSuccess) {
          context.read<AssetSubmissionBloc>().add(const DismissSubmission());
          context.router.push(
              MachineReportSuccessRoute(mode: MachineReportSuccessMode.submitted));
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
          enableFixedDigitButton: true,
          backgroundColor: theme.colorTheme.generic.background,
          header: ReportNavigationHeader(
            onBackPressed: () => context.router.maybePop(),
          ),
          footer: widget.readOnly
              ? null
              : _MachineFormFooter(
                  canSubmit: _canSubmit,
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
                    context.translate(i18.machineForm.machineReportTitle),
                    style: textTheme.headingXl.copyWith(
                      color: theme.colorTheme.primary.primary2,
                    ),
                  ),
                  const SizedBox(height: spacer8),
                  DigitCard(
                    key: const ValueKey('machine-form-card'),
                    children: [
                      _TextField(
                        key: const ValueKey('po-number-field'),
                        label: context.translate(i18.machineForm.poNumber),
                        hint: context.translate(i18.machineForm.enterPoNumber),
                        controller: _poController,
                        isRequired: true,
                        onChanged: _refresh,
                        disabled: widget.readOnly,
                      ),
                      const SizedBox(height: spacer5),
                      _TextField(
                        key: const ValueKey('machine-serial-field'),
                        label: context
                            .translate(i18.machineForm.machineSerialNumber),
                        hint: context
                            .translate(i18.machineForm.enterSerialNumber),
                        controller: _serialController,
                        onChanged: _refresh,
                        disabled: widget.readOnly,
                      ),
                      const SizedBox(height: spacer5),
                      _TextField(
                        key: const ValueKey('invoice-number-field'),
                        label: context.translate(
                            i18.machineForm.manufacturerInvoiceNumber),
                        hint: context
                            .translate(i18.machineForm.enterInvoiceNumber),
                        controller: _invoiceController,
                        onChanged: _refresh,
                        disabled: widget.readOnly,
                      ),
                      const SizedBox(height: spacer5),
                      _TextField(
                        key: const ValueKey('machine-capacity-field'),
                        label:
                            context.translate(i18.machineForm.machineCapacity),
                        hint: context.translate(i18.machineForm.enterCapacity),
                        controller: _capacityController,
                        isRequired: true,
                        onChanged: _refresh,
                        disabled: widget.readOnly,
                      ),
                      const SizedBox(height: spacer5),
                      _TextField(
                        key: const ValueKey('warranty-years-field'),
                        label: context.translate(i18.machineForm.warrantyYears),
                        hint: context.translate(i18.machineForm.enterYears),
                        controller: _warrantyController,
                        isRequired: true,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly
                        ],
                        onChanged: _refresh,
                        disabled: widget.readOnly,
                      ),
                      const SizedBox(height: spacer5),
                      LabeledField(
                        label: context.translate(i18.machineForm.electricBoard),
                        isRequired: true,
                        capitalizedFirstLetter: false,
                        child: widget.readOnly
                            ? _ReadOnlyMachineMedia(media: _electricBoardMedia)
                            : MachineMediaPicker(
                                key: const ValueKey('electric-board-picker'),
                                kind: MachineMediaKind.image,
                                selectedFile: _electricBoardPhoto,
                                pickMedia: _pickMedia,
                                permissionGateway: widget.pickMedia == null
                                    ? defaultPermissionGateway
                                    : null,
                                onChanged: (file) async {
                                  setState(() {
                                    _electricBoardPhoto = file;
                                    _electricBoardMedia = file == null
                                        ? null
                                        : SolarFileRef(
                                            name: file.name,
                                            path: file.path,
                                            kind: SolarFileKind.image,
                                          );
                                  });
                                  SolarFileRef? value;
                                  if (file != null) {
                                    value = await installationCacheRepository
                                        .persistMediaRef(
                                            SolarFileRef(
                                                name: file.name,
                                                path: file.path,
                                                kind: SolarFileKind.image),
                                            '$_cacheKey-electric-board');
                                  }
                                  if (!mounted) return;
                                  setState(() {
                                    _electricBoardMedia = value;
                                    _electricBoardPhoto = value == null
                                        ? null
                                        : XFile(value.path, name: value.name);
                                  });
                                  _saveSoon();
                                },
                              ),
                      ),
                      const SizedBox(height: spacer5),
                      LabeledField(
                        label:
                            context.translate(i18.machineForm.rawMaterialDemo),
                        isRequired: true,
                        capitalizedFirstLetter: false,
                        child: widget.readOnly
                            ? _ReadOnlyMachineMedia(media: _demoMedia)
                            : MachineMediaPicker(
                                key: const ValueKey('demo-video-picker'),
                                kind: MachineMediaKind.video,
                                selectedFile: _demoVideo,
                                pickMedia: _pickMedia,
                                permissionGateway: widget.pickMedia == null
                                    ? defaultPermissionGateway
                                    : null,
                                onChanged: (file) =>
                                    _setMedia(MachineMediaKind.video, file),
                              ),
                      ),
                      const SizedBox(height: spacer5),
                      LabeledField(
                        label:
                            context.translate(i18.machineForm.photoWithEndUser),
                        isRequired: true,
                        capitalizedFirstLetter: false,
                        child: widget.readOnly
                            ? _ReadOnlyMachineMedia(media: _endUserMedia)
                            : MachineMediaPicker(
                                key: const ValueKey('end-user-photo-picker'),
                                kind: MachineMediaKind.image,
                                selectedFile: _endUserPhoto,
                                pickMedia: _pickMedia,
                                permissionGateway: widget.pickMedia == null
                                    ? defaultPermissionGateway
                                    : null,
                                onChanged: (file) async {
                                  setState(() {
                                    _endUserPhoto = file;
                                    _endUserMedia = file == null
                                        ? null
                                        : SolarFileRef(
                                            name: file.name,
                                            path: file.path,
                                            kind: SolarFileKind.image,
                                          );
                                  });
                                  SolarFileRef? value;
                                  if (file != null) {
                                    value = await installationCacheRepository
                                        .persistMediaRef(
                                            SolarFileRef(
                                                name: file.name,
                                                path: file.path,
                                                kind: SolarFileKind.image),
                                            '$_cacheKey-end-user');
                                  }
                                  if (!mounted) return;
                                  setState(() {
                                    _endUserMedia = value;
                                    _endUserPhoto = value == null
                                        ? null
                                        : XFile(value.path, name: value.name);
                                  });
                                  _saveSoon();
                                },
                              ),
                      ),
                      const SizedBox(height: spacer5),
                      LabeledField(
                        label:
                            context.translate(i18.machineForm.trainedEndUser),
                        capitalizedFirstLetter: false,
                        child: Row(
                          children: [
                            Expanded(
                              child: _TrainingChoice(
                                key: const ValueKey('trained-yes'),
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
                                key: const ValueKey('trained-no'),
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
                          ],
                        ),
                      ),
                      const SizedBox(height: spacer5),
                      if (!widget.readOnly)
                        OtpVerificationWidget(
                          key: const ValueKey('machine-otp-widget'),
                          keyPrefix: 'machine',
                          activityFacilityId:
                              widget.workflow.activityFacility.id ?? '',
                          label: context
                              .translate(i18.machineForm.validateTrainingOtp),
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
  final SolarFileRef? media;

  @override
  Widget build(BuildContext context) => media == null
      ? Container(
          height: 120,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(color: const DigitColors().light.genericDivider),
          ),
          child: const Text('No media available'),
        )
      : MediaThumbnail(media: media!, width: double.infinity, height: 180);
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
    required this.onSaveDraft,
    required this.onSubmit,
  });

  final bool canSubmit;
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
                isDisabled: !canSubmit,
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
