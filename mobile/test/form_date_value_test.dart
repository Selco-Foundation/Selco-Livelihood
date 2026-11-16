import 'dart:io';
import 'package:isar/isar.dart' show Isar;
import 'package:digit_forms_engine/json_forms.dart';
import 'package:livelihood/data/nosql/cache_installation_data.dart';
import 'package:livelihood/model/activity_facility/activity_facility.dart';
import 'package:livelihood/model/activity_facility_workflow/activity_facility_workflow.dart';
import 'package:livelihood/model/solar_installation_draft.dart';
import 'package:livelihood/repositories/installation_cache_repo.dart';
import 'package:livelihood/repositories/installation_draft_repository.dart';
import 'package:digit_forms_engine/models/property_schema/property_schema.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:livelihood/utils/form_date_value.dart';
import 'dart:convert';

void main() {
  final date = PropertySchema.fromJson({'type': 'string', 'format': 'date'});

  test('selected calendar date survives storage without a timezone shift', () {
    final selected = DateTime(2026, 11, 4);
    final stored = formValueForStorage(date, selected);
    expect(stored, '2026-11-04');
    expect(jsonDecode(jsonEncode({'system_date_of_recording': stored})),
        {'system_date_of_recording': '2026-11-04'});
    expect(DateTime.parse(stored), selected);
  });

  test('date-only values and legacy displayed dates retain their components',
      () {
    expect(formValueForStorage(date, '2026-11-04'), '2026-11-04');
    expect(formValueForStorage(date, '2026-11-04T18:30:00.000Z'), '2026-11-04');
    expect(
        formValueForStorage(date, DateTime.utc(2026, 11, 4, 23)), '2026-11-04');
  });

  test('empty values and non-date timestamps are unchanged', () {
    expect(formValueForStorage(date, null), isNull);
    expect(formValueForStorage(date, ''), '');
    final text = PropertySchema.fromJson({'type': 'string', 'format': 'text'});
    final timestamp = DateTime.utc(2026, 11, 4, 18, 30);
    expect(formValueForStorage(text, timestamp), same(timestamp));
  });

  test('section saves a selected date and reopens it without shifting days',
      () async {
    final directory = await Directory.systemTemp.createTemp('date-section-');
    final isar = await Isar.open([CacheInstallationDataSchema],
        directory: directory.path, inspector: false);
    addTearDown(() async {
      await isar.close(deleteFromDisk: true);
      await directory.delete(recursive: true);
    });
    final page = PropertySchema.fromJson({
      'type': 'object',
      'properties': {
        'system_date_of_recording': {'type': 'string', 'format': 'date'},
        'system_time_of_recording': {'type': 'string', 'format': 'text'},
        'measurement': {'type': 'string', 'format': 'text'},
      },
    });
    final answers = Map<String, dynamic>.from(formValueForStorage(page, {
      'system_date_of_recording': DateTime(2026, 11, 4),
      'system_time_of_recording': '09:05',
      'measurement': '12.5',
    }));
    const schemaName = 'AssetForm.LIVELIHOOD_COMMON_BOM_system';
    final draft = SolarInstallationDraft(
      workflow: const ActivityFacilityWorkflow(
          activityFacility: ActivityFacility(id: 'date-section-test')),
      mode: SolarWorkflowMode.newReport,
    );
    draft.dynamicFormAnswers[schemaName] = answers;
    draft.mergedBom.addAll(answers);
    await InstallationDraftRepository().submitSection(draft, schemaName);
    expect(draft.isSectionSubmitted(schemaName), isTrue);
    final saved = await installationCacheRepository.getJson(
        'solar-draft', draft.cacheKey);
    final restored =
        Map<String, dynamic>.from(saved['dynamicFormAnswers'][schemaName]);
    expect(restored, {
      'system_date_of_recording': '2026-11-04',
      'system_time_of_recording': '09:05',
      'measurement': '12.5',
    });
    expect(saved['mergedBom']['system_date_of_recording'], '2026-11-04');
    final controls = JsonForms.getFormControls(page, defaultValues: restored);
    expect(controls['system_date_of_recording']!.value, DateTime(2026, 11, 4));
    for (final control in controls.values) {
      control.dispose();
    }
  });

  test('nested date fields are normalized without changing other values', () {
    final object = PropertySchema.fromJson({
      'type': 'object',
      'properties': {
        'date': {'type': 'string', 'format': 'date'},
        'weather': {'type': 'string', 'format': 'text'},
      },
    });
    expect(
        formValueForStorage(object, {
          'date': DateTime(2026, 11, 4),
          'weather': 'PARTLY',
        }),
        {'date': '2026-11-04', 'weather': 'PARTLY'});
  });
}
