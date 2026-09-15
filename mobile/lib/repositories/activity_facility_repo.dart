import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:isar/isar.dart';

import '../data/nosql/cache_activity_facility_workflow.dart';
import '../data/remote_client.dart';
import '../model/activity_facility/activity_facility.dart';
import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../model/document/submission_document.dart';
import '../model/facility_report.dart';
import '../utils/api_paths.dart';
import '../utils/constants.dart';
import '../utils/envConfig.dart';
import '../utils/workflow_status.dart';
import 'pending_submission_repository.dart';

/// One page of activity-facility search results, tagged with whether it
/// came from the network or from the persisted offline cache.
class PaginatedActivityFacilities {
  const PaginatedActivityFacilities({
    required this.items,
    required this.totalCount,
    this.nextOffset = 0,
    this.hasMore = false,
    this.fromCache = false,
  });

  final List<ActivityFacilityWorkflow> items;
  final int totalCount;
  final int nextOffset;
  final bool hasMore;
  final bool fromCache;
}

/// Pure Dio calls against `POST activity/v1/activities/_search` — no
/// caching. RequestInfo is not built here: `AuthTokenInterceptor`
/// (`lib/data/api_interceptors.dart`) already injects it for any Map body.
class ActivityFacilityRemoteRepository {
  Dio get _dio => DioClient().dio;

  Future<PaginatedActivityFacilities> searchByWorkflow({
    required ActivityFacilitySearchModel body,
    required List<String> workflowStatuses,
    int limit = 10,
    int offset = 0,
    String sortDirection = defaultSortDirection,
  }) async {
    final response = await _dio.post(
      ApiPaths.activitySearch,
      queryParameters: {
        'tenantId': envConfig.variables.tenantId,
        'limit': limit,
        'offset': offset,
        'includeDescendants': false,
        'includeAncestors': false,
      },
      data: {
        'ActivityFacility': {
          'sort_direction': sortDirection,
          'statuses': workflowStatuses,
          ...body.toMap(),
        },
      },
    );

    final rawList = response.data['facility'] as List<dynamic>? ?? [];
    final items = await Future.wait(
      rawList.whereType<Map>().map((value) async {
        return ActivityFacilityWorkflow.fromJson(
          Map<String, dynamic>.from(value),
        );
      }),
    );
    final totalCount = response.data['totalCount'] as int? ?? items.length;

    return PaginatedActivityFacilities(
      items: items,
      totalCount: totalCount,
      nextOffset: offset + items.length,
      hasMore: offset + items.length < totalCount,
    );
  }

  /// Same `_search` endpoint, `limit: 0` — the backend still returns
  /// `totalCount` for a zero-row page, which is a cheap way to get a
  /// count-only result without a dedicated count endpoint.
  Future<int> searchByWorkflowCount({
    required ActivityFacilitySearchModel body,
    required List<String> workflowStatuses,
  }) async {
    final response = await _dio.post(
      ApiPaths.activitySearch,
      queryParameters: {
        'tenantId': envConfig.variables.tenantId,
        'limit': 0,
        'offset': 0,
        'includeDescendants': false,
        'includeAncestors': false,
      },
      data: {
        'ActivityFacility': {
          'statuses': workflowStatuses,
          ...body.toMap(),
        },
      },
    );

    return response.data['totalCount'] as int? ?? 0;
  }

  /// `POST activity/v1/activities/workflow/update` — moves an activity
  /// facility to its next workflow state (e.g. `SUBMIT_REPORT` →
  /// `SUBMITTED_BY_FIELD_STAFF`). Called from the submission pipeline
  /// (`lib/utils/background_service.dart`) as the final step of Submit.
  Future<void> transitionWorkflow({
    required String activityFacilityId,
    required String action,
    String? comments,
    List<SubmissionDocument> documents = const [],
  }) async {
    await _dio.post(
      ApiPaths.workflowUpdate,
      data: {
        'activityFacilityId': activityFacilityId,
        'workflow': {
          'action': action,
          if (comments != null) 'comments': comments,
          if (documents.isNotEmpty)
            'documents':
                documents.map((document) => document.toWorkflowJson()).toList(),
        },
      },
    ).timeout(const Duration(seconds: 30));
  }
}

