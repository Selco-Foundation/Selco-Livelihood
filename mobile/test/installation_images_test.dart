import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/blocs/installation_images/installation_images.dart';
import 'package:livelihood/model/activity_facility/activity_facility.dart';
import 'package:livelihood/model/activity_facility_workflow/activity_facility_workflow.dart';
import 'package:livelihood/model/bom/bom.dart';
import 'package:livelihood/model/mdms/asset_registry_response.dart';
import 'package:livelihood/model/mdms/common_masters.dart';
import 'package:livelihood/model/solar_installation_draft.dart';
import 'package:livelihood/repositories/asset_mdms_repository.dart';
import 'package:livelihood/repositories/installation_draft_repository.dart';
import 'package:livelihood/repositories/installation_images_repository.dart';

Map<String, dynamic> requirement(String code, Map<String, num> types,
        {bool active = true}) =>
    {
      'code': code,
      'active': active,
      'required_count': 1,
      'system_types': [
        for (final entry in types.entries)
          {'code': entry.key, 'order': entry.value},
      ],
    };

AssetMdmsRepository mdms() => AssetMdmsRepository(
      initial: AssetRegistryMdmsResponse(
        commonMasters: CommonMastersModule(installationImages: [
          {
            'data': {
              'InstallationImage': [
                requirement('shared', {'DC': 2, 'AC': 1}),
                requirement('dc-first', {'DC': 1}),
                requirement('dc-tie', {'DC': 1}),
                requirement('ac-only', {'AC': 2}),
                requirement('inactive', {'DC': 0}, active: false),
              ],
            },
          },
          {
            'isActive': false,
            'data': requirement('disabled-record', {'DC': 0})
          },
        ]),
      ),
    );

SolarInstallationDraft draft() => SolarInstallationDraft(
      workflow: const ActivityFacilityWorkflow(
        activityFacility: ActivityFacility(),
      ),
      mode: SolarWorkflowMode.newReport,
    );

List<String> codes(List<InstallationImageRequirement> items) =>
    items.map((item) => item.code).toList();

class PendingImagesRepository extends InstallationImagesRepository {
  final requests = <String, Completer<List<InstallationImageRequirement>>>{};

  @override
  Future<List<InstallationImageRequirement>> fetch({
    required String systemCode,
    String? solutionCode,
    bool forceRefresh = false,
  }) =>
      (requests[(solutionCode?.isEmpty ?? true)
              ? systemCode
              : '$systemCode/$solutionCode'] = Completer())
          .future;
}

