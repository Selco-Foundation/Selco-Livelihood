// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'app_init.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$InitEvent {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() onLaunch,
    required TResult Function() fetchMdms,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? onLaunch,
    TResult? Function()? fetchMdms,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? onLaunch,
    TResult Function()? fetchMdms,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_AppLaunchEvent value) onLaunch,
    required TResult Function(_FetchMdmsEvent value) fetchMdms,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_AppLaunchEvent value)? onLaunch,
    TResult? Function(_FetchMdmsEvent value)? fetchMdms,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_AppLaunchEvent value)? onLaunch,
    TResult Function(_FetchMdmsEvent value)? fetchMdms,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $InitEventCopyWith<$Res> {
  factory $InitEventCopyWith(InitEvent value, $Res Function(InitEvent) then) =
      _$InitEventCopyWithImpl<$Res, InitEvent>;
}

/// @nodoc
class _$InitEventCopyWithImpl<$Res, $Val extends InitEvent>
    implements $InitEventCopyWith<$Res> {
  _$InitEventCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;
}

/// @nodoc
abstract class _$$AppLaunchEventImplCopyWith<$Res> {
  factory _$$AppLaunchEventImplCopyWith(_$AppLaunchEventImpl value,
          $Res Function(_$AppLaunchEventImpl) then) =
      __$$AppLaunchEventImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$AppLaunchEventImplCopyWithImpl<$Res>
    extends _$InitEventCopyWithImpl<$Res, _$AppLaunchEventImpl>
    implements _$$AppLaunchEventImplCopyWith<$Res> {
  __$$AppLaunchEventImplCopyWithImpl(
      _$AppLaunchEventImpl _value, $Res Function(_$AppLaunchEventImpl) _then)
      : super(_value, _then);
}

/// @nodoc

class _$AppLaunchEventImpl implements _AppLaunchEvent {
  const _$AppLaunchEventImpl();

  @override
  String toString() {
    return 'InitEvent.onLaunch()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$AppLaunchEventImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() onLaunch,
    required TResult Function() fetchMdms,
  }) {
    return onLaunch();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? onLaunch,
    TResult? Function()? fetchMdms,
  }) {
    return onLaunch?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? onLaunch,
    TResult Function()? fetchMdms,
    required TResult orElse(),
  }) {
    if (onLaunch != null) {
      return onLaunch();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_AppLaunchEvent value) onLaunch,
    required TResult Function(_FetchMdmsEvent value) fetchMdms,
  }) {
    return onLaunch(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_AppLaunchEvent value)? onLaunch,
    TResult? Function(_FetchMdmsEvent value)? fetchMdms,
  }) {
    return onLaunch?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_AppLaunchEvent value)? onLaunch,
    TResult Function(_FetchMdmsEvent value)? fetchMdms,
    required TResult orElse(),
  }) {
    if (onLaunch != null) {
      return onLaunch(this);
    }
    return orElse();
  }
}

abstract class _AppLaunchEvent implements InitEvent {
  const factory _AppLaunchEvent() = _$AppLaunchEventImpl;
}

/// @nodoc
abstract class _$$FetchMdmsEventImplCopyWith<$Res> {
  factory _$$FetchMdmsEventImplCopyWith(_$FetchMdmsEventImpl value,
          $Res Function(_$FetchMdmsEventImpl) then) =
      __$$FetchMdmsEventImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$FetchMdmsEventImplCopyWithImpl<$Res>
    extends _$InitEventCopyWithImpl<$Res, _$FetchMdmsEventImpl>
    implements _$$FetchMdmsEventImplCopyWith<$Res> {
  __$$FetchMdmsEventImplCopyWithImpl(
      _$FetchMdmsEventImpl _value, $Res Function(_$FetchMdmsEventImpl) _then)
      : super(_value, _then);
}

/// @nodoc

class _$FetchMdmsEventImpl implements _FetchMdmsEvent {
  const _$FetchMdmsEventImpl();

