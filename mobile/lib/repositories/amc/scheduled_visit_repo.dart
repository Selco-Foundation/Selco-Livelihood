import 'package:flutter/foundation.dart';
import 'package:isar/isar.dart';

import '../../data/nosql/cache_amc_failed_scheduled_visit.dart';
import '../../data/nosql/cache_amc_media_upload.dart';
import '../../data/nosql/cache_prefilled_scheduled_visit.dart';
import '../../data/nosql/cache_scheduled_visit.dart';
import '../../data/secure_storage/secureStore.dart';
import '../../model/amc/scheduled_visit.dart';
import '../../utils/amc/amc_utils.dart';
import '../../utils/constants.dart';
import '../../utils/envConfig.dart';
import 'amc_bookmark_repo.dart';
import 'amc_remote_data_source.dart';

/// Ported from E4H `lib/repositories/scheduled_visit_repo.dart`. The only
/// change is that requests go through [amcRemoteDataSource] (dummy or real)
/// and Isar is resolved from `Constants().isar` instead of a bloc field.

Future<Isar> amcIsar() => Constants().isar;

class PaginatedScheduledVisits {
  final List<ScheduledVisit> items;
  final int totalCount;
  final bool fromCache;

  PaginatedScheduledVisits({
    required this.items,
    required this.totalCount,
    this.fromCache = false,
  });
}

class ScheduledVisitRemoteRepository {
  final AmcRemoteDataSource? _dataSource;
  final SecureStore bookmarkStorage;
  final String? bookmarkTenantId;

  ScheduledVisitRemoteRepository(
      {AmcRemoteDataSource? dataSource,
      SecureStore? bookmarkStorage,
      this.bookmarkTenantId})
      : _dataSource = dataSource,
        bookmarkStorage = bookmarkStorage ?? SecureStore();

  AmcRemoteDataSource get _remote => _dataSource ?? amcRemoteDataSource;

  Future<ScheduledVisitSearchResponse> search({
    required ScheduledVisitSearchCriteria criteria,
    required int limit,
    required int offset,
  }) async {
    final response = await _remote.searchVisits(
      searchCriteria: {
        'tenantId': envConfig.variables.tenantId,
        ...criteria.toApiMap(),
      },
      limit: limit,
      offset: offset,
    );

    return ScheduledVisitSearchResponse.fromJson(response);
  }

  Future<void> updateVisitWorkflow({
    required String visitId,
    required String schemaCode,
    required int version,
    String? otp,
    String? status,
    Map<String, dynamic>? responses,
    List<AmcDocument>? visitDocuments,
  }) async {
    try {
      final body = {
        'visitId': visitId,
        'workflow': {
          'action': status ?? 'SUBMIT_VISIT_REPORT',
          'comment': 'Submit Visit Report Action',
          'additionalDetails': <String, dynamic>{},
        },
        'visitReport': {
          'schemaCode': schemaCode,
          'version': version,
          'otpReference': otp,
          if (responses != null) ...{
            'responses': responses,
          },
          if (visitDocuments != null) ...{
            'documents':
                visitDocuments.map((d) => d.toJsonForWorkflow()).toList(),
          },
          'additionalDetails': <String, dynamic>{},
        },
      };

      await _remote.updateVisitWorkflow(body);
      await invalidateSubmittedReportBookmark(
          id: visitId,
          action: status ?? 'SUBMIT_VISIT_REPORT',
          storage: bookmarkStorage,
          tenantId: bookmarkTenantId);
    } catch (e) {
      debugPrint('ScheduledVisitRemoteRepository.updateVisitWorkflow error=$e');
      rethrow;
    }
  }

  Future<void> resendVisitOtp({
    required String visitId,
  }) async {
    try {
      await _remote.resendVisitOtp(visitId);
    } catch (e) {
      debugPrint('ScheduledVisitRemoteRepository.resendVisitOtp error=$e');
      rethrow;
    }
  }
}

/// Combined remote + cache, with pagination and fallback
class ScheduledVisitRepository {
  static const int defaultPageSize = 10;

