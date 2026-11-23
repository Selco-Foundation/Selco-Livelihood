import 'dart:io';

import 'package:digit_ui_components/widgets/atoms/digit_text_form_input.dart';
import 'package:digit_ui_components/widgets/atoms/labelled_fields.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path/path.dart' show basename;
import 'package:reactive_forms/reactive_forms.dart';

import '../../model/solar_installation_draft.dart';
import '../../utils/amc/amc_utils.dart';
import '../../utils/extensions.dart';
import '../../utils/i18_key_constants.dart' as i18;
import '../image_uploader.dart';

/// The AMC form's `format: custom` fields, which `digit_forms_engine`
/// has no widget for: a decimal reading (its number field takes whole
/// numbers only) and a per-reading photo. Both bind to the field's form
/// control, so the engine's required/visibility rules still apply.
Widget amcCustomFormField({
  required String fieldName,
  required String? label,
  required bool isRequired,
  required bool readOnly,
}) =>
    isAmcReadingPhotoField(fieldName)
        ? AmcReadingPhotoField(
            key: ValueKey('amc-photo-$fieldName'),
            formControlName: fieldName,
            label: label,
            isRequired: isRequired,
            readOnly: readOnly,
          )
        : AmcDecimalReadingField(
            key: ValueKey('amc-decimal-$fieldName'),
            formControlName: fieldName,
            label: label,
            isRequired: isRequired,
            readOnly: readOnly,
          );

/// Accepts digits with at most one decimal point ("230", "0.5", "12.").
final amcDecimalInputFormatter =
    FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'));

/// A number with optional decimals, stored as text ("230.5").
class AmcDecimalReadingField extends StatelessWidget {
  const AmcDecimalReadingField({
    super.key,
    required this.formControlName,
    this.label,
    this.isRequired = false,
    this.readOnly = false,
  });

  final String formControlName;
  final String? label;
  final bool isRequired;
  final bool readOnly;

  @override
  Widget build(BuildContext context) {
    return ReactiveFormField<dynamic, dynamic>(
      formControlName: formControlName,
      builder: (field) {
        final control = field.control;
        final showError = control.invalid && control.touched;
        return LabeledField(
          label: label,
          isRequired: isRequired,
          capitalizedFirstLetter: false,
          charCondition: true,
          child: DigitTextFormInput(
            initialValue: control.value?.toString(),
            readOnly: readOnly,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [amcDecimalInputFormatter],
            errorMessage:
                showError ? context.translate(i18.amcCommon.isRequired) : null,
            onChange: (value) {
              control.markAsTouched();
              final text = value.trim();
              control.value = text.isEmpty || text == '.' ? null : text;
            },
          ),
        );
      },
    );
  }
}

/// One photo for a reading. The control holds the photo's local path, or
/// its filestore id when it comes from a submitted report.
class AmcReadingPhotoField extends StatefulWidget {
  const AmcReadingPhotoField({
    super.key,
    required this.formControlName,
    this.label,
    this.isRequired = false,
    this.readOnly = false,
  });

  final String formControlName;
  final String? label;
  final bool isRequired;
  final bool readOnly;

  @override
  State<AmcReadingPhotoField> createState() => _AmcReadingPhotoFieldState();
}

class _AmcReadingPhotoFieldState extends State<AmcReadingPhotoField> {
  String? _loadedFor;
  File? _file;
  bool _loading = false;

  Future<void> _load(String? value) async {
    if (value == _loadedFor) return;
    _loadedFor = value;
    if (value == null || value.isEmpty) {
      setState(() => _file = null);
      return;
    }
    setState(() => _loading = true);
    final file = await getCachedFile(value);
    if (!mounted || _loadedFor != value) return;
    setState(() {
      _file = file;
      _loading = false;
    });
  }

  Future<void> _onSelected(
      AbstractControl<dynamic> control, List<SolarFileRef> images) async {
    control.markAsTouched();
    if (images.isEmpty) {
      _loadedFor = null;
      control.value = null;
      return;
    }
    final picked = images.first;
    final copied =
        await copyFileToLocalDir(File(picked.localPath ?? picked.path));
    if (!mounted) return;
    _loadedFor = copied;
    setState(() => _file = File(copied));
    control.value = copied;
  }

  @override
  Widget build(BuildContext context) {
    return ReactiveFormField<dynamic, dynamic>(
      formControlName: widget.formControlName,
      builder: (field) {
        final control = field.control;
        final value = control.value?.toString();
        if (value != _loadedFor) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) _load(value);
          });
        }
        final showError = control.invalid && control.touched;
        return LabeledField(
          label: widget.label,
          isRequired: widget.isRequired,
          capitalizedFirstLetter: false,
          charCondition: true,
          child: _loading
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator()),
                )
              : ImageUploader(
                  // Rebuilt when the photo changes, so it shows the new one.
                  key: ValueKey('${widget.formControlName}:${_file?.path}'),
                  isDisabled: widget.readOnly,
                  errorMessage: showError
                      ? context.translate(i18.amcForm.photoRequired)
                      : null,
                  initialImages: [
                    if (_file != null)
                      SolarFileRef(
                        name: basename(_file!.path),
                        path: _file!.path,
                        localPath: _file!.path,
                        kind: SolarFileKind.image,
                      ),
                  ],
                  onImagesSelected: (images) => _onSelected(control, images),
                ),
        );
      },
    );
  }
}