/// The repository `ActivityFacilityBloc`/`ActivityFacilityCountsBloc` use by
/// default. Not a constructor parameter on the `@RoutePage()` list pages
/// themselves — same reasoning as `loginAuthRepository`
/// (`lib/repositories/auth_repo.dart`): auto_route's generator treats every
/// constructor field as a route argument, which breaks route codegen for a
/// non-serializable type like this. Tests swap this instead (and should
/// restore it via `addTearDown`).
ActivityFacilityRepository activityFacilityRepository =
    ActivityFacilityRepository();

/// Cache-aware layer on top of [ActivityFacilityRemoteRepository]. Network
/// first; on success the persisted Isar cache is updated (first page of a
/// fresh fetch replaces the cached rows for that status bucket, subsequent
/// "load more" pages append to them, so the cache accumulates everything
/// ever fetched); on any failure, falls back to the cached rows for that
/// status bucket, paginated client-side. No TTL/staleness check.
class ActivityFacilityRepository {
  ActivityFacilityRepository({
    ActivityFacilityRemoteRepository? remote,
    PendingSubmissionRepository? pendingRepository,
  })  : remote = remote ?? ActivityFacilityRemoteRepository(),
        _pendingRepository = pendingRepository ?? pendingSubmissionRepository;

  final ActivityFacilityRemoteRepository remote;
  final PendingSubmissionRepository _pendingRepository;

  bool get _hasTestIsar =>
      !Platform.environment.containsKey('FLUTTER_TEST') ||
      Isar.instanceNames.isNotEmpty;

  /// Capped so a slow/unavailable Isar instance (e.g. a constrained test
  /// environment with no native core initialized) degrades to "cache
  /// unavailable" quickly instead of hanging the caller indefinitely.
  Future<Isar> get _isar =>
      Constants().isar.timeout(const Duration(seconds: 2));

  Future<PaginatedActivityFacilities> fetchByWorkflowPaginated({
    required ActivityFacilitySearchModel body,
    required List<String> workflowStatuses,
    required int limit,
    required int offset,
    required String sortDirection,
  }) async {
    final excludesLocalDrafts = workflowStatuses
        .contains(FacilityInstallationStatus.assignedToFieldStaff);
    final localDrafts = excludesLocalDrafts
        ? await _pendingRepository.readAll()
        : const <PendingSubmissionRecord>[];
    final excludedIds =
        localDrafts.map((record) => record.activityFacilityId).toSet();
    final query = body.facilityName?.trim().toLowerCase();
    final excludedFromTotal = localDrafts.where((record) {
      final storedStatus = record.workflow.status ??
          record.workflow.activityFacility.status ??
          FacilityInstallationStatus.assignedToFieldStaff;
      if (storedStatus != FacilityInstallationStatus.assignedToFieldStaff) {
        return false;
      }
      return query == null ||
          query.isEmpty ||
          record.workflow.facilityTitle.toLowerCase().contains(query);
    }).length;
    try {
      final visible = <ActivityFacilityWorkflow>[];
      var rawOffset = offset;
      var rawTotal = 0;
      var firstRequest = true;
      do {
        final result = await remote.searchByWorkflow(
          body: body,
          workflowStatuses: workflowStatuses,
          limit: limit,
          offset: rawOffset,
          sortDirection: sortDirection,
        );
        rawTotal = result.totalCount;
        try {
          final isSearch = body.facilityName?.trim().isNotEmpty == true;
          if (_hasTestIsar && !isSearch && rawOffset == 0 && firstRequest) {
            await _replaceCache(workflowStatuses, result.items);
          } else if (_hasTestIsar && !isSearch) {
            await _appendCache(result.items);
          }
        } catch (_) {}
        firstRequest = false;
        rawOffset += result.items.length;
        visible.addAll(result.items.where(
            (item) => !excludedIds.contains(item.activityFacility.id ?? '')));
        if (result.items.isEmpty) break;
      } while (visible.length < limit && rawOffset < rawTotal);

      final adjustedTotal =
          (rawTotal - (excludesLocalDrafts ? excludedFromTotal : 0))
              .clamp(0, rawTotal);
      return PaginatedActivityFacilities(
        // Returning every visible item accumulated while filling this page
        // avoids discarding tail items from the final raw server page. The
        // next request starts after that entire raw page.
        items: visible,
        totalCount: adjustedTotal,
        nextOffset: rawOffset,
        hasMore: rawOffset < rawTotal,
      );
    } catch (_) {
      var cached = await _readCacheSorted(workflowStatuses, sortDirection);
      if (excludedIds.isNotEmpty) {
        cached = cached
            .where(
                (item) => !excludedIds.contains(item.activityFacility.id ?? ''))
            .toList();
      }
      if (query != null && query.isNotEmpty) {
        cached = cached
            .where((item) =>
                (item.activityFacility.facility?.facilityName ?? '')
                    .toLowerCase()
                    .contains(query))
            .toList();
      }
      final page = cached.skip(offset).take(limit).toList();

      return PaginatedActivityFacilities(
        items: page,
        totalCount: cached.length,
        nextOffset: offset + page.length,
        hasMore: offset + page.length < cached.length,
        fromCache: true,
      );
    }
  }

