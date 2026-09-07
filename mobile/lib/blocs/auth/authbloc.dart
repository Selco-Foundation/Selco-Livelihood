import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../data/network_manager.dart';
import '../../data/secure_storage/secureStore.dart';
import '../../model/login/loginModel.dart';
import '../../model/response/responsemodel.dart';
import '../../repositories/auth_repo.dart';
import '../../utils/envConfig.dart';
import '../../utils/i18_key_constants.dart' as i18;

part 'authbloc.freezed.dart';

/// Only a user whose roles include this code is allowed into the app.
/// E4H itself never rejects a login on role grounds — role codes there only
/// steer post-login routing between multiple app modules. This app has a
/// single module, so the equivalent behavior is an outright reject.
const String kInstallationReportPartAEditorRoleCode =
    'INSTALLATION_REPORT_PART_A_EDITOR';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc(this._authRepository) : super(const AuthState.unauthenticated()) {
    on<_AuthLoginEvent>(_onLogin);
    on<_AuthLogoutEvent>(_onLogout);
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

      final hasRequiredRole = userRequest.roles
          .any((role) => role.code == kInstallationReportPartAEditorRoleCode);
      if (!hasRequiredRole) {
        emit(AuthState.error(i18.login.accessRoleRequired));
        return;
      }

      final secureStore = SecureStore();
      await Future.wait([
        secureStore.setAccessToken(response.access_token),
        secureStore.setAccessInfo(response),
      ]);

      unawaited(_authRepository.reportLogin(userRequest));

      emit(AuthState.authenticated(
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        userRequest: userRequest,
      ));
    } catch (err) {
      emit(AuthState.error(_messageFromError(err)));
    }
  }

  FutureOr<void> _onLogout(
      _AuthLogoutEvent event, Emitter<AuthState> emit) async {
    await _authRepository.logout();
    emit(const AuthState.unauthenticated());
  }

  /// Returns an i18 key code, not resolved text — blocs have no
  /// `BuildContext` to translate through, so the UI layer resolves this via
  /// `context.translate(...)` when it displays the error.
  String _messageFromError(Object err) {
    final code = err is AppNetworkException ? err.code : null;
    switch (code) {
      case LoginErrorCode.noNetwork:
        return i18.login.errorNoNetwork;
      case LoginErrorCode.noInternet:
        return i18.login.errorNoInternet;
      case LoginErrorCode.connectionFailed:
        return i18.login.errorConnectionFailed;
      case LoginErrorCode.requestTimeout:
        return i18.login.errorRequestTimeout;
      case LoginErrorCode.serverError:
        return i18.login.errorServer;
      case LoginErrorCode.invalidCredentials:
        return i18.login.errorInvalidCredentials;
      case LoginErrorCode.unknown:
      default:
        return i18.login.loginFailed;
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
