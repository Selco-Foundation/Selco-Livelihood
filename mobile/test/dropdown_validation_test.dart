import 'package:digit_forms_engine/models/property_schema/property_schema.dart';
import 'package:digit_ui_components/digit_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:reactive_forms/reactive_forms.dart';
import 'package:livelihood/utils/dropdown_validation.dart';
import 'package:livelihood/blocs/localization/app_localization.dart';
import 'package:livelihood/data/nosql/localization.dart';
import 'package:livelihood/utils/i18_key_constants.dart' as i18;
import 'package:livelihood/widgets/predefined_dropdown_field.dart';

PropertySchema field() => PropertySchema.fromJson({
      'type': 'string',
      'format': 'dropdown',
      'label': 'Weather',
      'enums': [
        {'code': 'CLEAR', 'name': 'Clear sky'},
        {'code': 'RAIN', 'name': 'Rain'}
      ],
      'validations': [
        {'type': 'required', 'value': true}
      ],
    });

void main() {
  setUp(() {
    AppLocalizations.debugSeedLocalizations([
      Localization()
        ..code = i18.common.selectAvailableOption
        ..message = 'Choisissez une option disponible'
        ..module = 'rainmaker-common'
        ..locale = 'fr_FR',
      Localization()
        ..code = 'Weather'
        ..message = 'Météo'
        ..module = 'rainmaker-common'
        ..locale = 'fr_FR',
    ]);
  });
  tearDown(() => AppLocalizations.debugSeedLocalizations(const []));

  test('membership accepts only codes, with optional empty values', () {
    expect(dropdownValueAllowed('CLEAR', ['CLEAR']), isTrue);
    expect(dropdownValueAllowed('Clear sky', ['CLEAR']), isFalse);
    expect(dropdownValueAllowed('unknown', ['CLEAR']), isFalse);
    expect(dropdownValueAllowed(null, []), isTrue);
    expect(dropdownValueAllowed('', []), isTrue);
    expect(dropdownValueAllowed('CLEAR', []), isFalse);
    final control = FormControl<String>(validators: [
      Validators.required,
      const DropdownOptionValidator(['CLEAR'])
    ]);
    expect(control.hasError(ValidationMessage.required), isTrue);
    control.value = 'stale';
    expect(control.hasError('dropdownOption'), isTrue);
    control.value = 'CLEAR';
    expect(control.valid, isTrue);
  });

  test('rendering override preserves original dropdown schema and metadata',
      () {
    final original = PropertySchema(
        type: PropertySchemaType.object, properties: {'weather': field()});
    final rendering = dropdownRenderingSchema(original);
    expect(
        original.properties!['weather']!.format, PropertySchemaFormat.dropdown);
    expect(
        rendering.properties!['weather']!.format, PropertySchemaFormat.custom);
    expect(rendering.properties!['weather']!.enums,
        original.properties!['weather']!.enums);
    expect(rendering.properties!['weather']!.validations,
        original.properties!['weather']!.validations);
    expect(invalidDropdownLabels({'system': original}, {'weather': 'stale'}),
        ['Weather']);
    expect(invalidDropdownLabels({'system': original}, {'weather': 'CLEAR'}),
        isEmpty);
    expect(
        invalidDropdownLabels({'system': original}, {'weather': ''}), isEmpty);
    expect(
        invalidDropdownLabels({
          'system':
              PropertySchema(type: PropertySchemaType.object, properties: {
            'weather': field().copyWith(hidden: true),
          })
        }, {
          'weather': 'stale'
        }),
        isEmpty);
  });

  Future<FormControl<String>> render(WidgetTester tester, String value,
      {bool readOnly = false}) async {
    final control = FormControl<String>(value: value, validators: [
      const DropdownOptionValidator(['CLEAR', 'RAIN'])
    ]);
    await tester.pumpWidget(MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
            body: ReactiveForm(
                formGroup: FormGroup({'weather': control}),
                child: PredefinedDropdownField(
                    name: 'weather', schema: field(), readOnly: readOnly)))));
    return control;
  }

  testWidgets('MDMS dropdown disables typing, opens options and saves code',
      (tester) async {
    final control = await render(tester, 'CLEAR');
    final dropdown = tester
        .widget<DigitDropdown<String>>(find.byType(DigitDropdown<String>));
    expect(dropdown.isSearchable, isFalse);
    expect(find.text('Météo'), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).readOnly, isTrue);
    await tester.tap(find.byType(TextField));
    await tester.pumpAndSettle();
    expect(find.text('Rain'), findsWidgets);
    await tester.tap(find.text('Rain').last);
    await tester.pumpAndSettle();
    expect(control.value, 'RAIN');
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 1));
  });

  testWidgets('unknown restored code shows error and can be corrected',
      (tester) async {
    final control = await render(tester, 'stale');
    expect(find.text('Choisissez une option disponible'), findsOneWidget);
    expect(control.invalid, isTrue);
    final dropdown = tester
        .widget<DigitDropdown<String>>(find.byType(DigitDropdown<String>));
    dropdown.onSelect!(const DropdownItem(code: 'CLEAR', name: 'Clear sky'));
    await tester.pumpAndSettle();
    expect(control.valid, isTrue);
    expect(find.text('Choisissez une option disponible'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 1));
  });

  testWidgets(
      'read-only historical code stays visible without error or changes',
      (tester) async {
    final control = await render(tester, 'stale', readOnly: true);
    expect(find.text('stale'), findsOneWidget);
    expect(find.text('Choisissez une option disponible'), findsNothing);
    await tester.tap(find.byType(TextField));
    await tester.pumpAndSettle();
    expect(find.text('Rain'), findsNothing);
    expect(control.value, 'stale');
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 1));
  });
}
