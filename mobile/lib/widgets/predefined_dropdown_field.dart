import 'package:digit_forms_engine/models/property_schema/property_schema.dart';
import 'package:digit_forms_engine/helper/validator_helper.dart';
import 'package:digit_ui_components/digit_components.dart';
import 'package:flutter/material.dart';
import 'package:reactive_forms/reactive_forms.dart';
import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../utils/dropdown_validation.dart';

class PredefinedDropdownField extends StatelessWidget {
  const PredefinedDropdownField(
      {super.key,
      required this.name,
      required this.schema,
      required this.readOnly});
  final String name;
  final PropertySchema schema;
  final bool readOnly;

  @override
  Widget build(BuildContext context) => ReactiveValueListenableBuilder<String>(
        formControlName: name,
        builder: (context, control, child) {
          final options = schema.enums ?? [];
          final selected =
              options.where((option) => option.code == control.value);
          return LabeledField(
            label: context.translate(schema.label ?? name),
            capitalizedFirstLetter: false,
            isRequired: hasRequiredValidation(schema.validations),
            infoText: context.translate(schema.tooltip ?? ''),
            child: DigitDropdown<String>(
              key: ValueKey('predefined-dropdown-$name'),
              isSearchable: false,
              readOnly: readOnly || schema.readOnly == true,
              helpText: context.translate(schema.helpText ?? ''),
              errorMessage: !readOnly &&
                      !dropdownValueAllowed(
                          control.value, options.map((option) => option.code))
                  ? context.translate(i18.common.selectAvailableOption)
                  : !readOnly && control.invalid && control.touched
                      ? context.translate(i18.common.selectAvailableOption)
                      : null,
              selectedOption: control.value == null || control.value == ''
                  ? null
                  : DropdownItem(
                      code: control.value!,
                      name: selected.isEmpty
                          ? control.value!
                          : context.translate(selected.first.name)),
              items: options
                  .map((option) => DropdownItem(
                      code: option.code, name: context.translate(option.name)))
                  .toList(),
              onSelect: (option) {
                if (readOnly || schema.readOnly == true) return;
                control.updateValue(option.code);
                control.markAsTouched();
              },
            ),
          );
        },
      );
}
