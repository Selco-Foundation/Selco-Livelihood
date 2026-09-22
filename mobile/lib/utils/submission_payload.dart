import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../model/document/submission_document.dart';
import '../model/solar_installation_draft.dart';
import 'warranty.dart';

const machineDefaultBrandId = 'SELCO';

/// Builds the JSON-safe snapshot consumed by the background isolate.
/// Endpoint-specific document keys are deliberately not created here: the
/// owning repositories serialize [SubmissionDocument] for Asset Registry or
/// workflow when the actual request is sent.
Map<String, dynamic> buildSolarSubmissionPayload(SolarInstallationDraft draft) {
  draft.syncCountsToBom();
  final activityFacility = draft.workflow.activityFacility;

  final workflowDocuments = <SubmissionDocument>[
    for (final file in draft.completionReportFiles)
      _document(file, 'INSTALLATION_COMPLETION_REPORT'),
    for (final media in draft.installationMedia.entries)
      for (final file in media.value)
        _document(file, 'INSTALLATION_IMAGE-${media.key}'),
    for (final type in draft.applicableTypes) ...[
      for (final file in draft.assets[type]!.images)
        _document(file, '${type.name}-image'),
      for (final file in draft.assets[type]!.videos)
        _document(file, '${type.name}-video'),
    ],
  ];

  final assets = <Map<String, dynamic>>[];
  for (final type in draft.applicableTypes) {
    final assetDraft = draft.assets[type]!;
    final assetTypeCode = draft.assetTypeCodes[type] ?? type.name.toUpperCase();
    for (final entry in assetDraft.assets) {
      final additionalFields = Map<String, dynamic>.from(entry.fields)
        ..remove('type')
        ..remove('battery_type')
        ..remove('batteryType')
        ..remove('invoiceNumber');
      final warrantyYears = parseWarrantyYears(assetDraft.warrantyDuration);
      assets.add({
        if (entry.assetId?.trim().isNotEmpty == true) 'assetId': entry.assetId,
        'system': draft.systemCode,
        'assetTypeID': assetTypeCode,
        'serialNumber': entry.serialNumber,
        'modelNumber':
            (entry.fields['modelNumber'] ?? entry.fields['model_number'] ?? '')
                .toString(),
        'brandID': assetDraft.selectedBrandCode,
        'itemCode': null,
        'name': assetDraft.system.isNotEmpty
            ? assetDraft.system
            : draft.labelFor(type),
        'warrantyStartDate':
            warrantyYears > 0 ? DateTime.now().toUtc().toIso8601String() : null,
        'warrantyDurationYears': warrantyYears,
        'assetDetails': {
          'name': draft.labelFor(type),
          'capacity': entry.capacity,
          'totalCapacity': assetDraft.totalCapacity,
          'capacityUnit': assetDraft.capacityUnit,
          ...additionalFields,
          'invoiceNumber': draft.invoiceNumber,
          if (type == SolarAssetType.battery) 'batteryType': entry.batteryType,
        },
        'documents': entry.supportingPhoto == null
            ? const <Map<String, dynamic>>[]
            : [
                _document(entry.supportingPhoto!, 'ASSET').toCacheJson(),
              ],
      });
    }
  }

  return {
    'kind': 'solar',
    'componentType': 'SOLAR',
    'workflowAction': 'SUBMIT_REPORT',
    'facilityId': activityFacility.facilityId,
    'bom': {
      if (draft.remoteBomId?.trim().isNotEmpty == true)
        'remoteId': draft.remoteBomId,
      'name': draft.remoteBomName?.trim().isNotEmpty == true
          ? draft.remoteBomName
          : 'Solar',
      'solutionId': draft.solutionId,
      'data': Map<String, dynamic>.from(draft.mergedBom),
      'required': draft.bomFormNames.isNotEmpty,
      'additionalDetails': {
        ...draft.remoteBomAdditionalDetails,
        'componentType': 'SOLAR',
      },
    },
    'assets': assets,
    'workflowDocuments':
        workflowDocuments.map((document) => document.toCacheJson()).toList(),
  };
}

