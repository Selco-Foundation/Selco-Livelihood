import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:reactive_forms/reactive_forms.dart';
import 'package:livelihood/utils/dynamic_form_schema.dart';
import 'package:livelihood/widgets/system_recording_time_field.dart';

import 'package:livelihood/model/activity_facility/activity_facility.dart';
import 'package:livelihood/model/activity_facility_workflow/activity_facility_workflow.dart';
import 'package:livelihood/model/mdms/asset_registry_response.dart';
import 'package:livelihood/model/solar_installation_draft.dart';
import 'package:livelihood/repositories/asset_mdms_repository.dart';
import 'package:livelihood/repositories/installation_draft_repository.dart';
import 'package:livelihood/utils/envConfig.dart';
import 'package:livelihood/utils/submission_payload.dart';

void main() {
  setUpAll(() async => envConfig.initialize());

  test('draft restoration and BOM payload preserve the selected clock string',
      () async {
    final repository = InstallationDraftRepository(
      mdmsRepository:
          AssetMdmsRepository(initial: const AssetRegistryMdmsResponse()),
      bomSearch: (_) async => [],
      assetSearch: (_) async => [],
      localDraft: (_) async => {
        'dynamicFormAnswers': {
          'AssetForm.LIVELIHOOD_COMMON_BOM_system': {
            'system_time_of_recording': '09:05'
          },
        },
        'mergedBom': {'system_time_of_recording': '09:05'},
      },
    );
    final draft = SolarInstallationDraft(
      workflow: const ActivityFacilityWorkflow(
          activityFacility: ActivityFacility(id: 'time-test')),
      mode: SolarWorkflowMode.newReport,
    );
    await repository.hydrateSolar(draft);
    expect(
        draft.dynamicFormAnswers['AssetForm.LIVELIHOOD_COMMON_BOM_system']![
            'system_time_of_recording'],
        '09:05');
    final payload = buildSolarSubmissionPayload(draft);
    expect(payload['bom']['data']['system_time_of_recording'], '09:05');
  });

  test('only the System Parameters recording field becomes custom', () {
    Map<String, dynamic> schema(String name) => transformBomMdmsRecordToSchema({
          'name': name,
          'pages': [
            {
              'page': 'system',
              'properties': [
                {
                  'fieldName': 'system_time_of_recording',
                  'type': 'string',
                  'format': 'text',
                  'label': 'Time',
                  'order': 2
                },
                {'fieldName': 'date', 'type': 'string', 'format': 'date'},
                {
                  'fieldName': 'weather',
                  'type': 'string',
                  'format': 'dropdown'
                },
              ],
            },
          ],
        });
    final properties = schema('AssetForm.LIVELIHOOD_COMMON_BOM_system')['pages']
        ['system']['properties'];
    expect(properties['system_time_of_recording'], {
      'fieldName': 'system_time_of_recording',
      'type': 'string',
      'format': 'custom',
      'label': 'Time',
      'order': 2,
    });
    expect(properties['date']['format'], 'date');
    expect(properties['weather']['format'], 'dropdown');
    expect(
        schema('BOM_solar')['pages']['system']['properties']
            ['system_time_of_recording']['format'],
        'text');
  });

  test(
      'clock parsing and formatting handles boundaries and invalid legacy values',
      () {
    for (final value in ['00:00', '09:05', '12:00', '23:59']) {
      expect(
          SystemRecordingTimeField.format(
              SystemRecordingTimeField.parse(value)!),
          value);
    }
    expect(SystemRecordingTimeField.format(const TimeOfDay(hour: 9, minute: 5)),
        '09:05');
    for (final value in [null, '', 'legacy text', '24:00', '12:60']) {
      expect(SystemRecordingTimeField.parse(value), isNull);
    }
  });

  Future<FormGroup> render(WidgetTester tester, String value,
      {bool readOnly = false}) async {
    final form = FormGroup({'time': FormControl<String>(value: value)});
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: ReactiveForm(
      formGroup: form,
      child: SystemRecordingTimeField(
          formControlName: 'time',
          label: 'Time of recording',
          readOnly: readOnly),
    ))));
    return form;
  }

  testWidgets('saved time initializes picker; confirming stores HH:mm',
      (tester) async {
    final form = await render(tester, '09:05');
    expect(tester.widget<TextField>(find.byType(TextField)).readOnly, isTrue);
    await tester.tap(find.byType(TextField));
    await tester.pumpAndSettle();
    final picker =
        tester.widget<TimePickerDialog>(find.byType(TimePickerDialog));
    expect(picker.initialTime, const TimeOfDay(hour: 9, minute: 5));
    expect(picker.initialEntryMode, TimePickerEntryMode.dialOnly);
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
    expect(form.control('time').value, '09:05');
    expect(form.control('time').touched, isTrue);
  });

  testWidgets('cancel preserves invalid legacy text', (tester) async {
    final form = await render(tester, 'legacy text');
    await tester.tap(find.byType(TextField));
    await tester.pumpAndSettle();
    expect(find.byType(TimePickerDialog), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(form.control('time').value, 'legacy text');
    expect(find.text('legacy text'), findsOneWidget);
  });

  testWidgets('read-only field displays saved time without opening picker',
      (tester) async {
    final form = await render(tester, '17:30', readOnly: true);
    await tester.tap(find.byType(TextField));
    await tester.pumpAndSettle();
    expect(find.byType(TimePickerDialog), findsNothing);
    expect(form.control('time').value, '17:30');
    expect(find.text('17:30'), findsOneWidget);
  });
}
