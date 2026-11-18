import 'package:flutter/foundation.dart';
import 'package:isar/isar.dart';

import '../../data/nosql/cache_amc_failed_scheduled_visit.dart';
import '../../data/nosql/cache_amc_media_upload.dart';
import '../../data/nosql/cache_prefilled_scheduled_visit.dart';
import '../../data/nosql/cache_scheduled_visit.dart';
import '../../data/secure_storage/secureStore.dart';
import '../../model/amc/amc_schedule.dart';
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

/// #252 View Schedule: the visits of the chosen period, earliest due first.
class AmcScheduleResult {
  final List<ScheduledVisit> visits;

  /// True when the server could not be reached and the visits are the
  /// device's last saved copy.
  final bool fromCache;

  const AmcScheduleResult({required this.visits, this.fromCache = false});
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

  /// #252: every not-started (`SCHEDULED`) visit of the logged-in field
  /// staff, with site details, earliest due first, page by page. The
  /// backend creates a visit only after the previous one is done, so this
  /// is about one row per AMC.
  ///
  /// No date range is sent: TODO(backend) the search rejects any
  /// `scheduledDateFrom`/`scheduledDateTo` today (`ScheduledVisitValidator`
  /// date check), so the period is applied on the device
  /// ([amcScheduleVisits]).
  ///
  /// Also used by New Report and its "AMC delayed" filter, with
  /// [searchText] (end user name, or an exact phone number).
  Future<List<ScheduledVisit>> fetchAllScheduled({
    String? searchText,
    int pageSize = 50,
    int maxPages = 40,
  }) async {
    final criteria = ScheduledVisitSearchCriteria(
      tenantId: envConfig.variables.tenantId,
      searchText: (searchText?.trim().isEmpty ?? true) ? null : searchText,
      statuses: [WORKFLOW_STATUS_AMC_FIELD_STAFF.SCHEDULED.name],
      includeSiteDetails: true,
      sortBy: 'scheduledDate',
      sortDirection: 'ASC',
    );
    final visits = <ScheduledVisit>[];
    for (var page = 0; page < maxPages; page++) {
      final response = await search(
          criteria: criteria, limit: pageSize, offset: visits.length);
      visits.addAll(response.scheduledVisits);
      if (response.scheduledVisits.isEmpty ||
          visits.length >= response.totalCount) {
        break;
      }
    }
    return visits;
  }

  /// Returns the visit as the server now has it (with its new `status`),
  /// or null if the response did not include it.
  ///
  /// Body as in the AMC API contract: `SUBMIT_VISIT_REPORT` sends the
  /// answers, the documents and the pre-report system status (#247);
  /// `SUBMIT_OTP` sends only the code, so the saved report is untouched.
  Future<ScheduledVisit?> updateVisitWorkflow({
    required String visitId,
    String? otp,
    String? status,
    Map<String, dynamic>? responses,
    List<AmcDocument>? visitDocuments,
    Map<String, dynamic>? reportAdditionalDetails,
  }) async {
    final action = status ?? 'SUBMIT_VISIT_REPORT';
    try {
      final body = {
        'visitId': visitId,
        'workflow': {
          'action': action,
          'comment': null,
          'documents': <dynamic>[],
        },
        'visitReport': action == 'SUBMIT_OTP'
            ? {'otpReference': otp}
            : {
                'responses': responses ?? <String, dynamic>{},
                'documents': (visitDocuments ?? const <AmcDocument>[])
                    .map((d) => d.toJsonForWorkflow())
                    .toList(),
                'additionalDetails':
                    reportAdditionalDetails ?? <String, dynamic>{},
              },
      };

      final response = await _remote.updateVisitWorkflow(body);
      await invalidateSubmittedReportBookmark(
          id: visitId,
          action: action,
          storage: bookmarkStorage,
          tenantId: bookmarkTenantId);
      return _visitFromWorkflowResponse(response, visitId);
    } catch (e) {
      debugPrint('ScheduledVisitRemoteRepository.updateVisitWorkflow error=$e');
      rethrow;
    }
  }