Map<String, dynamic> buildMachineSubmissionPayload({
  required ActivityFacilityWorkflow workflow,
  required Map<String, dynamic> values,
  required Map<String, List<SolarFileRef>> media,
  String? assetId,
}) {
  final activityFacility = workflow.activityFacility;
  final templateBom = Map<String, dynamic>.from(
      activityFacility.billOfMaterial?.data ??
          activityFacility.additionalDetails?.bom ??
          const {});
  final components = templateBom['components'];
  final firstComponent =
      components is List && components.isNotEmpty && components.first is Map
          ? Map<String, dynamic>.from(components.first as Map)
          : const <String, dynamic>{};
  final componentType = (activityFacility.componentType ??
          activityFacility.additionalDetails?.componentType)
      ?.trim()
      .toUpperCase();
  final assetTypeCode = _firstNonBlank([
        firstComponent['assetTypeID'],
        firstComponent['assetTypeCode'],
        firstComponent['category'],
        componentType,
      ]) ??
      'MACHINE';
  final brandCode = _firstNonBlank([
        firstComponent['brandID'],
        firstComponent['brandCode'],
        firstComponent['make'],
        templateBom['machine_1_make'],
        templateBom['brandID'],
      ]) ??
      machineDefaultBrandId;
  final system = _firstNonBlank([
        activityFacility.additionalDetails?.systemCode,
        activityFacility.facility?.facilityDetails?.systemCode,
        activityFacility.facility?.systemCode,
        activityFacility.facility?.systemType,
      ]) ??
      'LIVELIHOOD';
  final machineName = _firstNonBlank([
        activityFacility.billOfMaterial?.name,
        activityFacility.billOfMaterial?.additionalDetails['assetName'],
        templateBom['name'],
        templateBom['machine_1_product'],
        firstComponent['product'],
        firstComponent['name'],
        firstComponent['itemCode'],
        firstComponent['item_code'],
        templateBom['itemCode'],
      ]) ??
      'MACHINE';
  final serialNumber = (values['serialNumber'] ?? '').toString();
  final years =
      parseWarrantyYears((values['warrantyDuration'] ?? '').toString());

  final assetDocuments = <SubmissionDocument>[
    for (final entry in media.entries)
      for (final file in entry.value) _document(file, entry.key),
  ];
  final configuredRootValues = <String, dynamic>{
    for (final entry in values.entries)
      if (_machineRootFields.contains(entry.key) &&
          entry.key != 'warrantyDuration' &&
          entry.key != 'warrantyDurationYears' &&
          entry.key != 'warrantyStartDate')
        entry.key: entry.value,
  };

  return {
    'kind': 'machine',
    'componentType': 'MACHINE',
    'workflowAction': 'SUBMIT_REPORT',
    'facilityId': activityFacility.facilityId,
    'assets': [
      {
        if (assetId?.trim().isNotEmpty == true) 'assetId': assetId,
        'system': system,
        'assetTypeID': assetTypeCode,
        'modelNumber': _firstNonBlank([firstComponent['modelNumber']]) ?? '',
        'brandID': brandCode,
        'itemCode': null,
        'name': machineName,
        ...configuredRootValues,
        'serialNumber': serialNumber,
        'warrantyStartDate':
            years > 0 ? DateTime.now().toUtc().toIso8601String() : null,
        'warrantyDurationYears': years,
        'assetDetails': {
          for (final entry in values.entries)
            if (!_machineRootFields.contains(entry.key)) entry.key: entry.value,
        },
        'documents':
            assetDocuments.map((document) => document.toCacheJson()).toList(),
      },
    ],
    'workflowDocuments': const <Map<String, dynamic>>[],
  };
}

/// Repairs Machine payloads created before the default brand was applied.
/// Returns whether the payload changed so callers can checkpoint it once.
bool applyMachineSubmissionDefaults(Map<String, dynamic> payload) {
  if (payload['kind'] != 'machine') return false;

  final rawAssets = payload['assets'];
  if (rawAssets is! List) return false;

  var changed = false;
  final assets = rawAssets.map((value) {
    if (value is! Map) return value;
    final asset = Map<String, dynamic>.from(value);
    if (_firstNonBlank([asset['brandID']]) == null) {
      asset['brandID'] = machineDefaultBrandId;
      changed = true;
    }
    return asset;
  }).toList();

  if (changed) payload['assets'] = assets;
  return changed;
}

SubmissionDocument _document(SolarFileRef file, String fallbackType) {
  final remoteId = file.remoteId?.trim();
  return SubmissionDocument(
    id: file.id,
    documentType: file.documentType ?? fallbackType,
    fileStore: remoteId?.isNotEmpty == true ? remoteId : null,
    localPath:
        remoteId?.isNotEmpty == true ? null : (file.localPath ?? file.path),
    documentUid: file.documentUid,
    status: file.status,
    additionalDetails: file.additionalDetails,
    geoLocation: file.geoLocation,
  );
}

const _machineRootFields = {
  'serialNumber',
  'modelNumber',
  'brandID',
  'itemCode',
  'name',
  'warrantyStartDate',
  'warrantyDuration',
  'warrantyDurationYears',
};

String? _firstNonBlank(List<dynamic> values) {
  for (final value in values) {
    final text = value?.toString().trim();
    if (text != null && text.isNotEmpty) return text;
  }
  return null;
}
