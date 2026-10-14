import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/model/activity_facility/activity_facility.dart';
import 'package:livelihood/model/activity_facility_workflow/activity_facility_workflow.dart';
import 'package:livelihood/model/bom/bom.dart';
import 'package:livelihood/model/facility_report.dart';
import 'package:livelihood/utils/submission_payload.dart';

void main() {
  test('machine card and submission preserve every name fallback in order', () {
    final candidates = <String, dynamic>{
      'bomName': 'Rice Huller',
      'assetName': 'Silk Spinning',
      'templateName': 'Template name',
      'machineProduct': 'Machine product',
      'product': 'Component product',
      'name': 'Component name',
      'itemCode': 'Component code',
      'item_code': 'Legacy code',
      'templateCode': 'Template code',
    };
    for (final key in candidates.keys.toList()) {
      final expected = candidates[key];
      final workflow = ActivityFacilityWorkflow(
          activityFacility: ActivityFacility(
        facility: const Facility(facilityName: 'End user'),
        additionalDetails:
            const ActivityFacilityAdditionalDetails(componentType: 'MACHINE'),
        billOfMaterial: BillOfMaterial(
          name: candidates['bomName'] as String?,
          additionalDetails: {'assetName': candidates['assetName']},
          data: {
            'name': candidates['templateName'],
            'machine_1_product': candidates['machineProduct'],
            'itemCode': candidates['templateCode'],
            'components': [
              {
                for (final key in ['product', 'name', 'itemCode', 'item_code'])
                  key: candidates[key]
              },
            ],
          },
        ),
      ));
      final asset = (buildMachineSubmissionPayload(
              workflow: workflow, values: {}, media: {})['assets'] as List)
          .single as Map;
      expect(resolveMachineAssetName(workflow), expected);
      expect(asset['name'], expected);
      expect(workflow.facilityCardTitle, 'End user - $expected');
      candidates[key] = '  ';
    }
  });
  test('missing name uses MACHINE; solar uses Solar', () {
    const machine = ActivityFacilityWorkflow(
        activityFacility: ActivityFacility(
            componentType: 'MACHINE',
            facility: Facility(facilityName: 'End user')));
    const solar = ActivityFacilityWorkflow(
        activityFacility: ActivityFacility(
            additionalDetails:
                ActivityFacilityAdditionalDetails(componentType: 'SOLAR'),
            facility: Facility(facilityName: 'End user')));
    expect(machine.facilityCardTitle, 'End user - MACHINE');
    expect(solar.facilityCardTitle, 'End user - Solar');
  });
}