  @override
  String toString() {
    return 'InitEvent.fetchMdms()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$FetchMdmsEventImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() onLaunch,
    required TResult Function() fetchMdms,
  }) {
    return fetchMdms();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? onLaunch,
    TResult? Function()? fetchMdms,
  }) {
    return fetchMdms?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? onLaunch,
    TResult Function()? fetchMdms,
    required TResult orElse(),
  }) {
    if (fetchMdms != null) {
      return fetchMdms();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_AppLaunchEvent value) onLaunch,
    required TResult Function(_FetchMdmsEvent value) fetchMdms,
  }) {
    return fetchMdms(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_AppLaunchEvent value)? onLaunch,
    TResult? Function(_FetchMdmsEvent value)? fetchMdms,
  }) {
    return fetchMdms?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_AppLaunchEvent value)? onLaunch,
    TResult Function(_FetchMdmsEvent value)? fetchMdms,
    required TResult orElse(),
  }) {
    if (fetchMdms != null) {
      return fetchMdms(this);
    }
    return orElse();
  }
}

abstract class _FetchMdmsEvent implements InitEvent {
  const factory _FetchMdmsEvent() = _$FetchMdmsEventImpl;
}

/// @nodoc
mixin _$InitState {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() uninitialized,
    required TResult Function(MdmsResponseModel appConfig) defaulted,
    required TResult Function(MdmsResponseModel appConfig) loadingMdms,
    required TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)
        initialized,
    required TResult Function(MdmsResponseModel appConfig, String message)
        mdmsError,
    required TResult Function(String message) error,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? uninitialized,
    TResult? Function(MdmsResponseModel appConfig)? defaulted,
    TResult? Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult? Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult? Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult? Function(String message)? error,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? uninitialized,
    TResult Function(MdmsResponseModel appConfig)? defaulted,
    TResult Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_Uninitialized value) uninitialized,
    required TResult Function(Defaulted value) defaulted,
    required TResult Function(_LoadingMdms value) loadingMdms,
    required TResult Function(_Initialized value) initialized,
    required TResult Function(_MdmsError value) mdmsError,
    required TResult Function(Error value) error,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_Uninitialized value)? uninitialized,
    TResult? Function(Defaulted value)? defaulted,
    TResult? Function(_LoadingMdms value)? loadingMdms,
    TResult? Function(_Initialized value)? initialized,
    TResult? Function(_MdmsError value)? mdmsError,
    TResult? Function(Error value)? error,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_Uninitialized value)? uninitialized,
    TResult Function(Defaulted value)? defaulted,
    TResult Function(_LoadingMdms value)? loadingMdms,
    TResult Function(_Initialized value)? initialized,
    TResult Function(_MdmsError value)? mdmsError,
    TResult Function(Error value)? error,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $InitStateCopyWith<$Res> {
  factory $InitStateCopyWith(InitState value, $Res Function(InitState) then) =
      _$InitStateCopyWithImpl<$Res, InitState>;
}

/// @nodoc
class _$InitStateCopyWithImpl<$Res, $Val extends InitState>
    implements $InitStateCopyWith<$Res> {
  _$InitStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;
}

/// @nodoc
abstract class _$$UninitializedImplCopyWith<$Res> {
  factory _$$UninitializedImplCopyWith(
          _$UninitializedImpl value, $Res Function(_$UninitializedImpl) then) =
      __$$UninitializedImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$UninitializedImplCopyWithImpl<$Res>
    extends _$InitStateCopyWithImpl<$Res, _$UninitializedImpl>
    implements _$$UninitializedImplCopyWith<$Res> {
  __$$UninitializedImplCopyWithImpl(
      _$UninitializedImpl _value, $Res Function(_$UninitializedImpl) _then)
      : super(_value, _then);
}

/// @nodoc

class _$UninitializedImpl extends _Uninitialized {
  const _$UninitializedImpl() : super._();

