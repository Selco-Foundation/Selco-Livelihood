import '../data/remote_client.dart';
import '../model/activity_facility/activity_facility.dart';
import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../model/bom/bom.dart';
import '../model/solar_installation_draft.dart';
import '../utils/api_paths.dart';
import '../utils/envConfig.dart';
import 'asset_mdms_repository.dart';
import 'bom_repository.dart';
import 'installation_cache_repo.dart';

class AssociatedMachineBomRepository {
  AssociatedMachineBomRepository({
    AssetMdmsRepository? mdms,
    Future<List<ActivityFacility>> Function(ActivityFacility)? siblings,
    Future<List<BillOfMaterial>> Function(String)? boms,
    Future<dynamic> Function(String)? readCache,
    Future<void> Function(String, Map<String, dynamic>)? writeCache,
  })  : _mdms = mdms ?? assetMdmsRepository,
        _siblings = siblings ?? searchSiblings,
        _boms = boms ?? bomRepository.searchRemote,
        _readCache = readCache ??
            ((id) => installationCacheRepository.getJson(
                'associated-machine-boms', id)),
        _writeCache = writeCache ??
            ((id, data) => installationCacheRepository.putJson(
                'associated-machine-boms', id, data));

  final AssetMdmsRepository _mdms;
  final Future<List<ActivityFacility>> Function(ActivityFacility) _siblings;
  final Future<List<BillOfMaterial>> Function(String) _boms;
  final Future<dynamic> Function(String) _readCache;
  final Future<void> Function(String, Map<String, dynamic>) _writeCache;

  static Future<List<ActivityFacility>> searchSiblings(
      ActivityFacility source) async {
    if ([
      source.facilityId,
      source.fieldPlanId,
      source.activityId,
      source.solutionId
    ].any((value) => value?.trim().isNotEmpty != true)) {
      return [];
    }
    final items = <ActivityFacility>[];
    var offset = 0;
    const limit = 100;
    while (true) {
      final response = await DioClient().dio.post(
        ApiPaths.activitySearch,
        queryParameters: {
          'tenantId': envConfig.variables.tenantId,
          'limit': limit,
          'offset': offset,
          'includeDescendants': false,
          'includeAncestors': false
        },
        data: {
          'ActivityFacility': {
            'tenantId': envConfig.variables.tenantId,
            'facilityIds': [source.facilityId],
            'fieldPlanIds': [source.fieldPlanId],
            'activityIds': [source.activityId],
            'componentTypes': ['MACHINE'],
          }
        },
      );
      final rows = (response.data['facility'] as List<dynamic>? ?? [])
          .whereType<Map>()
          .toList();
      items.addAll(rows.map((row) =>
          ActivityFacilityWorkflow.fromJson(Map<String, dynamic>.from(row))
              .activityFacility));
      offset += rows.length;
      final total = response.data['totalCount'];
      if (rows.isEmpty ||
          (total is num ? offset >= total : rows.length < limit)) break;
    }
    return items;
  }

  Future<void> load(SolarInstallationDraft draft) {
    final pending = draft.associatedMachinesLoading;
    if (pending != null) return pending;
    final task = _load(draft).catchError((Object error) {
      draft.associatedMachinesFailed = true;
    });
    draft.associatedMachinesLoading = task;
    return task.whenComplete(() => draft.associatedMachinesLoading = null);
  }

  Future<void> _load(SolarInstallationDraft draft) async {
    final source = draft.workflow.activityFacility;
    draft.associatedMachinesFailed = false;
    await _mdms.load();
    final names = _mdms
        .formsFor(source.solutionId)
        .where((name) => name.toLowerCase().endsWith('_bom_machines'));
    final fields = <String>{};
    for (final name in names) {
      final schema = _mdms.schemaFor(name);
      if (schema != null) {
        fields.addAll(schema.pages
            .expand((page) => page.properties)
            .map((property) => property.fieldName));
      }
    }
    void apply(Map<String, dynamic> values) {
      draft.associatedMachineValues
        ..clear()
        ..addAll({
          for (final entry in values.entries)
            if (fields.contains(entry.key)) entry.key: entry.value
        });
      draft.associatedMachinesAvailable = true;
    }

    if (source.id?.trim().isNotEmpty == true) {
      try {
        final cached =
            await _readCache(source.id!).timeout(const Duration(seconds: 2));
        if (cached is Map) apply(Map<String, dynamic>.from(cached));
      } catch (_) {/* Keep any already-loaded values. */}
    }
    if ([
      source.id,
      source.facilityId,
      source.fieldPlanId,
      source.activityId,
      source.solutionId
    ].any((value) => value?.trim().isNotEmpty != true)) {
      draft.associatedMachinesFailed = true;
      return;
    }
    if (fields.isEmpty) {
      // No machine form means no sibling prefill is needed.
      if (names.isEmpty) {
        apply({});
        return;
      }
      draft.associatedMachinesFailed = true;
      return;
    }
    try {
      final siblings = (await _siblings(source))
          .where((item) =>
              item.componentType?.toUpperCase() == 'MACHINE' &&
              item.facilityId == source.facilityId &&
              item.fieldPlanId == source.fieldPlanId &&
              item.activityId == source.activityId &&
              item.solutionId == source.solutionId &&
              item.id?.isNotEmpty == true)
          .toList()
        ..sort((a, b) {
          final sequence =
              (a.componentSequence ?? 0).compareTo(b.componentSequence ?? 0);
          return sequence != 0 ? sequence : a.id!.compareTo(b.id!);
        });
      final results =
          await Future.wait(siblings.map((item) => _boms(item.id!)));
      final values = <String, dynamic>{};
      for (var index = 0; index < siblings.length; index++) {
        final records = results[index]
            .where((bom) =>
                bom.isActive != false &&
                bom.activityFacilityId == siblings[index].id &&
                bom.solutionId == source.solutionId &&
                bom.additionalDetails['componentType']
                        ?.toString()
                        .toUpperCase() ==
                    'MACHINE')
            .toList()
          ..sort((a, b) => (a.id ?? '').compareTo(b.id ?? ''));
        for (final bom in records) {
          for (final key in fields) {
            if (bom.data.containsKey(key)) {
              values.putIfAbsent(key, () => bom.data[key]);
            }
          }
        }
      }
      apply(values);
      await _writeCache(source.id!, values);
    } catch (_) {
      draft.associatedMachinesFailed = true;
    }
  }
}

final associatedMachineBomRepository = AssociatedMachineBomRepository();
