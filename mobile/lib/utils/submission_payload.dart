import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../model/solar_installation_draft.dart';

/// Builds the JSON-serializable submission payload cached (via
/// `installationCacheRepository.putJson('submission-payload', activityFacilityId, ...)`)
/// before handing off to the background submission service
/// (`lib/utils/background_service.dart`). Built here, in the UI isolate,
/// because only the UI isolate has the fully MDMS-hydrated
/// [SolarInstallationDraft] (asset type codes, brand codes, system code
/// resolution etc.) — the background isolate just executes against this
/// already-resolved, plain-data snapshot.
///
/// Document entries are `{documentType, remoteId}` when already uploaded, or
/// `{documentType, localPath}` when the background service's
/// `uploading_media` stage still needs to upload them.
Map<String, dynamic> buildSolarSubmissionPayload(SolarInstallationDraft draft) {
  final facility = draft.workflow.activityFacility;

  final sharedDocuments = <Map<String, dynamic>>[
    for (final file in draft.completionReportFiles)
      _docEntry(file, 'INSTALLATION_COMPLETION_REPORT'),
    for (final entry in draft.installationMedia.entries)
      for (final file in entry.value)
        _docEntry(file, 'INSTALLATION_IMAGE-${entry.key}'),
  ];

  final boms = <Map<String, dynamic>>[
    for (var i = 0; i < draft.bomFormNames.length; i++)
      {
        'name': draft.bomFormNames[i],
        'data': draft.dynamicFormAnswers[draft.bomFormNames[i]] ?? const {},
        // Attached to the first BOM row only — the read path
        // (`InstallationDraftRepository._mergeBackend`) merges documents
        // across every BOM belonging to the activity facility regardless of
        // which row they're stored under, so this is a safe round-trip.
        'documents': i == 0 ? sharedDocuments : const <Map<String, dynamic>>[],
      },
  ];
  if (boms.isEmpty && sharedDocuments.isNotEmpty) {
    boms.add({
      'name': 'AssetForm.completion_documents',
      'data': const <String, dynamic>{},
      'documents': sharedDocuments,
    });
  }

  final assets = <Map<String, dynamic>>[];
  for (final type in draft.applicableTypes) {
    final assetDraft = draft.assets[type]!;
    final assetTypeCode = draft.assetTypeCodes[type] ?? type.name.toUpperCase();
    for (final entry in assetDraft.assets) {
      assets.add({
        'system': draft.systemCode,
        'assetTypeID': assetTypeCode,
        'serialNumber': entry.serialNumber,
        'modelNumber':
            (entry.fields['modelNumber'] ?? entry.fields['model_number'] ?? '')
                .toString(),
        'brandID': assetDraft.selectedBrandCode,
        'itemCode': assetTypeCode,
        'name': assetDraft.system.isNotEmpty
            ? assetDraft.system
            : draft.labelFor(type),
        'warrantyStartDateMillis': _parseDateMillis(assetDraft.warrantyStartDate),
        'warrantyDurationYears': _parseWarrantyYears(assetDraft.warrantyDuration),
        'assetDetails': {
          'name': draft.labelFor(type),
          'capacity': entry.capacity,
          'totalCapacity': assetDraft.totalCapacity,
          'capacityUnit': assetDraft.capacityUnit,
          ...entry.fields,
        },
        'documents': entry.supportingPhoto == null
            ? const <Map<String, dynamic>>[]
            : [_docEntry(entry.supportingPhoto!, 'ASSET_PHOTO-${type.name}')],
      });
    }
  }

  return {
    'kind': 'solar',
    'workflowAction': 'SUBMIT_REPORT',
    'facilityId': facility.facilityId,
    'boms': boms,
    'assets': assets,
  };
}

Map<String, dynamic> buildMachineSubmissionPayload({
  required ActivityFacilityWorkflow workflow,
  required String poNumber,
  required String serialNumber,
  required String invoiceNumber,
  required String capacity,
  required String warrantyYears,
  required bool trainedEndUser,
  SolarFileRef? electricBoardMedia,
  SolarFileRef? demoMedia,
  SolarFileRef? endUserMedia,
}) {
  final documents = <Map<String, dynamic>>[
    if (electricBoardMedia != null)
      _docEntry(electricBoardMedia, 'MACHINE_ELECTRIC_BOARD'),
    if (demoMedia != null) _docEntry(demoMedia, 'MACHINE_DEMO_VIDEO'),
    if (endUserMedia != null) _docEntry(endUserMedia, 'MACHINE_END_USER_PHOTO'),
  ];

  final assetTypeCode =
      workflow.activityFacility.additionalDetails?.componentType ?? 'MACHINE';

  return {
    'kind': 'machine',
    'workflowAction': 'SUBMIT_REPORT',
    'facilityId': workflow.activityFacility.facilityId,
    'boms': const <Map<String, dynamic>>[],
    'assets': [
      {
        'system': null,
        'assetTypeID': assetTypeCode,
        'serialNumber': serialNumber,
        'modelNumber': '',
        'brandID': null,
        'itemCode': assetTypeCode,
        'name': 'Machine',
        'warrantyStartDateMillis': DateTime.now().millisecondsSinceEpoch,
        'warrantyDurationYears': int.tryParse(warrantyYears.trim()) ?? 0,
        'assetDetails': {
          'poNumber': poNumber,
          'invoiceNumber': invoiceNumber,
          'capacity': capacity,
          'trainedEndUser': trainedEndUser,
        },
        'documents': documents,
      },
    ],
  };
}

Map<String, dynamic> _docEntry(SolarFileRef file, String fallbackType) {
  final documentType = file.documentType ?? fallbackType;
  return file.isRemote
      ? {'documentType': documentType, 'remoteId': file.remoteId ?? file.path}
      : {'documentType': documentType, 'localPath': file.localPath ?? file.path};
}

int _parseDateMillis(String value) {
  final parsed = DateTime.tryParse(value.trim());
  return (parsed ?? DateTime.now()).millisecondsSinceEpoch;
}

int _parseWarrantyYears(String value) {
  final match = RegExp(r'\d+').firstMatch(value);
  return match == null ? 0 : int.parse(match.group(0)!);
}
