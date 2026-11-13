// ignore_for_file: constant_identifier_names

import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../repositories/amc/amc_dynamic_form_repo.dart';
import '../../repositories/amc/scheduled_visit_repo.dart';
import '../../utils/role_login_resolver.dart';

part 'amc_otp.freezed.dart';

/// Ported from E4H: verifies the AMC service completion code (OTP) the
/// facility contact received (`workflow/_update` action `SUBMIT_OTP`) and
/// resends it (`_resend_otp`). On success all local data for the visit is
/// cleared.
class AmcOtpBloc extends Bloc<AmcOtpEvent, AmcOtpState> {
  final ScheduledVisitRemoteRepository scheduledVisitRepo;

  AmcOtpBloc({ScheduledVisitRemoteRepository? scheduledVisitRepo})
      : scheduledVisitRepo =
            scheduledVisitRepo ?? ScheduledVisitRemoteRepository(),
        super(const AmcOtpState.initial()) {
    on<AmcOtpEventResend>(_onResend);
    on<AmcOtpEventSubmit>(_onSubmit);
  }

  static const String CLEANUP_ERROR = "Cleanup Error";
  static const String ERROR_CLEARING_CACHE = "Error clearing cache for";

  Future<void> _onResend(
    AmcOtpEventResend event,
    Emitter<AmcOtpState> emit,
  ) async {
    emit(const AmcOtpState.resendLoading());

    try {
      await scheduledVisitRepo.resendVisitOtp(visitId: event.visitId);
      emit(const AmcOtpState.resendSuccess());
    } catch (e) {
      debugPrint('Resend AMC Service completion code: $e');
      emit(
        const AmcOtpState.failure(
            'Failed to resend AMC Service completion code. Please try again.'),
      );
    }
  }

  Future<void> _onSubmit(
    AmcOtpEventSubmit event,
    Emitter<AmcOtpState> emit,
  ) async {
    emit(const AmcOtpState.submitLoading());

    try {
      await scheduledVisitRepo.updateVisitWorkflow(
        visitId: event.visitId,
        schemaCode: event.schemaCode,
        version: event.version,
        otp: event.otp,
        status: 'SUBMIT_OTP',
        responses: null,
        visitDocuments: null,
      );
      try {
        await PrefilledScheduledVisitRepository(await amcIsar()).delete(
            scheduledVisitId: event.visitId, userType: USER_TYPES.AMC.name);
      } catch (e) {
        debugPrint(
            '$CLEANUP_ERROR: $ERROR_CLEARING_CACHE prefilled scheduled visit.');
      }
      try {
        await AmcDynamicFormRepository()
            .delete(scheduledVisitId: event.visitId);
      } catch (e) {
        debugPrint('$CLEANUP_ERROR: $ERROR_CLEARING_CACHE filled form');
      }
      try {
        await AmcDynamicFormRepository()
            .deleteAllLocal(scheduledVisitId: event.visitId);
      } catch (e) {
        debugPrint('$CLEANUP_ERROR: $ERROR_CLEARING_CACHE form schema');
      }
      try {
        await ScheduledVisitRepository()
            .deleteAmcMediaUploads(scheduledVisitId: event.visitId);
      } catch (e) {
        debugPrint('$CLEANUP_ERROR: $ERROR_CLEARING_CACHE media uploads');
      }
      emit(const AmcOtpState.submitSuccess());
    } catch (e) {
      debugPrint('AMC Service completion code Submit: $e');
      emit(const AmcOtpState.failure(
          'Invalid AMC Service completion code or request failed. Please try again.'));
    }
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
  const factory AmcOtpState.submitSuccess() = _SubmitSuccess;
  const factory AmcOtpState.failure(String message) = _Failure;
}