  final Isar? _isarOverride;
  final ScheduledVisitRemoteRepository _remote;

  ScheduledVisitRepository({Isar? isar, ScheduledVisitRemoteRepository? remote})
      : _isarOverride = isar,
        _remote = remote ?? ScheduledVisitRemoteRepository();

  Future<Isar> get _isar async => _isarOverride ?? await amcIsar();

  Future<PaginatedScheduledVisits> fetchByWorkflowStatus({
    required List<String> statuses,
    String? facilityName,
    String? sortDirection,
    bool delayedOnly = false,
    int limit = defaultPageSize,
    int offset = 0,
  }) async {
    final accessInfo = await SecureStore().getAccessInfo();
    final assignedUserUuid = accessInfo?.userRequest?.uuid;
    final now = DateTime.now();
    final criteria = ScheduledVisitSearchCriteria(
      tenantId: envConfig.variables.tenantId,
      facilityName: facilityName,
      assignedUsers: assignedUserUuid == null ? null : [assignedUserUuid],
      statuses: statuses,
      // "AMC delayed": Scheduled AMC Date before today.
      scheduledTo: delayedOnly ? amcDelayedScheduledBefore(now) : null,
      sortDirection: sortDirection,
    );
    final isar = await _isar;

    try {
      final remoteResp = await _remote.search(
        criteria: criteria,
        limit: limit,
        offset: offset,
      );

      var items = remoteResp.scheduledVisits;

      final prefilledRepo = PrefilledScheduledVisitRepository(isar);
      final prefilledIds = await prefilledRepo.getPrefilledVisitIds();
      List<ScheduledVisit> cachedPrefilled = <ScheduledVisit>[];
      if (statuses.contains(
              WORKFLOW_STATUS_AMC_FIELD_STAFF.PENDING_OTP_APPROVAL.name) &&
          prefilledIds.isNotEmpty) {
        cachedPrefilled =
            await prefilledRepo.getPrefilledVisitsFromCache(prefilledIds);
      }

      items = prefilledRepo.filterByPrefilledRules(
        remoteVisits: items,
        statuses: statuses,
        prefilledVisitIds: prefilledIds,
        cachedPrefilledVisits: cachedPrefilled,
      );

      await _upsertCache(isar, items);

      return PaginatedScheduledVisits(
        items: items,
        totalCount: remoteResp.totalCount,
        fromCache: false,
      );
    } catch (e) {
      if (isAuthenticationFailure(e)) rethrow;
      debugPrint(
        'Failed to fetch scheduled visits remotely, falling back to cache: $e',
      );

      final prefilledRepo = PrefilledScheduledVisitRepository(isar);
      final prefilledIds = await prefilledRepo.getPrefilledVisitIds();
      final cached = await _readCache(isar, statuses: statuses);
      final eligible = prefilledRepo
          .filterByPrefilledRules(
            remoteVisits: cached,
            statuses: statuses,
            prefilledVisitIds: prefilledIds,
            cachedPrefilledVisits:
                await prefilledRepo.getPrefilledVisitsFromCache(prefilledIds),
          )
          .where((visit) =>
              matchesFacilityName(visit.facility?.facilityName, facilityName))
          .where((visit) => !delayedOnly || visit.isAmcDelayed(now))
          .toList();
      eligible.sort((a, b) {
        final order = (a.scheduledDate ?? DateTime(1970))
            .compareTo(b.scheduledDate ?? DateTime(1970));
        return sortDirection == 'ASC' ? order : -order;
      });
      return PaginatedScheduledVisits(
        items: eligible.skip(offset).take(limit).toList(),
        totalCount: eligible.length,
        fromCache: true,
      );
    }
  }

  Future<List<ScheduledVisit>> readEligibleCache(List<String> statuses) async {
    final isar = await _isar;
    final prefilled = PrefilledScheduledVisitRepository(isar);
    final ids = await prefilled.getPrefilledVisitIds();
    return prefilled.filterByPrefilledRules(
        remoteVisits: await _readCache(isar, statuses: statuses),
        statuses: statuses,
        prefilledVisitIds: ids,
        cachedPrefilledVisits:
            await prefilled.getPrefilledVisitsFromCache(ids));
  }

