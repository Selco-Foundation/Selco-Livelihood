import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../model/activity_facility/activity_facility.dart';
import '../../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../../repositories/activity_facility_repo.dart';
import '../../utils/envConfig.dart';
import '../../utils/workflow_status.dart';

part 'activity_facility.freezed.dart';

/// Drives one report-list tab: initial fetch, live server-side search,
/// sort, and infinite-scroll pagination, all scoped to whichever single
/// workflow status that tab was opened for. One instance is created per
/// list page (not shared across tabs) so a tab left underneath in the
/// navigation stack never has its state overwritten by another tab's
/// fetch — the persisted Isar cache underneath is still shared regardless.
class ActivityFacilityBloc
    extends Bloc<ActivityFacilityEvent, ActivityFacilityState> {
  ActivityFacilityBloc({ActivityFacilityRepository? repository})
      : _repository = repository ?? activityFacilityRepository,
        super(const ActivityFacilityState.initial()) {
    on<_FetchByWorkflowEvent>(_onFetchByWorkflow);
    on<_FetchBySearchEvent>(_onFetchBySearch);
    on<_ClearSearchEvent>(_onClearSearch);
    on<_FetchSortedEvent>(_onFetchSorted);
    on<_LoadMoreEvent>(_onLoadMore);
  }

  static const int pageSize = 10;

  final ActivityFacilityRepository _repository;
  String? _query;
  String _sortDirection = defaultSortDirection;

  FutureOr<void> _onFetchByWorkflow(
    _FetchByWorkflowEvent event,
    Emitter<ActivityFacilityState> emit,
  ) async {
    _query = null;
    _sortDirection = defaultSortDirection;
    await _fetchFirstPage(
      event.workflowStatuses,
      emit,
      loading: const ActivityFacilityState.loading(),
    );
  }

  FutureOr<void> _onFetchBySearch(
    _FetchBySearchEvent event,
    Emitter<ActivityFacilityState> emit,
  ) async {
    if (event.query.trim().isEmpty) {
      await _clearSearch(event.workflowStatuses, emit);
      return;
    }
    if (event.query.length < minFacilitySearchQueryLength) return;

    _query = event.query;
    await _fetchFirstPage(
      event.workflowStatuses,
      emit,
      loading: const ActivityFacilityState.searchLoading(),
    );
  }

  FutureOr<void> _onClearSearch(
    _ClearSearchEvent event,
    Emitter<ActivityFacilityState> emit,
  ) =>
      _clearSearch(event.workflowStatuses, emit);

  Future<void> _clearSearch(
    List<String> workflowStatuses,
    Emitter<ActivityFacilityState> emit,
  ) async {
    _query = null;
    await _fetchFirstPage(
      workflowStatuses,
      emit,
      loading: const ActivityFacilityState.loading(),
    );
  }

  FutureOr<void> _onFetchSorted(
    _FetchSortedEvent event,
    Emitter<ActivityFacilityState> emit,
  ) async {
    _sortDirection = event.sortDirection;
    await _fetchFirstPage(
      event.workflowStatuses,
      emit,
      loading: const ActivityFacilityState.loading(),
    );
  }

  FutureOr<void> _onLoadMore(
    _LoadMoreEvent event,
    Emitter<ActivityFacilityState> emit,
  ) async {
    final current = state;
    if (current is! _PaginatedLoaded ||
        !current.hasMore ||
        current.isLoadingMore) {
      return;
    }

    emit(current.copyWith(isLoadingMore: true));

    final offset = current.items.length;
    final result = await _repository.fetchByWorkflowPaginated(
      body: _searchBody(),
      workflowStatuses: event.workflowStatuses,
      limit: pageSize,
      offset: offset,
      sortDirection: _sortDirection,
    );

    final byId = <String, ActivityFacilityWorkflow>{};
    for (final item in [...current.items, ...result.items]) {
      byId[item.activityFacility.id ?? identityHashCode(item).toString()] =
          item;
    }
    final items = byId.values.toList();
    emit(ActivityFacilityState.paginatedLoaded(
      items: items,
      hasMore: items.length < result.totalCount,
      totalCount: result.totalCount,
      fromCache: result.fromCache,
    ));
  }

  Future<void> _fetchFirstPage(
    List<String> workflowStatuses,
    Emitter<ActivityFacilityState> emit, {
    required ActivityFacilityState loading,
  }) async {
    emit(loading);

    final result = await _repository.fetchByWorkflowPaginated(
      body: _searchBody(),
      workflowStatuses: workflowStatuses,
      limit: pageSize,
      offset: 0,
      sortDirection: _sortDirection,
    );

    emit(ActivityFacilityState.paginatedLoaded(
      items: result.items,
      hasMore: result.items.length < result.totalCount,
      totalCount: result.totalCount,
      fromCache: result.fromCache,
    ));
  }

  ActivityFacilitySearchModel _searchBody() => ActivityFacilitySearchModel(
        tenantId: envConfig.variables.tenantId,
        facilityName: _query,
      );
}

@freezed
class ActivityFacilityEvent with _$ActivityFacilityEvent {
  const factory ActivityFacilityEvent.fetchActivityFacilityByWorkflow({
    required List<String> workflowStatuses,
  }) = _FetchByWorkflowEvent;

  const factory ActivityFacilityEvent.fetchActivityFacilityBySearch({
    required String query,
    required List<String> workflowStatuses,
  }) = _FetchBySearchEvent;

  const factory ActivityFacilityEvent.clearSearch({
    required List<String> workflowStatuses,
  }) = _ClearSearchEvent;

  const factory ActivityFacilityEvent.fetchActivityFacilitySorted({
    required List<String> workflowStatuses,
    required String sortDirection,
  }) = _FetchSortedEvent;

  const factory ActivityFacilityEvent.loadMoreActivityFacility({
    required List<String> workflowStatuses,
  }) = _LoadMoreEvent;
}

@freezed
class ActivityFacilityState with _$ActivityFacilityState {
  const factory ActivityFacilityState.initial() = _Initial;

  const factory ActivityFacilityState.loading() = _Loading;

  const factory ActivityFacilityState.searchLoading() = _SearchLoading;

  const factory ActivityFacilityState.paginatedLoaded({
    required List<ActivityFacilityWorkflow> items,
    required bool hasMore,
    required int totalCount,
    @Default(false) bool fromCache,
    @Default(false) bool isLoadingMore,
  }) = _PaginatedLoaded;
}
