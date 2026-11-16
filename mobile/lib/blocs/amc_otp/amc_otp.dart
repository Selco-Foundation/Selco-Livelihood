// ignore_for_file: constant_identifier_names
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../data/network_manager.dart';
import '../../model/amc/scheduled_visit.dart';
import '../../repositories/amc/amc_dynamic_form_repo.dart';
import '../../repositories/amc/scheduled_visit_repo.dart';
import '../../utils/amc/amc_utils.dart';
import '../../utils/i18_key_constants.dart' as i18;
import '../../utils/role_login_resolver.dart';

part 'amc_otp.freezed.dart';

/// Ported from E4H: verifies the AMC service completion code (OTP) the
/// facility contact received (`workflow/_update` action `SUBMIT_OTP`) and
/// resends it (`_resend_otp`). On success all local data for the visit is
/// cleared.
///
/// #249: both need connectivity (checked first); failures say what to do
/// next (wrong code / offline / server reason) and never clear saved data;
/// success reports the status the server returned (APPROVED or sent for
/// review) and stores it in the visit cache straight away.
class AmcOtpBloc extends Bloc<AmcOtpEvent, AmcOtpState> {
  final ScheduledVisitRemoteRepository scheduledVisitRepo;
  final Future<bool> Function() _isOnline;
  final Future<void> Function(ScheduledVisit visit) _cacheVisit;
  final Future<void> Function(String visitId) _clearLocalData;

  AmcOtpBloc({
    ScheduledVisitRemoteRepository? scheduledVisitRepo,
    Future<bool> Function()? isOnline,
    Future<void> Function(ScheduledVisit visit)? cacheVisit,
    Future<void> Function(String visitId)? clearLocalData,
  })  : scheduledVisitRepo =
            scheduledVisitRepo ?? ScheduledVisitRemoteRepository(),
        _isOnline = isOnline ?? _defaultIsOnline,
        _cacheVisit = cacheVisit ?? _defaultCacheVisit,
        _clearLocalData = clearLocalData ?? _defaultClearLocalData,
        super(const AmcOtpState.initial()) {
    on<AmcOtpEventResend>(_onResend);
    on<AmcOtpEventSubmit>(_onSubmit);
  }

  static const String CLEANUP_ERROR = "Cleanup Error";
  static const String ERROR_CLEARING_CACHE = "Error clearing cache for";

  /// Wrong-code error codes: E4H's amc-scheduler-service sends
  /// `ERROR_OTP_GENERATION` ("OTP validation unsuccessful"); the dummy
  /// backend sends `INVALID_OTP`.
  // TODO(backend): confirm the codes once the Livelihood API is available.
  static const Set<String> invalidCodeErrors = {
    'ERROR_OTP_GENERATION',
    'INVALID_OTP',
    'INVALID_OTP_REQUEST',
  };

  Future<void> _onResend(
    AmcOtpEventResend event,
    Emitter<AmcOtpState> emit,
  ) async {
    if (!await _isOnline()) {
      emit(AmcOtpState.failure(i18.amcOtp.offline));
      return;
    }
    emit(const AmcOtpState.resendLoading());
    try {
      await scheduledVisitRepo.resendVisitOtp(visitId: event.visitId);
      emit(const AmcOtpState.resendSuccess());
    } catch (e) {
      debugPrint('Resend AMC Service completion code: $e');
      emit(_failure(e, fallbackKey: i18.amcOtp.resendFailed));
    }
  }

  Future<void> _onSubmit(
    AmcOtpEventSubmit event,
    Emitter<AmcOtpState> emit,
  ) async {
    if (!await _isOnline()) {
      emit(AmcOtpState.failure(i18.amcOtp.offline));
      return;
    }
    emit(const AmcOtpState.submitLoading());
    final ScheduledVisit? updated;
    try {
      updated = await scheduledVisitRepo.updateVisitWorkflow(
        visitId: event.visitId,
        schemaCode: event.schemaCode,
        version: event.version,
        otp: event.otp,
        status: 'SUBMIT_OTP',
        responses: null,
        visitDocuments: null,
      );
    } catch (e) {
      debugPrint('AMC Service completion code Submit: $e');
      // Nothing local is cleared: the report and code can be retried.
      emit(_failure(e, fallbackKey: i18.amcOtp.submitFailed));
      return;
    }

    if (updated != null) {
      try {
        await _cacheVisit(updated);
      } catch (e) {
        debugPrint('$CLEANUP_ERROR: could not cache the updated visit: $e');
      }
    }
    await _clearLocalData(event.visitId);
    emit(AmcOtpState.submitSuccess(status: updated?.status));
  }

  AmcOtpState _failure(Object error, {required String fallbackKey}) {
    final server = amcServerError(error);
    if (server != null) {
      if (invalidCodeErrors.contains(server.code)) {
        return AmcOtpState.failure(i18.amcOtp.invalidCode);
      }
      return AmcOtpState.failure(fallbackKey, serverMessage: server.message);
    }
    if (isAmcConnectivityError(error)) {
      return AmcOtpState.failure(i18.amcOtp.serverUnreachable);
    }
    return AmcOtpState.failure(fallbackKey);
  }
}

Future<bool> _defaultIsOnline() async {
  try {
    return await NetworkService().hasNetwork();
  } catch (_) {
    return false;
  }
}

Future<void> _defaultCacheVisit(ScheduledVisit visit) =>
    ScheduledVisitRepository().cacheVisit(visit);

/// E4H's post-verification cleanup of the visit's local data.
Future<void> _defaultClearLocalData(String visitId) async {
  const tag = AmcOtpBloc.CLEANUP_ERROR;
  const clearing = AmcOtpBloc.ERROR_CLEARING_CACHE;
  try {
    await PrefilledScheduledVisitRepository(await amcIsar())
        .delete(scheduledVisitId: visitId, userType: USER_TYPES.AMC.name);
  } catch (e) {
    debugPrint('$tag: $clearing prefilled scheduled visit.');
  }
  try {
    await AmcDynamicFormRepository().delete(scheduledVisitId: visitId);
  } catch (e) {
    debugPrint('$tag: $clearing filled form');
  }
  try {
    await AmcDynamicFormRepository().deleteAllLocal(scheduledVisitId: visitId);
  } catch (e) {
    debugPrint('$tag: $clearing form schema');
  }
  try {
    await ScheduledVisitRepository()
        .deleteAmcMediaUploads(scheduledVisitId: visitId);
  } catch (e) {
    debugPrint('$tag: $clearing media uploads');
  }
}

@freezed
class AmcOtpEvent with _$AmcOtpEvent {
  const factory AmcOtpEvent.resend({
    required String visitId,
  }) = AmcOtpEventResend;

  const factory AmcOtpEvent.submit({
    required String visitId,
    required String schemaCode,
    required int version,
    required String otp,
  }) = AmcOtpEventSubmit;
}

@freezed
class AmcOtpState with _$AmcOtpState {
  const factory AmcOtpState.initial() = _Initial;
  const factory AmcOtpState.resendLoading() = _ResendLoading;
  const factory AmcOtpState.resendSuccess() = _ResendSuccess;
  const factory AmcOtpState.submitLoading() = _SubmitLoading;

  /// [status] is the visit status the server returned (e.g. `APPROVED`,
  /// `PENDING_APPROVAL`), null if the response did not include it.
  const factory AmcOtpState.submitSuccess({String? status}) = _SubmitSuccess;

  /// [messageKey] is a localisation key; [serverMessage] is the server's own
  /// reason, shown with it when present.
  const factory AmcOtpState.failure(String messageKey,
      {String? serverMessage}) = _Failure;
}