  @override
  String toString() {
    return 'InitState.uninitialized()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$UninitializedImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() uninitialized,
    required TResult Function(MdmsResponseModel appConfig) defaulted,
    required TResult Function(MdmsResponseModel appConfig) loadingMdms,
    required TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)
        initialized,
    required TResult Function(MdmsResponseModel appConfig, String message)
        mdmsError,
    required TResult Function(String message) error,
  }) {
    return uninitialized();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? uninitialized,
    TResult? Function(MdmsResponseModel appConfig)? defaulted,
    TResult? Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult? Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult? Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult? Function(String message)? error,
  }) {
    return uninitialized?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? uninitialized,
    TResult Function(MdmsResponseModel appConfig)? defaulted,
    TResult Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (uninitialized != null) {
      return uninitialized();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_Uninitialized value) uninitialized,
    required TResult Function(Defaulted value) defaulted,
    required TResult Function(_LoadingMdms value) loadingMdms,
    required TResult Function(_Initialized value) initialized,
    required TResult Function(_MdmsError value) mdmsError,
    required TResult Function(Error value) error,
  }) {
    return uninitialized(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_Uninitialized value)? uninitialized,
    TResult? Function(Defaulted value)? defaulted,
    TResult? Function(_LoadingMdms value)? loadingMdms,
    TResult? Function(_Initialized value)? initialized,
    TResult? Function(_MdmsError value)? mdmsError,
    TResult? Function(Error value)? error,
  }) {
    return uninitialized?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_Uninitialized value)? uninitialized,
    TResult Function(Defaulted value)? defaulted,
    TResult Function(_LoadingMdms value)? loadingMdms,
    TResult Function(_Initialized value)? initialized,
    TResult Function(_MdmsError value)? mdmsError,
    TResult Function(Error value)? error,
    required TResult orElse(),
  }) {
    if (uninitialized != null) {
      return uninitialized(this);
    }
    return orElse();
  }
}

abstract class _Uninitialized extends InitState {
  const factory _Uninitialized() = _$UninitializedImpl;
  const _Uninitialized._() : super._();
}

/// @nodoc
abstract class _$$DefaultedImplCopyWith<$Res> {
  factory _$$DefaultedImplCopyWith(
          _$DefaultedImpl value, $Res Function(_$DefaultedImpl) then) =
      __$$DefaultedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({MdmsResponseModel appConfig});

  $MdmsResponseModelCopyWith<$Res> get appConfig;
}

/// @nodoc
class __$$DefaultedImplCopyWithImpl<$Res>
    extends _$InitStateCopyWithImpl<$Res, _$DefaultedImpl>
    implements _$$DefaultedImplCopyWith<$Res> {
  __$$DefaultedImplCopyWithImpl(
      _$DefaultedImpl _value, $Res Function(_$DefaultedImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? appConfig = null,
  }) {
    return _then(_$DefaultedImpl(
      appConfig: null == appConfig
          ? _value.appConfig
          : appConfig // ignore: cast_nullable_to_non_nullable
              as MdmsResponseModel,
    ));
  }

  @override
  @pragma('vm:prefer-inline')
  $MdmsResponseModelCopyWith<$Res> get appConfig {
    return $MdmsResponseModelCopyWith<$Res>(_value.appConfig, (value) {
      return _then(_value.copyWith(appConfig: value));
    });
  }
}

/// @nodoc

class _$DefaultedImpl extends Defaulted {
  const _$DefaultedImpl({required this.appConfig}) : super._();

  @override
  final MdmsResponseModel appConfig;

