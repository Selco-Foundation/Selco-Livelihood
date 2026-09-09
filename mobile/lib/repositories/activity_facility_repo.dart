import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:isar/isar.dart';

import '../data/nosql/cache_activity_facility_workflow.dart';
import '../data/remote_client.dart';
import '../model/activity_facility/activity_facility.dart';
import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../utils/api_paths.dart';
import '../utils/constants.dart';
import '../utils/envConfig.dart';
import '../utils/workflow_status.dart';

/// One page of activity-facility search results, tagged with whether it
/// came from the network or from the persisted offline cache.
class PaginatedActivityFacilities {
  const PaginatedActivityFacilities({
    required this.items,
    required this.totalCount,
    this.fromCache = false,
  });

  final List<ActivityFacilityWorkflow> items;
  final int totalCount;
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
    final items = rawList
        .map(
            (e) => ActivityFacilityWorkflow.fromJson(e as Map<String, dynamic>))
        .toList();
    final totalCount = response.data['totalCount'] as int? ?? items.length;

    return PaginatedActivityFacilities(items: items, totalCount: totalCount);
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
  }) async {
    await _dio.post(
      ApiPaths.workflowUpdate,
      data: {
        'activityFacilityId': activityFacilityId,
        'workflow': {
          'action': action,
          if (comments != null) 'comments': comments,
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
  ActivityFacilityRepository({ActivityFacilityRemoteRepository? remote})
      : remote = remote ?? ActivityFacilityRemoteRepository();

  final ActivityFacilityRemoteRepository remote;

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
    try {
      final result = await remote.searchByWorkflow(
        body: body,
        workflowStatuses: workflowStatuses,
        limit: limit,
        offset: offset,
        sortDirection: sortDirection,
      );

      try {
        final isSearch = body.facilityName?.trim().isNotEmpty == true;
        if (!isSearch && offset == 0) {
          await _replaceCache(workflowStatuses, result.items);
        } else if (!isSearch) {
          await _appendCache(result.items);
        }
      } catch (_) {
        // Persisting the cache is best-effort — a write failure shouldn't
        // fail an otherwise successful fetch.
      }

      return result;
    } catch (_) {
      var cached = await _readCacheSorted(workflowStatuses, sortDirection);
      final query = body.facilityName?.trim().toLowerCase();
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
    return rows
        .where((row) => seen.add(row.activityFacilityId))
        .map((row) => ActivityFacilityWorkflow.fromJson(
            jsonDecode(row.rawJson) as Map<String, dynamic>))
        .toList();
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
