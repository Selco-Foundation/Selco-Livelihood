import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/model/installation_progress.dart';
import 'package:livelihood/model/mdms/common_masters.dart';
import 'package:livelihood/model/solar_installation_draft.dart';

void main() {
  final schema = MachineFormSchema.fromJson({
    'fields': [
      {'fieldName': 'serialNumber', 'type': 'text', 'required': true},
      {'fieldName': 'trainedEndUser', 'type': 'boolean', 'required': true},
      {'fieldName': 'notes', 'type': 'text', 'required': false},
      {
        'fieldName': 'photos',
        'type': 'image',
        'required': false,
        'requiredCount': 2
      },
    ],
  });
  InstallationProgress progress(Map<String, dynamic>? values,
          {MachineFormSchema? form,
          Map<String, List<SolarFileRef>> media = const {}}) =>
      machineInstallationProgress(
          schema: form ?? schema, values: values, media: media);

  test('no draft stays Start; existing empty draft is Resume', () {
    expect(progress(null).hasStarted, false);
    final empty = progress({});
    expect(empty.hasStarted, true);
    expect(empty.fraction, 0);
    expect(empty.canSubmit, false);
  });
  test('false is answered; whitespace is incomplete; optional text is ignored',
      () {
    final partial = progress({'serialNumber': ' ', 'trainedEndUser': false});
    expect(partial.fraction, 0.5);
    expect(partial.canSubmit, false);
    final complete =
        progress({'serialNumber': 'SN-1', 'trainedEndUser': false});
    expect(complete.fraction, 1);
    expect(complete.canSubmit, true);
  });
  test('missing schema preserves Resume with disabled submission', () {
    final result = machineInstallationProgress(
        schema: null, values: {'serialNumber': 'SN'}, media: {});
    expect(result.hasStarted, true);
    expect(result.fraction, 0);
    expect(result.canSubmit, false);
  });
  test('optional partial media blocks submission and caps percentage', () {
    final result = progress({
      'serialNumber': 'SN',
      'trainedEndUser': true
    }, media: {
      'photos': [
        const SolarFileRef(
            name: 'photo',
            path: 'remote-id',
            remoteId: 'remote-id',
            kind: SolarFileKind.image)
      ],
    });
    expect(result.fraction, 0.99);
    expect(result.canSubmit, false);
  });
  test('required media count and metadata both matter', () {
    final mediaSchema = MachineFormSchema.fromJson({
      'fields': [
        {
          'fieldName': 'photos',
          'type': 'image',
          'required': true,
          'requiredCount': 2
        },
      ]
    });
    const remote = SolarFileRef(
        name: 'photo',
        path: 'remote-id',
        remoteId: 'remote-id',
        kind: SolarFileKind.image);
    expect(
        progress({},
            form: mediaSchema,
            media: {
              'photos': [remote]
            }).fraction,
        0);
    expect(
        progress({},
            form: mediaSchema,
            media: {
              'photos': [remote, remote]
            }).canSubmit,
        true);
    const local = SolarFileRef(
        name: 'local', path: '/tmp/photo', kind: SolarFileKind.image);
    expect(
        progress({},
            form: mediaSchema,
            media: {
              'photos': [remote, local]
            }).canSubmit,
        false);
  });
}
