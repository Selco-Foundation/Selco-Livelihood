import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../model/document/submission_document.dart';
import '../model/solar_installation_draft.dart';
import '../repositories/asset_mdms_repository.dart';
import 'warranty.dart';

/// Builds the JSON-safe snapshot consumed by the background isolate.
/// Endpoint-specific document keys are deliberately not created here: the
/// owning repositories serialize [SubmissionDocument] for Asset Registry or
/// workflow when the actual request is sent.
Map<String, dynamic> buildSolarSubmissionPayload(SolarInstallationDraft draft) {
  final activityFacility = draft.workflow.activityFacility;
  final facility = activityFacility.facility;
  final solutionDesignName =
      facility?.facilityDetails?.solutionDesignType?.trim();
  final requiredBomConfig =
      assetMdmsRepository.requiredBomFormKeysFor(draft.systemCode);

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
        ..remove('batteryType');
      final warrantyYears = parseWarrantyYears(assetDraft.warrantyDuration);
      final itemCode = _firstNonBlank([
        entry.itemCode,
        entry.fields['itemCode'],
        entry.fields['item_code'],
      ]);
      assets.add({
        if (entry.assetId?.trim().isNotEmpty == true) 'assetId': entry.assetId,
        'system': draft.systemCode,
        'assetTypeID': assetTypeCode,
        'serialNumber': entry.serialNumber,
        'modelNumber':
            (entry.fields['modelNumber'] ?? entry.fields['model_number'] ?? '')
                .toString(),
        'brandID': assetDraft.selectedBrandCode,
        if (itemCode != null) 'itemCode': itemCode,
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
          if (type == SolarAssetType.battery) 'batteryType': entry.batteryType,
        },
        'documents': entry.supportingPhoto == null
            ? const <Map<String, dynamic>>[]
            : [
                _document(entry.supportingPhoto!, 'ASSET_PHOTO-${type.name}')
                    .toCacheJson(),
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
      'name': solutionDesignName?.isNotEmpty == true
          ? solutionDesignName
          : 'BOM.SolarSystem',
      'data': Map<String, dynamic>.from(draft.mergedBom),
      'required': draft.bomFormNames.isNotEmpty,
      'requiredKeys': [
        for (final rule in requiredBomConfig?.rules ?? const [])
          if (rule.active && rule.fieldName.trim().isNotEmpty)
            {
              'schemaName': rule.schemaName,
              'fieldName': rule.fieldName,
              'label': rule.label,
              'message': rule.message,
            },
      ],
      'additionalDetails': const {'componentType': 'SOLAR'},
    },
    'assets': assets,
    'workflowDocuments':
        workflowDocuments.map((document) => document.toCacheJson()).toList(),
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
  final activityFacility = workflow.activityFacility;
  final templateBom = Map<String, dynamic>.from(
      activityFacility.additionalDetails?.bom ?? const {});
  final components = templateBom['components'];
  final firstComponent =
      components is List && components.isNotEmpty && components.first is Map
          ? Map<String, dynamic>.from(components.first as Map)
          : const <String, dynamic>{};
  final componentType =
      activityFacility.additionalDetails?.componentType?.trim().toUpperCase();
  final itemCode = _firstNonBlank([
    firstComponent['itemCode'],
    firstComponent['item_code'],
    templateBom['itemCode'],
  ]);
  final resolvedItem =
      itemCode == null ? null : assetMdmsRepository.itemCodeFor(itemCode);
  final assetTypeCode = _firstNonBlank([
        resolvedItem?.category,
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
    templateBom['brandID'],
  ]);
  final system = _firstNonBlank([
        activityFacility.additionalDetails?.systemCode,
        activityFacility.facility?.facilityDetails?.systemCode,
        activityFacility.facility?.systemCode,
        activityFacility.facility?.systemType,
      ]) ??
      'LIVELIHOOD';
  final machineName = _firstNonBlank([
        templateBom['name'],
        firstComponent['product'],
        firstComponent['name'],
      ]) ??
      'MACHINE';
  final years = parseWarrantyYears(warrantyYears);

  final formData = <String, dynamic>{
    ...templateBom,
    'purchaseOrderNumber': poNumber,
    'serialNumber': serialNumber,
    'invoiceNumber': invoiceNumber,
    'capacity': capacity,
    'warrantyDuration': years,
    'trainedEndUser': trainedEndUser,
  };
  final workflowDocuments = <SubmissionDocument>[
    if (electricBoardMedia != null)
      _document(electricBoardMedia, 'MACHINE_ELECTRIC_BOARD'),
    if (demoMedia != null) _document(demoMedia, 'MACHINE_DEMO_VIDEO'),
    if (endUserMedia != null) _document(endUserMedia, 'MACHINE_END_USER_PHOTO'),
  ];

  return {
    'kind': 'machine',
    'componentType': 'MACHINE',
    'workflowAction': 'SUBMIT_REPORT',
    'facilityId': activityFacility.facilityId,
    'bom': {
      'name': machineName,
      'data': formData,
      'required': true,
      'additionalDetails': const {'componentType': 'MACHINE'},
    },
    'assets': [
      {
        'system': system,
        'assetTypeID': assetTypeCode,
        'serialNumber': serialNumber,
        'modelNumber': _firstNonBlank([firstComponent['modelNumber']]) ?? '',
        if (brandCode != null) 'brandID': brandCode,
        if (itemCode != null) 'itemCode': itemCode,
        'name': machineName,
        'warrantyStartDate':
            years > 0 ? DateTime.now().toUtc().toIso8601String() : null,
        'warrantyDurationYears': years,
        'assetDetails': {
          'poNumber': poNumber,
          'invoiceNumber': invoiceNumber,
          'capacity': capacity,
          'trainedEndUser': trainedEndUser,
        },
        'documents': const <Map<String, dynamic>>[],
      },
    ],
    'workflowDocuments':
        workflowDocuments.map((document) => document.toCacheJson()).toList(),
  };
}

SubmissionDocument _document(SolarFileRef file, String fallbackType) {
  final remoteId = file.remoteId?.trim();
  return SubmissionDocument(
    documentType: file.documentType ?? fallbackType,
    fileStore: remoteId?.isNotEmpty == true ? remoteId : null,
    localPath:
        remoteId?.isNotEmpty == true ? null : (file.localPath ?? file.path),
  );
}

String? _firstNonBlank(List<dynamic> values) {
  for (final value in values) {
    final text = value?.toString().trim();
    if (text != null && text.isNotEmpty) return text;
  }
  return null;
}

List<String> missingRequiredBomFields(
  Map<String, dynamic> values,
  List<dynamic> requiredKeys,
) {
  bool isMissing(dynamic value) =>
      value == null ||
      (value is String && value.trim().isEmpty) ||
      (value is Iterable && value.isEmpty);

  return requiredKeys.whereType<Map>().where((rule) {
    final fieldName = rule['fieldName']?.toString().trim() ?? '';
    return fieldName.isNotEmpty && isMissing(values[fieldName]);
  }).map((rule) {
    final label = rule['label']?.toString().trim();
    return label?.isNotEmpty == true
        ? label!
        : rule['fieldName'].toString().trim();
  }).toList();
}
