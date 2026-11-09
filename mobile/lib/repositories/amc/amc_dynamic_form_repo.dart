import 'dart:async';
import 'dart:convert';

import 'package:isar/isar.dart';

import '../../data/nosql/cache_amc_doc.dart';
import '../../data/nosql/cache_schedule_visit_form_values.dart';
import '../../utils/amc/amc_json.dart';
import '../../utils/constants.dart';
import '../../utils/envConfig.dart';

/// Ported from E4H `AmcDynamicFormRepository`
/// (`lib/repositories/dynamic_form_repo.dart`). E4H passes the Isar handle
/// in; here it is resolved from `Constants().isar` unless one is supplied.
class AmcDynamicFormRepository {
  AmcDynamicFormRepository({Isar? isar}) : _isarOverride = isar;

  final Isar? _isarOverride;

  Future<Isar> get _isar async => _isarOverride ?? await Constants().isar;

  Future<void> saveLocal({
    required String scheduledVisitId,
    required String schemaKey,
    String? facilityId,
    String? assignUserUuid,
    required Map<String, dynamic> rawDocWithValues,
    String? formName,
  }) async {
    final isar = await _isar;
    await isar.writeTxn(() async {
      final existing = await isar.cacheAmcDocs
          .where()
          .filter()
          .scheduleVisitIdEqualTo(scheduledVisitId)
          .schemaKeyEqualTo(schemaKey, caseSensitive: false)
          .findFirst();

      final now = DateTime.now().toUtc();

      if (existing == null) {
        final doc = CacheAmcDoc()
          ..scheduleVisitId = scheduledVisitId
          ..schemaKey = schemaKey
          ..tenantId = envConfig.variables.tenantId
          ..facilityId = facilityId
          ..assignUserUuid = assignUserUuid
          ..formName = formName ?? schemaKey
          ..dataMap = rawDocWithValues
          ..updatedAt = now
          ..isDirty = true;
        await isar.cacheAmcDocs.put(doc);
      } else {
        existing.tenantId = envConfig.variables.tenantId;
        existing.facilityId = facilityId ?? existing.facilityId;
        existing.assignUserUuid = assignUserUuid ?? existing.assignUserUuid;
        existing.formName = (formName ?? existing.formName ?? schemaKey);
        existing.dataMap = rawDocWithValues;
        existing.updatedAt = now;
        existing.isDirty = true;
        await isar.cacheAmcDocs.put(existing);
      }
    });
  }

  Future<CacheAmcDoc?> getLocal({
    required String scheduledVisitId,
    required String schemaKey,
  }) async {
    final isar = await _isar;
    return isar.cacheAmcDocs
        .where()
        .filter()
        .scheduleVisitIdEqualTo(scheduledVisitId)
        .schemaKeyEqualTo(schemaKey, caseSensitive: false)
        .findFirst();
  }

  Future<List<CacheAmcDoc>> getAllForScheduledVisit(
      String scheduledVisitId) async {
    final isar = await _isar;
    return isar.cacheAmcDocs
        .where()
        .filter()
        .scheduleVisitIdEqualTo(scheduledVisitId)
        .findAll();
  }

  Future<void> deleteAllLocal({required String scheduledVisitId}) async {
    final isar = await _isar;
    await isar.writeTxn(() async {
      final col = isar.cacheAmcDocs;
      final rec = await col
          .where()
          .scheduleVisitIdEqualToAnySchemaKey(scheduledVisitId)
          .findAll();
      for (final r in rec) {
        await col.delete(r.id);
      }
    });
  }

  Future<void> delete({required String scheduledVisitId}) async {
    final isar = await _isar;
    await isar.writeTxn(() async {
      final col = isar.cacheScheduleVisitFormValues;
      final rec =
          await col.where().scheduledVisitIdEqualTo(scheduledVisitId).findAll();
      for (final r in rec) {
        await col.delete(r.id);
      }
    });
  }

  Future<void> mergeKvForEntryKey({
    required String scheduledVisitId,
    required String userType,
    required Map<String, dynamic> kvUpdate,
  }) async {
    final isar = await _isar;
    final entryKey = '$scheduledVisitId::$userType';
    final safeIncoming = jsonSafe(kvUpdate) as Map<String, dynamic>;

    await isar.writeTxn(() async {
      final existing = await isar.cacheScheduleVisitFormValues
          .where()
          .entryKeyEqualTo(entryKey)
          .findFirst();

      final existingMap = (existing?.dataJson.isNotEmpty ?? false)
          ? (json.decode(existing!.dataJson) as Map<String, dynamic>)
          : <String, dynamic>{};

      final merged = deepMerge(existingMap, safeIncoming);
      final jsonString = json.encode(jsonSafe(merged));

      final rec = existing ?? CacheScheduleVisitFormValues()
        ..scheduledVisitId = scheduledVisitId
        ..userType = userType
        ..entryKey = entryKey;

      rec
        ..dataJson = jsonString
        ..updatedAt = DateTime.now();

      await isar.cacheScheduleVisitFormValues.put(rec);
    });
  }

  Future<bool> hasFormForSchema({
    required String scheduledVisitId,
    required String schemaKey,
  }) async {
    final isar = await _isar;
    final existing = await isar.cacheAmcDocs
        .where()
        .scheduleVisitIdEqualToAnySchemaKey(scheduledVisitId)
        .filter()
        .schemaKeyEqualTo(schemaKey)
        .findFirst();
    return existing != null;
  }

  /// "Resume" once a form is saved locally for the visit, else "Start".
  /// (E4H passes a `FormOrigin`; only inbox/submitted origins short-circuit.)
  Future<String> resolveFormActionLabel({
    required String scheduledVisitId,
    required String schemaKey,
    required bool isReadOnlyOrigin,
  }) async {
    if (isReadOnlyOrigin) {
      return 'Start';
    }
    final exists = await hasFormForSchema(
      scheduledVisitId: scheduledVisitId,
      schemaKey: schemaKey,
    );

    return exists ? 'Resume' : 'Start';
  }

  Future<Map<String, dynamic>?> getScheduledVisitFormKV({
    required String scheduledVisitId,
    required String userType,
  }) async {
    final isar = await _isar;
    final entryKey = '$scheduledVisitId::$userType';
    final rec = await isar.cacheScheduleVisitFormValues
        .where()
        .entryKeyEqualTo(entryKey)
        .findFirst();
    if (rec == null || rec.dataJson.isEmpty) return null;
    try {
      return jsonDecode(rec.dataJson) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> getInitialFormValues({
    required String scheduledVisitId,
    required Map<String, dynamic>? responsesFromModel,
    required String userType,
  }) async {
    final local = await getScheduledVisitFormKV(
        scheduledVisitId: scheduledVisitId, userType: userType);
    if (local != null) return local;
    return responsesFromModel;
  }
}