  ScheduledVisit? _visitFromWorkflowResponse(
      Map<String, dynamic>? response, String visitId) {
    if (response == null) return null;
    try {
      final visits =
          ScheduledVisitSearchResponse.fromJson(response).scheduledVisits;
      return visits.where((v) => v.id == visitId).firstOrNull ??
          visits.firstOrNull;
    } catch (e) {
      debugPrint('Could not read the visit from the workflow response: $e');
      return null;
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
    final now = DateTime.now();
    // Not-started visits are only listed from 30 days before their
    // Scheduled AMC Date, and "AMC delayed" lists those whose date has
    // passed. Both apply only when every requested status is SCHEDULED.
    final scheduledOnly = statuses.isNotEmpty &&
        statuses
            .every((s) => s == WORKFLOW_STATUS_AMC_FIELD_STAFF.SCHEDULED.name);
    if (scheduledOnly || delayedOnly) {
      return _fetchScheduledList(
        facilityName: facilityName,
        sortDirection: sortDirection,
        delayedOnly: delayedOnly,
        limit: limit,
        offset: offset,
        now: now,
      );
    }
    // The backend scopes the search to the logged-in field staff's own
    // visits, so no assignee is sent. The name search is `searchText`
    // (end user name, or an exact phone number). No date is sent.
    final criteria = ScheduledVisitSearchCriteria(
      tenantId: envConfig.variables.tenantId,
      searchText: facilityName,
      includeSiteDetails: true,
      // Without a direction the backend's default order applies (due date
      // for New, last action for the others).
      sortBy: sortDirection == null ? null : 'scheduledDate',
      statuses: statuses,
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
              matchesFacilityName(visit.displayFacilityName, facilityName))
          .where((visit) => !delayedOnly || visit.isAmcDelayed(now))
          .where((visit) => visit.isWithinAmcSubmissionWindow(now))
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

  /// #252 View Schedule: `SCHEDULED` visits due from today to the end of the
  /// [days]-day period. Fetched fresh each time, so reassigned or re-dated
  /// visits show at once; without a connection the last saved copy is
  /// used ([AmcScheduleResult.fromCache]). Throws when neither is
  /// available.
  Future<AmcScheduleResult> fetchSchedule({
    required int days,
    DateTime? now,
  }) async {
    final isar = await _isar;
    try {
      final visits = await _remote.fetchAllScheduled();
      await _upsertCache(isar, visits);
      return AmcScheduleResult(
          visits: amcScheduleVisits(visits, days, now ?? DateTime.now()));
    } catch (e) {
      if (isAuthenticationFailure(e)) rethrow;
      debugPrint('Failed to fetch the AMC schedule, using the cache: $e');
      final cached = await _readCache(isar,
          statuses: [WORKFLOW_STATUS_AMC_FIELD_STAFF.SCHEDULED.name]);
      if (cached.isEmpty) rethrow;
      return AmcScheduleResult(
          visits: amcScheduleVisits(cached, days, now ?? DateTime.now()),
          fromCache: true);
    }
  }

  /// The New Report list (with or without "AMC delayed"), filtered on the
  /// device.
  ///
  /// TODO(backend): the visit search rejects every `scheduledDateFrom` /
  /// `scheduledDateTo` (`ScheduledVisitValidator`: "Start date is required
  /// if end date is passed", and a `!= 0` typo that refuses both dates
  /// together). So all of the field staff's not-started visits are fetched
  /// (about one per AMC) and the 30-day window or the delayed rule is
  /// applied here, with the same checks as the offline copy. Page 1 fetches
  /// afresh; later pages are cut from that list, so the count and "load
  /// more" match what is shown. Once the backend is fixed the date range
  /// could be sent again; the result would be the same.
  List<ScheduledVisit>? _scheduledList;
  String? _scheduledListKey;

  Future<PaginatedScheduledVisits> _fetchScheduledList({
    required String? facilityName,
    required String? sortDirection,
    required bool delayedOnly,
    required int limit,
    required int offset,
    required DateTime now,
  }) async {
    final statuses = [WORKFLOW_STATUS_AMC_FIELD_STAFF.SCHEDULED.name];
    final key = '${facilityName ?? ''}|${sortDirection ?? ''}|$delayedOnly';
    var list = offset > 0 && _scheduledListKey == key ? _scheduledList : null;
    var fromCache = false;
    final isar = await _isar;
    final prefilledRepo = PrefilledScheduledVisitRepository(isar);

    if (list == null) {
      List<ScheduledVisit> visits;
      try {
        visits = await _remote.fetchAllScheduled(searchText: facilityName);
        await _upsertCache(isar, visits);
      } catch (e) {
        if (isAuthenticationFailure(e)) rethrow;
        debugPrint(
          'Failed to fetch scheduled visits remotely, falling back to cache: $e',
        );
        fromCache = true;
        visits = (await _readCache(isar, statuses: statuses))
            .where((visit) =>
                matchesFacilityName(visit.displayFacilityName, facilityName))
            .toList();
      }
      list = amcNewReportVisits(
        prefilledRepo.filterByPrefilledRules(
          remoteVisits: visits,
          statuses: statuses,
          prefilledVisitIds: await prefilledRepo.getPrefilledVisitIds(),
          cachedPrefilledVisits: const [],
        ),
        delayedOnly: delayedOnly,
        sortDirection: sortDirection,
        now: now,
      );
      _scheduledList = list;
      _scheduledListKey = fromCache ? null : key;
    }

    return PaginatedScheduledVisits(
      items: list.skip(offset).take(limit).toList(),
      totalCount: list.length,
      fromCache: fromCache,
    );
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

  /// Stores [visit] as the latest cached copy (e.g. the status returned by a
  /// workflow update), so offline lists match the server straight away.
  Future<void> cacheVisit(ScheduledVisit visit) async =>
      _upsertCache(await _isar, [visit]);

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

/// New Report's list rules, applied on the device: not-started visits due
/// within the 30-day window, or only overdue ones for "AMC delayed",
/// soonest first (`DESC`: latest first). Visits without a due date go last.
List<ScheduledVisit> amcNewReportVisits(
  Iterable<ScheduledVisit> visits, {
  bool delayedOnly = false,
  String? sortDirection,
  DateTime? now,
}) {
  final at = now ?? DateTime.now();
  final seen = <String>{};
  final list = visits
      .where((v) => v.status == WORKFLOW_STATUS_AMC_FIELD_STAFF.SCHEDULED.name)
      .where((v) => v.isWithinAmcSubmissionWindow(at))
      .where((v) => !delayedOnly || v.isAmcDelayed(at))
      .where((v) => (v.id ?? '').isEmpty || seen.add(v.id!))
      .toList();
  final far = DateTime.fromMillisecondsSinceEpoch(8640000000000000);
  list.sort((a, b) {
    final order = (a.scheduledDate ?? far).compareTo(b.scheduledDate ?? far);
    return sortDirection == 'DESC' ? -order : order;
  });
  return list;
}
