import 'package:digit_forms_engine/models/property_schema/property_schema.dart';
import 'package:digit_forms_engine/utils/utils.dart';
import 'package:reactive_forms/reactive_forms.dart';

bool dropdownValueAllowed(Object? value, Iterable<String> codes) =>
    value == null || value == '' || codes.contains(value);

class DropdownOptionValidator extends Validator<dynamic> {
  const DropdownOptionValidator(this.codes);
  final List<String> codes;

  @override
  Map<String, dynamic>? validate(AbstractControl<dynamic> control) =>
      dropdownValueAllowed(control.value, codes)
          ? null
          : {'dropdownOption': true};
}

/// Uses the same page-qualified visibility context as the forms engine.
List<String> invalidDropdownLabels(
    Map<String, PropertySchema> pages, Map<String, dynamic> answers,
    {String? onlyPage}) {
  final context = <String, dynamic>{
    for (final page in pages.entries)
      for (final field in page.value.properties?.entries ??
          const <MapEntry<String, PropertySchema>>[])
        '${page.key}.${field.key}':
            answers[field.key] ?? field.value.value ?? '',
  };
  return [
    for (final page in pages.entries)
      if (onlyPage == null || page.key == onlyPage)
        for (final field in page.value.properties?.entries ??
            const <MapEntry<String, PropertySchema>>[])
          if (field.value.format == PropertySchemaFormat.dropdown &&
              field.value.hidden != true &&
              (field.value.visibilityCondition == null ||
                  field.value.visibilityCondition!.expression.isEmpty ||
                  evaluateVisibilityExpression(
                      field.value.visibilityCondition!.expression, context)) &&
              !dropdownValueAllowed(
                  answers.containsKey(field.key)
                      ? answers[field.key]
                      : field.value.value,
                  (field.value.enums ?? []).map((option) => option.code)))
            field.value.label ?? field.key,
  ];
}

PropertySchema dropdownRenderingSchema(PropertySchema page) => page.copyWith(
      properties: page.properties?.map((key, field) => MapEntry(
          key,
          field.format == PropertySchemaFormat.dropdown
              ? field.copyWith(format: PropertySchemaFormat.custom)
              : field)),
    );
