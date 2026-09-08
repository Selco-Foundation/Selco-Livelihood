import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../model/appconfig/mdmsResponse.dart';
import '../../model/mdms/asset_registry_response.dart';
import '../../repositories/app_init_repo.dart';
import '../../utils/error_i18n.dart';

part 'app_init.freezed.dart';

class AppInitialization extends Bloc<InitEvent, InitState> {
  AppInitialization({AppInitRepo? repo})
      : _repo = repo ?? AppInitRepo(),
        super(const InitState.uninitialized()) {
    on<_AppLaunchEvent>(_onAppLaunch);
    on<_FetchMdmsEvent>(_onFetchMdms);
  }

  final AppInitRepo _repo;

  MdmsResponseModel? _cachedAppConfig;

  MdmsResponseModel? get cachedAppConfig => _cachedAppConfig;

  FutureOr<void> _onAppLaunch(
    _AppLaunchEvent event,
    Emitter<InitState> emit,
  ) async {
    try {
      final appConfig = await _repo.searchAppConfiguration();

      _cachedAppConfig = appConfig;
      emit(InitState.defaulted(appConfig: appConfig));
    } catch (e) {
      emit(const InitState.error(
          'Failed to load configuration data. Please try again.'));
    }
  }

  FutureOr<void> _onFetchMdms(
    _FetchMdmsEvent event,
    Emitter<InitState> emit,
  ) async {
    final appConfig = state.maybeWhen(
      defaulted: (appConfig) => appConfig,
      loadingMdms: (appConfig) => appConfig,
      initialized: (appConfig, _) => appConfig,
      mdmsError: (appConfig, _) => appConfig,
      orElse: () => _cachedAppConfig,
    );
    if (appConfig == null) return;

    emit(InitState.loadingMdms(appConfig: appConfig));

    try {
      final assetRegistry = await _repo.searchAssetRegistry();
      emit(InitState.initialized(
        appConfig: appConfig,
        assetRegistry: assetRegistry,
      ));
    } catch (e) {
      emit(InitState.mdmsError(
        appConfig: appConfig,
        message: i18KeyForNetworkError(e),
      ));
    }
  }
}

@freezed
class InitEvent with _$InitEvent {
  const factory InitEvent.onLaunch() = _AppLaunchEvent;
  const factory InitEvent.fetchMdms() = _FetchMdmsEvent;
}

@freezed
class InitState with _$InitState {
  const InitState._();
  const factory InitState.uninitialized() = _Uninitialized;
  const factory InitState.defaulted({
    required MdmsResponseModel appConfig,
  }) = Defaulted;
  const factory InitState.loadingMdms({
    required MdmsResponseModel appConfig,
  }) = _LoadingMdms;
  const factory InitState.initialized({
    required MdmsResponseModel appConfig,
    required AssetRegistryMdmsResponse assetRegistry,
  }) = _Initialized;
  const factory InitState.mdmsError({
    required MdmsResponseModel appConfig,
    required String message,
  }) = _MdmsError;
  const factory InitState.error(String message) = Error;
}
