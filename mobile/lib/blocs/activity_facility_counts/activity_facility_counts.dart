import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../model/activity_facility/activity_facility.dart';
import '../../model/facility_report.dart';
import '../../repositories/activity_facility_repo.dart';
import '../../utils/envConfig.dart';
import '../../utils/workflow_status.dart';

part 'activity_facility_counts.freezed.dart';

/// Drives the 4 badge counts shown on both `HomePage` and
/// `InstallationReportHomePage`. A single instance is provided once, high
/// in the widget tree (see `main.dart`), so both screens read the same
/// already-fetched numbers instead of double-fetching — the [_onFetch]
/// handler is idempotent unless [ActivityFacilityCountsEvent.fetch] is
/// called with `forceRefresh: true`.
class ActivityFacilityCountsBloc
    extends Bloc<ActivityFacilityCountsEvent, ActivityFacilityCountsState> {
  ActivityFacilityCountsBloc({ActivityFacilityRepository? repository})
      : _repository = repository ?? activityFacilityRepository,
        super(const ActivityFacilityCountsState.initial()) {
    on<_FetchEvent>(_onFetch);
  }

  final ActivityFacilityRepository _repository;

  FutureOr<void> _onFetch(
    _FetchEvent event,
    Emitter<ActivityFacilityCountsState> emit,
  ) async {
    // Safe to dispatch from a StatelessWidget's build() (called from both
    // HomePage and InstallationReportHomePage) without ever firing a second
    // concurrent network round of 4 calls: already-loading is skipped just
    // like already-loaded, so only the very first dispatch does real work.
    if (state is _Loading) return;
    if (state is _Loaded && !event.forceRefresh) return;

    emit(const ActivityFacilityCountsState.loading());

    final body =
        ActivityFacilitySearchModel(tenantId: envConfig.variables.tenantId);

    Future<int> countFor(FacilityReportMode mode) async {
      try {
        return await _repository.remote.searchByWorkflowCount(
          body: body,
          workflowStatuses: mode.workflowStatuses,
        );
      } catch (_) {
        final cached = await _repository.readCache(mode.workflowStatuses);
        return cached.length;
      }
    }

    final results = await Future.wait([
      countFor(FacilityReportMode.newReport),
      countFor(FacilityReportMode.pendingApproval),
      countFor(FacilityReportMode.resubmissionNeeded),
      countFor(FacilityReportMode.approved),
    ]);

    emit(ActivityFacilityCountsState.loaded(
      assigned: results[0],
      pendingApproval: results[1],
      resubmission: results[2],
      approved: results[3],
    ));
  }
}

@freezed
class ActivityFacilityCountsEvent with _$ActivityFacilityCountsEvent {
  const factory ActivityFacilityCountsEvent.fetch({
    @Default(false) bool forceRefresh,
  }) = _FetchEvent;
}

@freezed
class ActivityFacilityCountsState with _$ActivityFacilityCountsState {
  const factory ActivityFacilityCountsState.initial() = _Initial;

  const factory ActivityFacilityCountsState.loading() = _Loading;

  const factory ActivityFacilityCountsState.loaded({
    required int assigned,
    required int pendingApproval,
    required int resubmission,
    required int approved,
  }) = _Loaded;
}
