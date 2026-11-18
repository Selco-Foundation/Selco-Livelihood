import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/model/activity_facility/activity_facility.dart';
import 'package:livelihood/model/activity_facility_workflow/activity_facility_workflow.dart';
import 'package:livelihood/model/solar_installation_draft.dart';
import 'package:livelihood/utils/dynamic_form_schema.dart';
import 'package:livelihood/utils/submission_media_reconciliation.dart';
import 'package:livelihood/utils/submission_payload.dart';

Map<String, dynamic> systemSchema() => {
      'name': 'AssetForm.LIVELIHOOD_COMMON_BOM_system',
      'pages': [
        {
          'page': 'Electrical',
          'properties': [
            for (final unit in ['V', 'A', 'W', 'Hz', 'Ω'])
              {
                'fieldName': '${unit}_uom',
                'type': 'string',
                'format': 'text',
                'value': unit,
                'readOnly': true,
                'includeInForm': true,
              },
            {
              'fieldName': 'measurement',
              'type': 'string',
              'format': 'text',
              'value': '',
            },
            {'fieldName': 'editable_uom', 'value': 'kW', 'readOnly': false},
            {'fieldName': 'empty_uom', 'value': ' ', 'readOnly': true},
            {'fieldName': 'report_number', 'value': '123', 'readOnly': true},
          ],
        },
      ],
    };

SolarInstallationDraft draft() => SolarInstallationDraft(
      workflow: const ActivityFacilityWorkflow(
        activityFacility: ActivityFacility(id: 'unit-test'),
      ),
      mode: SolarWorkflowMode.newReport,
    );

void main() {
  test('only populated read-only units are taken from the original MDMS record',
      () {
    final raw = systemSchema();
    final expected = {
      for (final unit in ['V', 'A', 'W', 'Hz', 'Ω']) '${unit}_uom': unit,
    };
    expect(readOnlyBomUnitDefaults(raw), expected);
    expect(readOnlyBomUnitDefaults({'data': raw}), expected);
  });

  for (final saved in [null, '', '  ', 'incorrect']) {
    test('MDMS units replace saved $saved in the outgoing BOM', () {
      final value = draft();
      value.mergedBom.addAll({
        'V_uom': saved,
        'measurement': '230',
        'editable_uom': 'MW',
        'report_number': 'saved-report',
      });
      final payload =
          buildSolarSubmissionPayload(value, bomSchemas: [systemSchema()]);
      final data = payload['bom']['data'] as Map;
      for (final unit in ['V', 'A', 'W', 'Hz', 'Ω']) {
        expect(data['${unit}_uom'], unit);
      }
      expect(data['measurement'], '230');
      expect(data['editable_uom'], 'MW');
      expect(data['report_number'], 'saved-report');
      expect(data.containsKey('empty_uom'), isFalse);
    });
  }

  test(
      'retry corrects old units and resends the BOM while keeping its identity',
      () {
    final value = draft()..mergedBom['measurement'] = '230';
    final latest =
        buildSolarSubmissionPayload(value, bomSchemas: [systemSchema()]);
    final old = buildSolarSubmissionPayload(value);
    old['bom'].addAll({
      'remoteId': 'existing-bom',
      'submitted': true,
      'data': {'V_uom': '', 'measurement': '230'},
    });
    final reconciled = reconcileSubmissionMedia(old, latest);
    expect(reconciled['bom']['remoteId'], 'existing-bom');
    expect(reconciled['bom']['submitted'], isFalse);
    expect(reconciled['bom']['data']['V_uom'], 'V');
    expect(reconciled['bom']['data']['measurement'], '230');
    expect(old['bom']['data']['V_uom'], '');

    reconciled['bom']['submitted'] = true;
    expect(reconcileSubmissionMedia(reconciled, latest)['bom']['submitted'],
        isTrue);
    old['workflowSubmitted'] = true;
    expect(reconcileSubmissionMedia(old, latest), old);
  });
}
