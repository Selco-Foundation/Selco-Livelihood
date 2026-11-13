import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../data/api_interceptors.dart';
import '../../data/secure_storage/secureStore.dart';
import '../../model/login/loginModel.dart';
import '../../model/response/responsemodel.dart';
import '../../repositories/auth_repo.dart';
import '../../utils/amc/amc_module_readiness.dart';
import '../../utils/envConfig.dart';
import '../../utils/error_i18n.dart';
import '../../utils/i18_key_constants.dart' as i18;
import '../../utils/role_login_resolver.dart';

part 'authbloc.freezed.dart';

/// A user is allowed into the app only when their roles grant at least one
/// module this app supports: Installation (this code) or AMC
/// (`AMC_FIELD_STAFF`). E4H itself never rejects a login on role grounds —
/// role codes there only steer post-login routing between modules (see
/// `RoleLoginResolver`) — but this app has no fallback module, so users with
/// neither role are rejected outright.
const String kInstallationReportPartAEditorRoleCode =
    installationReportPartAEditorRoleCode;

bool _hasSupportedRole(UserRequest userRequest) =>
    RoleLoginResolver.hasSupportedRole(
      userRequest.roles.map((role) => role.code),
    );

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc(this._authRepository) : super(const AuthState.unauthenticated()) {
    on<_AuthLoginEvent>(_onLogin);
    on<_AuthLogoutEvent>(_onLogout);
    on<_AuthLoadEvent>(_onLoad);
  }

  final AuthRepository _authRepository;

  FutureOr<void> _onLogin(
      _AuthLoginEvent event, Emitter<AuthState> emit) async {
    emit(const AuthState.loading());

    try {
      final response = await _authRepository.validateLogin(LoginModel(
        username: event.username,
        password: event.password,
        tenantId: envConfig.variables.tenantId,
        grant_type: 'password',
        userType: 'EMPLOYEE',
        scope: 'read',
      ));

      final userRequest = response.userRequest;
      if (userRequest == null) {
        emit(AuthState.error(i18.login.missingUserData));
        return;
      }

      if (!_hasSupportedRole(userRequest)) {
        emit(AuthState.error(i18.login.accessRoleRequired));
        return;
      }

      final secureStore = SecureStore();
      await Future.wait([
        secureStore.setAccessToken(response.access_token),
        secureStore.setAccessInfo(response),
        // E4H stores the user name as the "selected individual"; AMC records
        // it as `assignUserUuid` on locally saved visit forms.
        secureStore.setSelectedIndividual(userRequest.userName),
      ]);
      AuthTokenInterceptor.resetLogoutGuard();
      AmcModuleReadiness.invalidate();

      unawaited(_authRepository.reportLogin(userRequest));

      emit(AuthState.authenticated(
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        userRequest: userRequest,
      ));
    } catch (err) {
      emit(AuthState.error(i18KeyForNetworkError(err)));
    }
  }

  FutureOr<void> _onLogout(
      _AuthLogoutEvent event, Emitter<AuthState> emit) async {
    await _authRepository.logout();
    AmcModuleReadiness.invalidate();
    emit(const AuthState.unauthenticated());
  }

  FutureOr<void> _onLoad(_AuthLoadEvent event, Emitter<AuthState> emit) async {
    emit(const AuthState.loading());

    try {
      final accessInfo = await SecureStore().getAccessInfo();
      final userRequest = accessInfo?.userRequest;
      if (accessInfo == null ||
          accessInfo.refresh_token == null ||
          userRequest == null) {
        emit(const AuthState.unauthenticated());
        return;
      }

      if (!_hasSupportedRole(userRequest)) {
        emit(const AuthState.unauthenticated());
        return;
      }

      emit(AuthState.authenticated(
        accessToken: accessInfo.access_token,
        refreshToken: accessInfo.refresh_token,
        userRequest: userRequest,
      ));
    } catch (_) {
      emit(const AuthState.unauthenticated());
    }
  }
}

@freezed
class AuthEvent with _$AuthEvent {
  const factory AuthEvent.login({
    required String username,
    required String password,
  }) = _AuthLoginEvent;

  const factory AuthEvent.logout() = _AuthLogoutEvent;

  const factory AuthEvent.attemptLoad() = _AuthLoadEvent;
}

@freezed
class AuthState with _$AuthState {
  const factory AuthState.unauthenticated() = _Unauthenticated;
  const factory AuthState.loading() = _AuthLoading;
  const factory AuthState.authenticated({
    required String accessToken,
    required String? refreshToken,
    required UserRequest userRequest,
  }) = _Authenticated;
  const factory AuthState.error(String message) = _AuthError;
}