  Future<void> _upsertCache(
    Isar isar,
    List<ScheduledVisit> visits,
  ) async {
    if (visits.isEmpty) return;
    final col = isar.cacheScheduledVisits;
    await isar.writeTxn(() async {
      for (final v in visits) {
        if ((v.id ?? '').isEmpty) continue;
        final existing =
            await col.where().scheduledVisitIdEqualTo(v.id!).findAll();
        for (final row in existing) {
          await col.delete(row.id);
        }
        await col.put(CacheScheduledVisit.fromModel(v));
      }
    });
    await refreshReportBookmarkSnapshots(visits,
        storage: _remote.bookmarkStorage, tenantId: _remote.bookmarkTenantId);
  }

  Future<List<ScheduledVisit>> _readCache(
    Isar isar, {
    required List<String> statuses,
  }) async {
    final all = await isar.cacheScheduledVisits.where().findAll();
    final byId = <String, CacheScheduledVisit>{};
    for (final row in all) {
      final previous = byId[row.scheduledVisitId];
      if (previous == null || row.id > previous.id) {
        byId[row.scheduledVisitId] = row;
      }
    }
    return byId.values
        .where((row) => statuses.contains(row.status))
        .map((row) => row.toModel())
        .toList();
  }

  Future<void> deleteAmcMediaUploads({required String scheduledVisitId}) async {
    final isar = await _isar;
    await isar.writeTxn(() async {
      final col = isar.cacheAmcMediaUploads;
      final rec =
          await col.where().scheduledVisitIdEqualTo(scheduledVisitId).findAll();
      for (final r in rec) {
        await col.delete(r.id);
      }
    });
  }

  Future<void> addFailedScheduledVisitToCache({
    required String scheduledVisitId,
  }) async {
    if (scheduledVisitId.trim().isEmpty) return;

    final isar = await _isar;
    final col = isar.cacheAmcFailedScheduledVisits;
    await isar.writeTxn(() async {
      final existing = await col
          .where()
          .scheduledVisitIdEqualTo(scheduledVisitId)
          .findFirst();

      if (existing != null) return;
      await col.put(
        CacheAmcFailedScheduledVisit(scheduledVisitId: scheduledVisitId),
      );
    });
  }

  Future<bool> isFailedScheduledVisitInCache({
    required String scheduledVisitId,
  }) async {
    if (scheduledVisitId.trim().isEmpty) return false;

    final isar = await _isar;
    final row = await isar.cacheAmcFailedScheduledVisits
        .where()
        .scheduledVisitIdEqualTo(scheduledVisitId)
        .findFirst();
    return row != null;
  }

  Future<void> removeFailedScheduledVisitFromCache({
    required String scheduledVisitId,
  }) async {
    if (scheduledVisitId.trim().isEmpty) return;

    final isar = await _isar;
    final col = isar.cacheAmcFailedScheduledVisits;
    await isar.writeTxn(() async {
      final row = await col
          .where()
          .scheduledVisitIdEqualTo(scheduledVisitId)
          .findFirst();
      if (row != null) {
        await col.delete(row.id);
      }
    });
  }
}

class PrefilledScheduledVisitRepository {
  final Isar _isar;
  PrefilledScheduledVisitRepository(this._isar);

  Future<CachePrefilledScheduledVisit> addOrTouch({
    required String scheduledVisitId,
    required String userType,
  }) async {
    final col = _isar.cachePrefilledScheduledVisits;
    final existing = await col
        .where()
        .scheduledVisitIdUserTypeEqualTo(scheduledVisitId, userType)
        .findFirst();

    final now = DateTime.now();
    return _isar.writeTxn(() async {
      if (existing != null) {
        existing.updatedAt = now;
        await col.put(existing);
        return existing;
      } else {
        final row = CachePrefilledScheduledVisit(
            scheduledVisitId: scheduledVisitId, userType: userType)
          ..createdAt = now
          ..updatedAt = now;
        await col.put(row);
        return row;
      }
    });
  }