  @override
  String toString() {
    return 'InitState.defaulted(appConfig: $appConfig)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DefaultedImpl &&
            (identical(other.appConfig, appConfig) ||
                other.appConfig == appConfig));
  }

  @override
  int get hashCode => Object.hash(runtimeType, appConfig);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$DefaultedImplCopyWith<_$DefaultedImpl> get copyWith =>
      __$$DefaultedImplCopyWithImpl<_$DefaultedImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() uninitialized,
    required TResult Function(MdmsResponseModel appConfig) defaulted,
    required TResult Function(MdmsResponseModel appConfig) loadingMdms,
    required TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)
        initialized,
    required TResult Function(MdmsResponseModel appConfig, String message)
        mdmsError,
    required TResult Function(String message) error,
  }) {
    return defaulted(appConfig);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? uninitialized,
    TResult? Function(MdmsResponseModel appConfig)? defaulted,
    TResult? Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult? Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult? Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult? Function(String message)? error,
  }) {
    return defaulted?.call(appConfig);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? uninitialized,
    TResult Function(MdmsResponseModel appConfig)? defaulted,
    TResult Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (defaulted != null) {
      return defaulted(appConfig);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_Uninitialized value) uninitialized,
    required TResult Function(Defaulted value) defaulted,
    required TResult Function(_LoadingMdms value) loadingMdms,
    required TResult Function(_Initialized value) initialized,
    required TResult Function(_MdmsError value) mdmsError,
    required TResult Function(Error value) error,
  }) {
    return defaulted(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_Uninitialized value)? uninitialized,
    TResult? Function(Defaulted value)? defaulted,
    TResult? Function(_LoadingMdms value)? loadingMdms,
    TResult? Function(_Initialized value)? initialized,
    TResult? Function(_MdmsError value)? mdmsError,
    TResult? Function(Error value)? error,
  }) {
    return defaulted?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_Uninitialized value)? uninitialized,
    TResult Function(Defaulted value)? defaulted,
    TResult Function(_LoadingMdms value)? loadingMdms,
    TResult Function(_Initialized value)? initialized,
    TResult Function(_MdmsError value)? mdmsError,
    TResult Function(Error value)? error,
    required TResult orElse(),
  }) {
    if (defaulted != null) {
      return defaulted(this);
    }
    return orElse();
  }
}

abstract class Defaulted extends InitState {
  const factory Defaulted({required final MdmsResponseModel appConfig}) =
      _$DefaultedImpl;
  const Defaulted._() : super._();

  MdmsResponseModel get appConfig;
  @JsonKey(ignore: true)
  _$$DefaultedImplCopyWith<_$DefaultedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$LoadingMdmsImplCopyWith<$Res> {
  factory _$$LoadingMdmsImplCopyWith(
          _$LoadingMdmsImpl value, $Res Function(_$LoadingMdmsImpl) then) =
      __$$LoadingMdmsImplCopyWithImpl<$Res>;
  @useResult
  $Res call({MdmsResponseModel appConfig});

  $MdmsResponseModelCopyWith<$Res> get appConfig;
}

/// @nodoc
class __$$LoadingMdmsImplCopyWithImpl<$Res>
    extends _$InitStateCopyWithImpl<$Res, _$LoadingMdmsImpl>
    implements _$$LoadingMdmsImplCopyWith<$Res> {
  __$$LoadingMdmsImplCopyWithImpl(
      _$LoadingMdmsImpl _value, $Res Function(_$LoadingMdmsImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? appConfig = null,
  }) {
    return _then(_$LoadingMdmsImpl(
      appConfig: null == appConfig
          ? _value.appConfig
          : appConfig // ignore: cast_nullable_to_non_nullable
              as MdmsResponseModel,
    ));
  }

  @override
  @pragma('vm:prefer-inline')
  $MdmsResponseModelCopyWith<$Res> get appConfig {
    return $MdmsResponseModelCopyWith<$Res>(_value.appConfig, (value) {
      return _then(_value.copyWith(appConfig: value));
    });
  }
}

/// @nodoc

class _$LoadingMdmsImpl extends _LoadingMdms {
  const _$LoadingMdmsImpl({required this.appConfig}) : super._();

  @override
  final MdmsResponseModel appConfig;

