import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/model/activity_facility/activity_facility.dart';
import 'package:livelihood/model/activity_facility_workflow/activity_facility_workflow.dart';
import 'package:livelihood/model/solar_installation_draft.dart';
import 'package:livelihood/repositories/installation_draft_repository.dart';

class RecordingRepository extends InstallationDraftRepository {
  bool fail = false;
  Set<String>? saved;

  @override
  Future<void> saveSolar(SolarInstallationDraft draft,
      {bool requirePersistence = false, Set<String>? submittedSections}) async {
    expect(requirePersistence, isTrue);
    expect(draft.submittedSections, isNot(containsAll(submittedSections!)));
    if (fail) throw StateError('Storage unavailable');
    saved = Set.of(submittedSections);
  }
}

void main() {
  SolarInstallationDraft draft() => SolarInstallationDraft(
        workflow: const ActivityFacilityWorkflow(
          activityFacility: ActivityFacility(id: 'section-test'),
        ),
        mode: SolarWorkflowMode.newReport,
      );

  test('only solar and system forms are tracked', () {
    expect(SolarInstallationDraft.trackedFormSection('AssetForm.BOM_SOLAR'),
        'assetform.bom_solar');
    expect(
        SolarInstallationDraft.trackedFormSection('BOM_system'), 'bom_system');
    expect(SolarInstallationDraft.trackedFormSection('BOM_machines'), isNull);
  });

  test('successful sections are independent and persist together', () async {
    final value = draft();
    final repo = RecordingRepository();
    value.dynamicFormAnswers['bom_solar'] = {'prefill': 'value'};
    expect(value.isSectionSubmitted('bom_solar'), isFalse);
    await repo.submitSection(value, 'BOM_SOLAR');
    expect(value.isSectionSubmitted('bom_solar'), isTrue);
    expect(value.isSectionSubmitted('bom_system'), isFalse);
    await repo.submitSection(
        value, SolarInstallationDraft.installationImagesSection);
    expect(repo.saved, {'bom_solar', 'installation-images'});
    expect(value.isReadOnly, isFalse);
  });

  test('failed persistence leaves sections unsubmitted and permits retry',
      () async {
    final value = draft();
    final repo = RecordingRepository()..fail = true;
    await expectLater(
        repo.submitSection(value, 'bom_system'), throwsStateError);
    expect(value.submittedSections, isEmpty);
    repo.fail = false;
    await repo.submitSection(value, 'bom_system');
    expect(value.isSectionSubmitted('bom_system'), isTrue);
  });
}
