import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../model/appconfig/mdmsResponse.dart';
import '../../repositories/app_init_repo.dart';

part 'app_init.freezed.dart';

class AppInitialization extends Bloc<InitEvent, InitState> {
  AppInitialization() : super(const InitState.uninitialized()) {
    on<_AppLaunchEvent>(_onAppLaunch);
  }

  MdmsResponseModel? _cachedAppConfig;

  MdmsResponseModel? get cachedAppConfig => _cachedAppConfig;

  FutureOr<void> _onAppLaunch(
    _AppLaunchEvent event,
    Emitter<InitState> emit,
  ) async {
    final appInitRepo = AppInitRepo();

    try {
      final appConfig = await appInitRepo.searchAppConfiguration();

      _cachedAppConfig = appConfig;
      emit(InitState.defaulted(appConfig: appConfig));
    } catch (e) {
      emit(const InitState.error(
          'Failed to load configuration data. Please try again.'));
    }
  }
}

@freezed
class InitEvent with _$InitEvent {
  const factory InitEvent.onLaunch() = _AppLaunchEvent;
}

@freezed
class InitState with _$InitState {
  const InitState._();
  const factory InitState.uninitialized() = _Uninitialized;
  const factory InitState.defaulted({
    required MdmsResponseModel appConfig,
  }) = Defaulted;
  const factory InitState.error(String message) = Error;
}