  @override
  String toString() {
    return 'InitState.loadingMdms(appConfig: $appConfig)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LoadingMdmsImpl &&
            (identical(other.appConfig, appConfig) ||
                other.appConfig == appConfig));
  }

  @override
  int get hashCode => Object.hash(runtimeType, appConfig);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$LoadingMdmsImplCopyWith<_$LoadingMdmsImpl> get copyWith =>
      __$$LoadingMdmsImplCopyWithImpl<_$LoadingMdmsImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() uninitialized,
    required TResult Function(MdmsResponseModel appConfig) defaulted,
    required TResult Function(MdmsResponseModel appConfig) loadingMdms,
    required TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)
        initialized,
    required TResult Function(MdmsResponseModel appConfig, String message)
        mdmsError,
    required TResult Function(String message) error,
  }) {
    return loadingMdms(appConfig);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? uninitialized,
    TResult? Function(MdmsResponseModel appConfig)? defaulted,
    TResult? Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult? Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult? Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult? Function(String message)? error,
  }) {
    return loadingMdms?.call(appConfig);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? uninitialized,
    TResult Function(MdmsResponseModel appConfig)? defaulted,
    TResult Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (loadingMdms != null) {
      return loadingMdms(appConfig);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_Uninitialized value) uninitialized,
    required TResult Function(Defaulted value) defaulted,
    required TResult Function(_LoadingMdms value) loadingMdms,
    required TResult Function(_Initialized value) initialized,
    required TResult Function(_MdmsError value) mdmsError,
    required TResult Function(Error value) error,
  }) {
    return loadingMdms(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_Uninitialized value)? uninitialized,
    TResult? Function(Defaulted value)? defaulted,
    TResult? Function(_LoadingMdms value)? loadingMdms,
    TResult? Function(_Initialized value)? initialized,
    TResult? Function(_MdmsError value)? mdmsError,
    TResult? Function(Error value)? error,
  }) {
    return loadingMdms?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_Uninitialized value)? uninitialized,
    TResult Function(Defaulted value)? defaulted,
    TResult Function(_LoadingMdms value)? loadingMdms,
    TResult Function(_Initialized value)? initialized,
    TResult Function(_MdmsError value)? mdmsError,
    TResult Function(Error value)? error,
    required TResult orElse(),
  }) {
    if (loadingMdms != null) {
      return loadingMdms(this);
    }
    return orElse();
  }
}

abstract class _LoadingMdms extends InitState {
  const factory _LoadingMdms({required final MdmsResponseModel appConfig}) =
      _$LoadingMdmsImpl;
  const _LoadingMdms._() : super._();