  Future<bool> exists({
    required String scheduledVisitId,
    required String userType,
  }) async {
    final col = _isar.cachePrefilledScheduledVisits;
    final row = await col
        .where()
        .scheduledVisitIdUserTypeEqualTo(scheduledVisitId, userType)
        .findFirst();
    return row != null;
  }

  Future<void> delete({
    required String scheduledVisitId,
    required String userType,
  }) async {
    final col = _isar.cachePrefilledScheduledVisits;
    final row = await col
        .where()
        .scheduledVisitIdUserTypeEqualTo(scheduledVisitId, userType)
        .findFirst();
    if (row != null) {
      await _isar.writeTxn(() async {
        await col.delete(row.id);
      });
    }
  }

  Future<Set<String>> getPrefilledVisitIds() async {
    final col = _isar.cachePrefilledScheduledVisits;
    final all = await col.where().findAll();

    final ids = <String>{};
    for (final row in all) {
      if (row.scheduledVisitId.isEmpty) continue;
      ids.add(row.scheduledVisitId);
    }
    return ids;
  }

  Future<List<ScheduledVisit>> getPrefilledVisitsFromCache(
    Set<String> prefilledIds,
  ) async {
    if (prefilledIds.isEmpty) return <ScheduledVisit>[];

    final col = _isar.cacheScheduledVisits;
    final result = <ScheduledVisit>[];

    for (final id in prefilledIds) {
      final rows = await col.where().scheduledVisitIdEqualTo(id).findAll();
      if (rows.isNotEmpty) {
        rows.sort((a, b) => a.id.compareTo(b.id));
        result.add(rows.last.toModel());
      }
    }
    return result;
  }

  /// E4H's "prefilled" rule: a visit whose report was submitted from this
  /// device is hidden from SCHEDULED and shown at the top of
  /// PENDING_OTP_APPROVAL, even if the server still says SCHEDULED.
  List<ScheduledVisit> filterByPrefilledRules({
    required List<ScheduledVisit> remoteVisits,
    required List<String> statuses,
    required Set<String> prefilledVisitIds,
    required List<ScheduledVisit> cachedPrefilledVisits,
  }) {
    final hasScheduled =
        statuses.contains(WORKFLOW_STATUS_AMC_FIELD_STAFF.SCHEDULED.name);
    final hasPendingOtp = statuses
        .contains(WORKFLOW_STATUS_AMC_FIELD_STAFF.PENDING_OTP_APPROVAL.name);

    var result = remoteVisits;

    if (hasScheduled && prefilledVisitIds.isNotEmpty) {
      result = result.where((v) {
        final id = v.id ?? '';
        if (id.isEmpty) return false;

        final isPrefilled = prefilledVisitIds.contains(id);
        if (v.status == WORKFLOW_STATUS_AMC_FIELD_STAFF.SCHEDULED.name &&
            isPrefilled) {
          return false;
        }
        return true;
      }).toList();
    }

    if (hasPendingOtp && cachedPrefilledVisits.isNotEmpty) {
      final existingIds = <String>{};
      for (final v in result) {
        final id = v.id;
        if (id != null) {
          existingIds.add(id);
        }
      }

      final newFromCache = <ScheduledVisit>[];
      for (final v in cachedPrefilledVisits) {
        final id = v.id;
        if (id == null) continue;
        if (!prefilledVisitIds.contains(id)) continue;
        if (existingIds.contains(id)) continue;
        newFromCache.add(v);
      }

      newFromCache.sort((a, b) {
        final ad = a.scheduledDate ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bd = b.scheduledDate ?? DateTime.fromMillisecondsSinceEpoch(0);
        return bd.compareTo(ad);
      });

      // put new cached ones on top, keep remote order intact
      result = [...newFromCache, ...result];
    }

    return result;
  }
}
