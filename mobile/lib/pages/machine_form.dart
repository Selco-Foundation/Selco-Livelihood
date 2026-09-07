import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../model/facility_report_sample.dart';
import '../router/app_router.dart';
import '../utils/app_permission_gateway.dart';
import '../widgets/machine_media_picker.dart';
import '../widgets/otp_verification_widget.dart';
import '../widgets/report_navigation_header.dart';
import 'machine_report_success_page.dart';

@RoutePage()
class MachineFormPage extends StatefulWidget {
  const MachineFormPage({
    super.key,
    required this.sample,
    this.pickMedia,
  });

  final FacilityReportSample sample;
  final MachinePickMedia? pickMedia;

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
  bool _trainedEndUser = true;
  bool _otpVerified = false;

  bool get _canSubmit =>
      _poController.text.trim().isNotEmpty &&
      _capacityController.text.trim().isNotEmpty &&
      _warrantyController.text.trim().isNotEmpty &&
      _electricBoardPhoto != null &&
      _demoVideo != null &&
      _endUserPhoto != null &&
      _otpVerified;

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

  void _refresh([String? _]) => setState(() {});

  void _openSuccess(MachineReportSuccessMode mode) {
    FocusManager.instance.primaryFocus?.unfocus();
    context.router.push(MachineReportSuccessRoute(mode: mode));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: spacer2),
        child: ScrollableContent(
          key: ValueKey('machine-form-${widget.sample.title}'),
          enableFixedDigitButton: true,
          backgroundColor: theme.colorTheme.generic.background,
          header: ReportNavigationHeader(
            onBackPressed: () => context.router.maybePop(),
          ),
          footer: _MachineFormFooter(
            canSubmit: _canSubmit,
            onSaveDraft: () => _openSuccess(MachineReportSuccessMode.draft),
            onSubmit: () => _openSuccess(MachineReportSuccessMode.submitted),
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
                      ),
                      const SizedBox(height: spacer5),
                      LabeledField(
                        label: context.translate(i18.machineForm.electricBoard),
                        isRequired: true,
                        capitalizedFirstLetter: false,
                        child: MachineMediaPicker(
                          key: const ValueKey('electric-board-picker'),
                          kind: MachineMediaKind.image,
                          selectedFile: _electricBoardPhoto,
                          pickMedia: _pickMedia,
                          permissionGateway: widget.pickMedia == null
                              ? defaultPermissionGateway
                              : null,
                          onChanged: (file) => setState(
                            () => _electricBoardPhoto = file,
                          ),
                        ),
                      ),
                      const SizedBox(height: spacer5),
                      LabeledField(
                        label:
                            context.translate(i18.machineForm.rawMaterialDemo),
                        isRequired: true,
                        capitalizedFirstLetter: false,
                        child: MachineMediaPicker(
                          key: const ValueKey('demo-video-picker'),
                          kind: MachineMediaKind.video,
                          selectedFile: _demoVideo,
                          pickMedia: _pickMedia,
                          permissionGateway: widget.pickMedia == null
                              ? defaultPermissionGateway
                              : null,
                          onChanged: (file) =>
                              setState(() => _demoVideo = file),
                        ),
                      ),
                      const SizedBox(height: spacer5),
                      LabeledField(
                        label:
                            context.translate(i18.machineForm.photoWithEndUser),
                        isRequired: true,
                        capitalizedFirstLetter: false,
                        child: MachineMediaPicker(
                          key: const ValueKey('end-user-photo-picker'),
                          kind: MachineMediaKind.image,
                          selectedFile: _endUserPhoto,
                          pickMedia: _pickMedia,
                          permissionGateway: widget.pickMedia == null
                              ? defaultPermissionGateway
                              : null,
                          onChanged: (file) => setState(
                            () => _endUserPhoto = file,
                          ),
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
                                onPressed: () =>
                                    setState(() => _trainedEndUser = true),
                              ),
                            ),
                            const SizedBox(width: spacer4),
                            Expanded(
                              child: _TrainingChoice(
                                key: const ValueKey('trained-no'),
                                label: context.translate(i18.common.no),
                                selected: !_trainedEndUser,
                                onPressed: () =>
                                    setState(() => _trainedEndUser = false),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: spacer5),
                      OtpVerificationWidget(
                        key: const ValueKey('machine-otp-widget'),
                        keyPrefix: 'machine',
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
  });

  final String label;
  final String hint;
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final bool isRequired;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;

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