void main() {
  test('solution name resolves from Installation.Solution by code', () {
    final repository = AssetMdmsRepository(
      initial: const AssetRegistryMdmsResponse(
        installation: InstallationModule(solution: [
          InstallationSolution(code: 'SOL_HOME', name: ' Solar Home '),
          InstallationSolution(code: 'SOL_BLANK', name: ' '),
        ]),
      ),
    );

    expect(repository.solutionName(' sol_home '), 'Solar Home');
    expect(repository.solutionName('SOL_BLANK'), isNull);
    expect(repository.solutionName('UNKNOWN'), isNull);
    expect(repository.solutionName(null), isNull);
  });

  test('solution lists preserve legacy entries and restrict explicit matches',
      () {
    final legacy = InstallationImageRequirement.fromJson({'code': 'legacy'});
    final empty = InstallationImageRequirement.fromJson(
        {'code': 'empty', 'solution_codes': <String>[]});
    final restricted = InstallationImageRequirement.fromJson({
      'code': 'restricted',
      'solution_codes': ['  SOLUTION-A  ', 'solution-b'],
    });
    expect(restricted.solutionCodes, ['SOLUTION-A', 'solution-b']);
    for (final solution in [null, '', 'unknown']) {
      expect(legacy.appliesToSolution(solution), isTrue);
      expect(empty.appliesToSolution(solution), isTrue);
      expect(restricted.appliesToSolution(solution), isFalse);
    }
    expect(restricted.appliesToSolution(' solution-a '), isTrue);
    expect(restricted.appliesToSolution('SOLUTION-B'), isTrue);
  });

  test('system fallbacks cannot bypass solution restrictions', () async {
    final repository = AssetMdmsRepository(
      initial: AssetRegistryMdmsResponse(
        commonMasters: CommonMastersModule(installationImages: [
          {
            'InstallationImage': [
              requirement('legacy', {'DC': 3}),
              {
                ...requirement('first', {'DC': 1}),
                'solution_codes': ['A']
              },
              {
                ...requirement('tie', {'DC': 1}),
                'solution_codes': ['A']
              },
              {
                ...requirement('other', {'DC': 2}),
                'solution_codes': ['B']
              },
            ],
          },
        ]),
      ),
    );
    expect(codes(repository.installationImagesFor('DC', solutionCode: ' a ')),
        ['first', 'tie', 'legacy']);
    for (final system in [null, '', 'unknown']) {
      expect(codes(repository.installationImagesFor(system, solutionCode: 'A')),
          ['legacy', 'first', 'tie']);
    }
    for (final solution in [null, '', 'unlisted']) {
      expect(
          codes(repository.installationImagesFor('DC', solutionCode: solution)),
          ['legacy']);
    }
    final images = InstallationImagesRepository(mdmsRepository: repository);
    expect(codes(await images.fetch(systemCode: 'DC', solutionCode: 'B')),
        ['other', 'legacy']);
  });

  test('draft uses the activity solution for DC and AC exceptions', () {
    const milking = '202526PASF0000110';
    const eri = '202526PASF0000141';
    const printer = '202526PASF0000540';
    const pulverizer = '202526PASF0000379';
    final repository = InstallationDraftRepository(
      mdmsRepository: AssetMdmsRepository(
        initial: AssetRegistryMdmsResponse(
          commonMasters: CommonMastersModule(installationImages: [
            {
              'InstallationImage': [
                {
                  ...requirement('isolator', {'AC': 4, 'DC': 4}),
                  'solution_codes': [milking, printer, pulverizer]
                },
                {
                  ...requirement('ajb', {'AC': 6}),
                  'solution_codes': [pulverizer]
                },
                {
                  ...requirement('rms', {'AC': 13, 'DC': 13}),
                  'solution_codes': [milking, eri, printer, pulverizer],
                  'required': false
                },
              ]
            },
          ]),
        ),
      ),
    );
    for (final (solution, system, expected) in [
      (milking, 'DC', ['isolator', 'rms']),
      (eri, 'DC', ['rms']),
      (printer, 'AC', ['isolator', 'rms']),
      (pulverizer, 'AC', ['isolator', 'ajb', 'rms']),
      ('unknown', 'AC', <String>[]),
    ]) {
      final value = SolarInstallationDraft(
        workflow: ActivityFacilityWorkflow(
          activityFacility: ActivityFacility(solutionId: solution),
        ),
        mode: SolarWorkflowMode.newReport,
      )..mergedBom['system_type'] = system;
      repository.applyBomDerivedValues(value);
      expect(codes(value.installationRequirements), expected);
      if (expected.isNotEmpty) {
        expect(value.installationRequirements.last.isRequired, isFalse);
      }
    }
  });

  test('changing solution within one system discards stale responses',
      () async {
    final repository = PendingImagesRepository();
    final bloc = InstallationImagesBloc(repository: repository);
    addTearDown(bloc.close);
    bloc.add(
        const FetchInstallationImages(systemCode: 'AC', solutionCode: 'A'));
    await Future<void>.delayed(Duration.zero);
    bloc.add(
        const FetchInstallationImages(systemCode: 'AC', solutionCode: 'B'));
    await Future<void>.delayed(Duration.zero);
    final current = mdms().installationImagesFor('AC');
    repository.requests['AC/B']!.complete(current);
    await Future<void>.delayed(Duration.zero);
    repository.requests['AC/A']!.complete(mdms().installationImagesFor('DC'));
    await Future<void>.delayed(Duration.zero);
    expect((bloc.state as InstallationImagesLoaded).items, current);

    bloc.add(
        const FetchInstallationImages(systemCode: 'AC', solutionCode: 'C'));
    await Future<void>.delayed(Duration.zero);
    expect(bloc.state, isA<InstallationImagesLoading>());
    repository.requests['AC/C']!.complete([]);
    await Future<void>.delayed(Duration.zero);
    expect(bloc.state, isA<InstallationImagesError>());
  });

  test('required flag defaults to mandatory and controls description and count',
      () {
    final raw = {
      'code': 'image',
      'description': 'Solar panels',
      'required_count': 2,
    };
    for (final fields in [
      raw,
      {...raw, 'required': true}
    ]) {
      final item = InstallationImageRequirement.fromJson(fields);
      expect(item.isRequired, isTrue);
      expect(item.displayDescription, 'Solar panels');
      expect(item.requiredLabel, 'Required: 2 images');
    }
    final optional =
        InstallationImageRequirement.fromJson({...raw, 'required': false});
    expect(optional.isRequired, isFalse);
    expect(optional.displayDescription, 'Solar panels (optional)');
    expect(optional.requiredLabel, 'If provided: 2 images');
    expect(optional.allowMultiples, isTrue);
    final single = InstallationImageRequirement.fromJson(
        {...raw, 'required': false, 'required_count': 1});
    expect(single.requiredLabel, 'If provided: 1 image');
    expect(single.allowMultiples, isFalse);
  });

  test('optional categories may be skipped but must be complete once started',
      () {
    const optional = InstallationImageRequirement(
      code: 'optional',
      description: 'Panels',
      requiredCount: 2,
      isRequired: false,
    );
    const mandatory = InstallationImageRequirement(
      code: 'mandatory',
      description: 'Battery',
      requiredCount: 1,
    );
    const file = SolarFileRef(
      name: 'saved',
      path: 'saved',
      remoteId: 'saved',
      kind: SolarFileKind.image,
    );
    const invalid = SolarFileRef(
      name: 'local',
      path: '/local.jpg',
      kind: SolarFileKind.image,
    );
    final value = draft()..installationRequirements = [optional];
    expect(value.installationImagesComplete, isTrue);
    expect(value.isInstallationImageComplete(optional), isTrue);

    value.installationMedia['optional'] = [file];
    expect(value.installationImagesComplete, isFalse);
    value.installationMedia['optional'] = [file, invalid];
    expect(value.installationImagesComplete, isFalse);
    value.installationMedia['optional'] = [file, file];
    expect(value.installationImagesComplete, isTrue);
    value.installationMedia['optional']!.clear();
    expect(value.installationImagesComplete, isTrue);

    value.installationRequirements = [optional, mandatory];
    expect(value.installationImagesComplete, isFalse);
    expect(value.isInstallationImageComplete(mandatory), isFalse);
    value.installationMedia['mandatory'] = [invalid];
    expect(value.installationImagesComplete, isFalse);
    value.installationMedia['mandatory'] = [file];
    expect(value.installationImagesComplete, isTrue);
    value.installationMedia['optional'] = [file];
    expect(value.installationImagesComplete, isFalse);

    value.installationRequirements = [];
    expect(value.installationImagesComplete, isFalse);
  });

  test('filters active categories and preserves MDMS order for ties', () {
    final repository = mdms();
    expect(codes(repository.installationImagesFor(' dc ')),
        ['dc-first', 'dc-tie', 'shared']);
    expect(
        codes(repository.installationImagesFor('AC')), ['shared', 'ac-only']);
    for (final type in [null, '', ' ', 'unknown']) {
      expect(codes(repository.installationImagesFor(type)),
          ['shared', 'dc-first', 'dc-tie', 'ac-only']);
    }
    expect(AssetMdmsRepository().installationImagesFor('DC'), isEmpty);
  });

  test('image repository uses the shared selector, including empty type',
      () async {
    final repository = InstallationImagesRepository(mdmsRepository: mdms());
    expect(codes(await repository.fetch(systemCode: 'DC')),
        ['dc-first', 'dc-tie', 'shared']);
    expect(codes(await repository.fetch(systemCode: '')), hasLength(4));
  });

  test('fresh solar type replaces stale values and ignores MACHINE rows', () {
    final repository = InstallationDraftRepository(mdmsRepository: mdms());
    final value = draft()..mergedBom['system_type'] = 'AC';
    repository.applyFreshBomDerivedValues(value, const [
      BillOfMaterial(data: {'system_type': ' dc '}),
      BillOfMaterial(
        data: {'system_type': 'AC'},
        additionalDetails: {'componentType': 'MACHINE'},
      ),
    ]);
    repository.applyBomDerivedValues(value);
    expect(value.installationSystemType, 'DC');
    expect(value.systemCode, 'SOLAR');
    expect(codes(value.installationRequirements),
        ['dc-first', 'dc-tie', 'shared']);

    repository.applyFreshBomDerivedValues(value, const []);
    expect(value.installationSystemType, 'DC');
    repository.applyFreshBomDerivedValues(value, const [BillOfMaterial()]);
    repository.applyBomDerivedValues(value);
    expect(value.installationSystemType, isNull);
    expect(value.installationRequirements, hasLength(4));
  });

  test('changing type reuses saved categories and updates completion', () {
    final repository = InstallationDraftRepository(mdmsRepository: mdms());
    final value = draft()..mergedBom['system_type'] = 'AC';
    const file = SolarFileRef(
      name: 'saved',
      path: 'saved',
      remoteId: 'saved',
      kind: SolarFileKind.image,
    );
    value.installationMedia.addAll({
      'shared': [file],
      'ac-only': [file]
    });
    repository.applyBomDerivedValues(value);
    expect(value.installationImagesComplete, isTrue);
    value.mergedBom['system_type'] = 'DC';
    repository.applyBomDerivedValues(value);
    expect(value.installationImagesComplete, isFalse);
    expect(value.installationMedia['shared'], [file]);
    expect(value.installationMedia['ac-only'], [file]);
  });

  test('late results and errors cannot restore the previous type', () async {
    final repository = PendingImagesRepository();
    final bloc = InstallationImagesBloc(repository: repository);
    addTearDown(bloc.close);
    bloc.add(const FetchInstallationImages(systemCode: 'DC'));
    await Future<void>.delayed(Duration.zero);
    bloc.add(const FetchInstallationImages(systemCode: 'AC'));
    await Future<void>.delayed(Duration.zero);
    repository.requests['AC']!.complete(mdms().installationImagesFor('AC'));
    await Future<void>.delayed(Duration.zero);
    repository.requests['DC']!.completeError(Exception('old request failed'));
    await Future<void>.delayed(Duration.zero);
    expect(codes((bloc.state as InstallationImagesLoaded).items),
        ['shared', 'ac-only']);

    bloc.add(const FetchInstallationImages(systemCode: 'unknown'));
    await Future<void>.delayed(Duration.zero);
    expect(bloc.state, isA<InstallationImagesLoading>());
    repository.requests['UNKNOWN']!.completeError(Exception('failed'));
    await Future<void>.delayed(Duration.zero);
    expect(bloc.state, isA<InstallationImagesError>());
  });
}