  MdmsResponseModel get appConfig;
  @JsonKey(ignore: true)
  _$$LoadingMdmsImplCopyWith<_$LoadingMdmsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$InitializedImplCopyWith<$Res> {
  factory _$$InitializedImplCopyWith(
          _$InitializedImpl value, $Res Function(_$InitializedImpl) then) =
      __$$InitializedImplCopyWithImpl<$Res>;
  @useResult
  $Res call(
      {MdmsResponseModel appConfig, AssetRegistryMdmsResponse assetRegistry});

  $MdmsResponseModelCopyWith<$Res> get appConfig;
  $AssetRegistryMdmsResponseCopyWith<$Res> get assetRegistry;
}

/// @nodoc
class __$$InitializedImplCopyWithImpl<$Res>
    extends _$InitStateCopyWithImpl<$Res, _$InitializedImpl>
    implements _$$InitializedImplCopyWith<$Res> {
  __$$InitializedImplCopyWithImpl(
      _$InitializedImpl _value, $Res Function(_$InitializedImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? appConfig = null,
    Object? assetRegistry = null,
  }) {
    return _then(_$InitializedImpl(
      appConfig: null == appConfig
          ? _value.appConfig
          : appConfig // ignore: cast_nullable_to_non_nullable
              as MdmsResponseModel,
      assetRegistry: null == assetRegistry
          ? _value.assetRegistry
          : assetRegistry // ignore: cast_nullable_to_non_nullable
              as AssetRegistryMdmsResponse,
    ));
  }

  @override
  @pragma('vm:prefer-inline')
  $MdmsResponseModelCopyWith<$Res> get appConfig {
    return $MdmsResponseModelCopyWith<$Res>(_value.appConfig, (value) {
      return _then(_value.copyWith(appConfig: value));
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $AssetRegistryMdmsResponseCopyWith<$Res> get assetRegistry {
    return $AssetRegistryMdmsResponseCopyWith<$Res>(_value.assetRegistry,
        (value) {
      return _then(_value.copyWith(assetRegistry: value));
    });
  }
}

/// @nodoc

class _$InitializedImpl extends _Initialized {
  const _$InitializedImpl(
      {required this.appConfig, required this.assetRegistry})
      : super._();

  @override
  final MdmsResponseModel appConfig;
  @override
  final AssetRegistryMdmsResponse assetRegistry;

  @override
  String toString() {
    return 'InitState.initialized(appConfig: $appConfig, assetRegistry: $assetRegistry)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$InitializedImpl &&
            (identical(other.appConfig, appConfig) ||
                other.appConfig == appConfig) &&
            (identical(other.assetRegistry, assetRegistry) ||
                other.assetRegistry == assetRegistry));
  }

  @override
  int get hashCode => Object.hash(runtimeType, appConfig, assetRegistry);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$InitializedImplCopyWith<_$InitializedImpl> get copyWith =>
      __$$InitializedImplCopyWithImpl<_$InitializedImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() uninitialized,
    required TResult Function(MdmsResponseModel appConfig) defaulted,
    required TResult Function(MdmsResponseModel appConfig) loadingMdms,
    required TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)
        initialized,
    required TResult Function(MdmsResponseModel appConfig, String message)
        mdmsError,
    required TResult Function(String message) error,
  }) {
    return initialized(appConfig, assetRegistry);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? uninitialized,
    TResult? Function(MdmsResponseModel appConfig)? defaulted,
    TResult? Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult? Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult? Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult? Function(String message)? error,
  }) {
    return initialized?.call(appConfig, assetRegistry);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? uninitialized,
    TResult Function(MdmsResponseModel appConfig)? defaulted,
    TResult Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (initialized != null) {
      return initialized(appConfig, assetRegistry);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_Uninitialized value) uninitialized,
    required TResult Function(Defaulted value) defaulted,
    required TResult Function(_LoadingMdms value) loadingMdms,
    required TResult Function(_Initialized value) initialized,
    required TResult Function(_MdmsError value) mdmsError,
    required TResult Function(Error value) error,
  }) {
    return initialized(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_Uninitialized value)? uninitialized,
    TResult? Function(Defaulted value)? defaulted,
    TResult? Function(_LoadingMdms value)? loadingMdms,
    TResult? Function(_Initialized value)? initialized,
    TResult? Function(_MdmsError value)? mdmsError,
    TResult? Function(Error value)? error,
  }) {
    return initialized?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_Uninitialized value)? uninitialized,
    TResult Function(Defaulted value)? defaulted,
    TResult Function(_LoadingMdms value)? loadingMdms,
    TResult Function(_Initialized value)? initialized,
    TResult Function(_MdmsError value)? mdmsError,
    TResult Function(Error value)? error,
    required TResult orElse(),
  }) {
    if (initialized != null) {
      return initialized(this);
    }
    return orElse();
  }
}

abstract class _Initialized extends InitState {
  const factory _Initialized(
          {required final MdmsResponseModel appConfig,
          required final AssetRegistryMdmsResponse assetRegistry}) =
      _$InitializedImpl;
  const _Initialized._() : super._();

