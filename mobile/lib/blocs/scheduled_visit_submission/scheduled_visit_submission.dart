import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../repositories/amc/scheduled_visit_repo.dart';
import '../../utils/amc/amc_utils.dart';
import '../../utils/background_service.dart'
    show
        BackgroundServiceController,
        kEvtScheduleVisitDone,
        kEvtScheduleVisitError;

part 'scheduled_visit_submission.freezed.dart';

/// Ported from E4H: hands the AMC report submission (photo upload +
/// `SUBMIT_VISIT_REPORT`) to the background service and reports its
/// done/error events back to the media screen.
class ScheduleVisitSubmitBloc
    extends Bloc<ScheduleVisitSubmitEvent, ScheduleVisitSubmitState> {
  StreamSubscription? _doneSub;
  StreamSubscription? _errSub;
  final ScheduledVisitRepository _scheduledVisitRepository;

  ScheduleVisitSubmitBloc({ScheduledVisitRepository? repository})
      : _scheduledVisitRepository = repository ?? ScheduledVisitRepository(),
        super(const ScheduleVisitSubmitState.initial()) {
    on<_Submit>(_onSubmit);
    on<_BgDone>(_onBgDone);
    on<_BgError>(_onBgError);

    final svc = FlutterBackgroundService();

    _doneSub = svc.on(kEvtScheduleVisitDone).listen((data) {
      final visitId = data?['scheduledVisitId'] as String?;
      debugPrint(
        '[ScheduleVisitSubmitBloc] kEvtScheduleVisitDone visitId=$visitId',
      );
      if (visitId != null) {
        add(ScheduleVisitSubmitEvent.bgDone(scheduledVisitId: visitId));
      }
    });

    _errSub = svc.on(kEvtScheduleVisitError).listen((data) {
      final visitId = data?['scheduledVisitId'] as String?;
      final msg = data?['message'] as String?;
      debugPrint(
        '[ScheduleVisitSubmitBloc] kEvtScheduleVisitError visitId=$visitId msg=$msg',
      );
      if (visitId != null) {
        add(
          ScheduleVisitSubmitEvent.bgError(
            scheduledVisitId: visitId,
            message: msg,
          ),
        );
      }
    });
  }

  @override
  Future<void> close() async {
    await _doneSub?.cancel();
    await _errSub?.cancel();
    return super.close();
  }

  bool _isSessionExpiredMessage(String? message) {
    final msg = (message ?? '').toLowerCase();
    return msg.contains('session_expired');
  }

  String _normalizeErrorMessage(String? message) {
    if (_isSessionExpiredMessage(message)) return 'SESSION_EXPIRED';
    return normalizeFriendlyNetworkErrorMessage(message);
  }

  Future<void> _onSubmit(
    _Submit event,
    Emitter<ScheduleVisitSubmitState> emit,
  ) async {
    emit(const ScheduleVisitSubmitState.loading());

    try {
      await BackgroundServiceController.I.enqueueScheduleVisitSubmission(
        scheduledVisitId: event.scheduledVisitId,
        userType: event.userType,
      );
    } catch (e) {
      debugPrint(
          '[ScheduleVisitSubmitBloc] enqueueScheduleVisitSubmission failed: $e');
      try {
        await _scheduledVisitRepository.addFailedScheduledVisitToCache(
            scheduledVisitId: event.scheduledVisitId);
      } catch (_) {}
      emit(
        const ScheduleVisitSubmitState.failure(
          'Failed to submit visit. Please try again.',
        ),
      );
    }
  }

  Future<void> _onBgDone(
    _BgDone event,
    Emitter<ScheduleVisitSubmitState> emit,
  ) async {
    try {
      await _scheduledVisitRepository.removeFailedScheduledVisitFromCache(
          scheduledVisitId: event.scheduledVisitId);
    } catch (_) {}
    emit(const ScheduleVisitSubmitState.success());
  }

  Future<void> _onBgError(
    _BgError event,
    Emitter<ScheduleVisitSubmitState> emit,
  ) async {
    try {
      await _scheduledVisitRepository.addFailedScheduledVisitToCache(
          scheduledVisitId: event.scheduledVisitId);
    } catch (_) {}
    emit(
      ScheduleVisitSubmitState.failure(
          _normalizeErrorMessage(event.message ?? 'Failed to submit visit.')),
    );
  }
}

@freezed
class ScheduleVisitSubmitEvent with _$ScheduleVisitSubmitEvent {
  const factory ScheduleVisitSubmitEvent.submit({
    required String scheduledVisitId,
    required String userType,
  }) = _Submit;

  const factory ScheduleVisitSubmitEvent.bgDone({
    required String scheduledVisitId,
  }) = _BgDone;

  const factory ScheduleVisitSubmitEvent.bgError({
    required String scheduledVisitId,
    String? message,
  }) = _BgError;
}

@freezed
class ScheduleVisitSubmitState with _$ScheduleVisitSubmitState {
  const factory ScheduleVisitSubmitState.initial() = _Initial;
  const factory ScheduleVisitSubmitState.loading() = _Loading;
  const factory ScheduleVisitSubmitState.success() = _Success;
  const factory ScheduleVisitSubmitState.failure(String message) = _Failure;
}