  Future<List<ActivityFacilityWorkflow>> readCache(
    List<String> workflowStatuses,
  ) =>
      _readCacheSorted(workflowStatuses, defaultSortDirection);

  Future<void> _replaceCache(
    List<String> statuses,
    List<ActivityFacilityWorkflow> items,
  ) async {
    final isar = await _isar;
    await isar.writeTxn(() async {
      for (final status in statuses) {
        final existing = await isar.cacheActivityFacilityWorkflows
            .filter()
            .statusEqualTo(status)
            .findAll();
        if (existing.isNotEmpty) {
          await isar.cacheActivityFacilityWorkflows
              .deleteAll(existing.map((row) => row.id).toList());
        }
      }
      await isar.cacheActivityFacilityWorkflows
          .putAll(items.map(_toCacheRow).toList());
    }).timeout(const Duration(seconds: 2));
  }

  Future<void> _appendCache(List<ActivityFacilityWorkflow> items) async {
    final isar = await _isar;
    await isar.writeTxn(() async {
      for (final item in items) {
        final id = item.activityFacility.id ?? '';
        if (id.isEmpty) continue;
        final duplicates = await isar.cacheActivityFacilityWorkflows
            .filter()
            .activityFacilityIdEqualTo(id)
            .findAll();
        if (duplicates.isNotEmpty) {
          await isar.cacheActivityFacilityWorkflows
              .deleteAll(duplicates.map((row) => row.id).toList());
        }
      }
      await isar.cacheActivityFacilityWorkflows
          .putAll(items.map(_toCacheRow).toList());
    }).timeout(const Duration(seconds: 2));
  }

  /// A cache-read failure (e.g. Isar unavailable in a constrained
  /// environment) degrades to "nothing cached" rather than throwing —
  /// this is already the fallback path for a failed network call, so there
  /// is nothing further to fall back to.
  Future<List<ActivityFacilityWorkflow>> _readCacheSorted(
    List<String> statuses,
    String sortDirection,
  ) async {
    if (!_hasTestIsar) return const [];
    final List<CacheActivityFacilityWorkflow> rows;
    try {
      final isar = await _isar;
      rows = [];
      for (final status in statuses) {
        rows.addAll(
          await isar.cacheActivityFacilityWorkflows
              .filter()
              .statusEqualTo(status)
              .findAll()
              .timeout(const Duration(seconds: 2)),
        );
      }
    } catch (_) {
      return const [];
    }

    final epoch = DateTime.fromMillisecondsSinceEpoch(0);
    rows.sort((a, b) {
      final aKey = a.sortKey ?? epoch;
      final bKey = b.sortKey ?? epoch;
      return sortDirection == 'ASC'
          ? aKey.compareTo(bKey)
          : bKey.compareTo(aKey);
    });

    final seen = <String>{};
    final uniqueRows =
        rows.where((row) => seen.add(row.activityFacilityId)).toList();
    return Future.wait(uniqueRows.map((row) async {
      final raw = jsonDecode(row.rawJson);
      if (raw is! Map) return null;
      return ActivityFacilityWorkflow.fromJson(
        Map<String, dynamic>.from(raw),
      );
    })).then((items) => items.whereType<ActivityFacilityWorkflow>().toList());
  }

  CacheActivityFacilityWorkflow _toCacheRow(
    ActivityFacilityWorkflow workflow,
  ) {
    final sortMillis = workflow.workflow?.auditDetails?.lastModifiedTime ??
        workflow.activityFacility.scheduledAt;

    return CacheActivityFacilityWorkflow()
      ..activityFacilityId = workflow.activityFacility.id ?? ''
      ..status = workflow.status ?? workflow.activityFacility.status ?? ''
      ..rawJson = jsonEncode(workflow.toJson())
      ..sortKey = sortMillis != null
          ? DateTime.fromMillisecondsSinceEpoch(sortMillis)
          : null
      ..updatedAt = DateTime.now();
  }
}