  MdmsResponseModel get appConfig;
  AssetRegistryMdmsResponse get assetRegistry;
  @JsonKey(ignore: true)
  _$$InitializedImplCopyWith<_$InitializedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$MdmsErrorImplCopyWith<$Res> {
  factory _$$MdmsErrorImplCopyWith(
          _$MdmsErrorImpl value, $Res Function(_$MdmsErrorImpl) then) =
      __$$MdmsErrorImplCopyWithImpl<$Res>;
  @useResult
  $Res call({MdmsResponseModel appConfig, String message});

  $MdmsResponseModelCopyWith<$Res> get appConfig;
}

/// @nodoc
class __$$MdmsErrorImplCopyWithImpl<$Res>
    extends _$InitStateCopyWithImpl<$Res, _$MdmsErrorImpl>
    implements _$$MdmsErrorImplCopyWith<$Res> {
  __$$MdmsErrorImplCopyWithImpl(
      _$MdmsErrorImpl _value, $Res Function(_$MdmsErrorImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? appConfig = null,
    Object? message = null,
  }) {
    return _then(_$MdmsErrorImpl(
      appConfig: null == appConfig
          ? _value.appConfig
          : appConfig // ignore: cast_nullable_to_non_nullable
              as MdmsResponseModel,
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }

  @override
  @pragma('vm:prefer-inline')
  $MdmsResponseModelCopyWith<$Res> get appConfig {
    return $MdmsResponseModelCopyWith<$Res>(_value.appConfig, (value) {
      return _then(_value.copyWith(appConfig: value));
    });
  }
}

/// @nodoc

class _$MdmsErrorImpl extends _MdmsError {
  const _$MdmsErrorImpl({required this.appConfig, required this.message})
      : super._();

  @override
  final MdmsResponseModel appConfig;
  @override
  final String message;

  @override
  String toString() {
    return 'InitState.mdmsError(appConfig: $appConfig, message: $message)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MdmsErrorImpl &&
            (identical(other.appConfig, appConfig) ||
                other.appConfig == appConfig) &&
            (identical(other.message, message) || other.message == message));
  }

  @override
  int get hashCode => Object.hash(runtimeType, appConfig, message);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$MdmsErrorImplCopyWith<_$MdmsErrorImpl> get copyWith =>
      __$$MdmsErrorImplCopyWithImpl<_$MdmsErrorImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() uninitialized,
    required TResult Function(MdmsResponseModel appConfig) defaulted,
    required TResult Function(MdmsResponseModel appConfig) loadingMdms,
    required TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)
        initialized,
    required TResult Function(MdmsResponseModel appConfig, String message)
        mdmsError,
    required TResult Function(String message) error,
  }) {
    return mdmsError(appConfig, message);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? uninitialized,
    TResult? Function(MdmsResponseModel appConfig)? defaulted,
    TResult? Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult? Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult? Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult? Function(String message)? error,
  }) {
    return mdmsError?.call(appConfig, message);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? uninitialized,
    TResult Function(MdmsResponseModel appConfig)? defaulted,
    TResult Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (mdmsError != null) {
      return mdmsError(appConfig, message);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_Uninitialized value) uninitialized,
    required TResult Function(Defaulted value) defaulted,
    required TResult Function(_LoadingMdms value) loadingMdms,
    required TResult Function(_Initialized value) initialized,
    required TResult Function(_MdmsError value) mdmsError,
    required TResult Function(Error value) error,
  }) {
    return mdmsError(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_Uninitialized value)? uninitialized,
    TResult? Function(Defaulted value)? defaulted,
    TResult? Function(_LoadingMdms value)? loadingMdms,
    TResult? Function(_Initialized value)? initialized,
    TResult? Function(_MdmsError value)? mdmsError,
    TResult? Function(Error value)? error,
  }) {
    return mdmsError?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_Uninitialized value)? uninitialized,
    TResult Function(Defaulted value)? defaulted,
    TResult Function(_LoadingMdms value)? loadingMdms,
    TResult Function(_Initialized value)? initialized,
    TResult Function(_MdmsError value)? mdmsError,
    TResult Function(Error value)? error,
    required TResult orElse(),
  }) {
    if (mdmsError != null) {
      return mdmsError(this);
    }
    return orElse();
  }
}

abstract class _MdmsError extends InitState {
  const factory _MdmsError(
      {required final MdmsResponseModel appConfig,
      required final String message}) = _$MdmsErrorImpl;
  const _MdmsError._() : super._();

  MdmsResponseModel get appConfig;
  String get message;
  @JsonKey(ignore: true)
  _$$MdmsErrorImplCopyWith<_$MdmsErrorImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$ErrorImplCopyWith<$Res> {
  factory _$$ErrorImplCopyWith(
          _$ErrorImpl value, $Res Function(_$ErrorImpl) then) =
      __$$ErrorImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String message});
}

/// @nodoc
class __$$ErrorImplCopyWithImpl<$Res>
    extends _$InitStateCopyWithImpl<$Res, _$ErrorImpl>
    implements _$$ErrorImplCopyWith<$Res> {
  __$$ErrorImplCopyWithImpl(
      _$ErrorImpl _value, $Res Function(_$ErrorImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? message = null,
  }) {
    return _then(_$ErrorImpl(
      null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc

class _$ErrorImpl extends Error {
  const _$ErrorImpl(this.message) : super._();

  @override
  final String message;

  @override
  String toString() {
    return 'InitState.error(message: $message)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ErrorImpl &&
            (identical(other.message, message) || other.message == message));
  }

  @override
  int get hashCode => Object.hash(runtimeType, message);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$ErrorImplCopyWith<_$ErrorImpl> get copyWith =>
      __$$ErrorImplCopyWithImpl<_$ErrorImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() uninitialized,
    required TResult Function(MdmsResponseModel appConfig) defaulted,
    required TResult Function(MdmsResponseModel appConfig) loadingMdms,
    required TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)
        initialized,
    required TResult Function(MdmsResponseModel appConfig, String message)
        mdmsError,
    required TResult Function(String message) error,
  }) {
    return error(message);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? uninitialized,
    TResult? Function(MdmsResponseModel appConfig)? defaulted,
    TResult? Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult? Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult? Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult? Function(String message)? error,
  }) {
    return error?.call(message);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? uninitialized,
    TResult Function(MdmsResponseModel appConfig)? defaulted,
    TResult Function(MdmsResponseModel appConfig)? loadingMdms,
    TResult Function(MdmsResponseModel appConfig,
            AssetRegistryMdmsResponse assetRegistry)?
        initialized,
    TResult Function(MdmsResponseModel appConfig, String message)? mdmsError,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(message);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_Uninitialized value) uninitialized,
    required TResult Function(Defaulted value) defaulted,
    required TResult Function(_LoadingMdms value) loadingMdms,
    required TResult Function(_Initialized value) initialized,
    required TResult Function(_MdmsError value) mdmsError,
    required TResult Function(Error value) error,
  }) {
    return error(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_Uninitialized value)? uninitialized,
    TResult? Function(Defaulted value)? defaulted,
    TResult? Function(_LoadingMdms value)? loadingMdms,
    TResult? Function(_Initialized value)? initialized,
    TResult? Function(_MdmsError value)? mdmsError,
    TResult? Function(Error value)? error,
  }) {
    return error?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_Uninitialized value)? uninitialized,
    TResult Function(Defaulted value)? defaulted,
    TResult Function(_LoadingMdms value)? loadingMdms,
    TResult Function(_Initialized value)? initialized,
    TResult Function(_MdmsError value)? mdmsError,
    TResult Function(Error value)? error,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(this);
    }
    return orElse();
  }
}

abstract class Error extends InitState {
  const factory Error(final String message) = _$ErrorImpl;
  const Error._() : super._();

  String get message;
  @JsonKey(ignore: true)
  _$$ErrorImplCopyWith<_$ErrorImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
