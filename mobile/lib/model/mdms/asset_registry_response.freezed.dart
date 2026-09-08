// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'asset_registry_response.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

AssetRegistryMdmsResponse _$AssetRegistryMdmsResponseFromJson(
    Map<String, dynamic> json) {
  return _AssetRegistryMdmsResponse.fromJson(json);
}

/// @nodoc
mixin _$AssetRegistryMdmsResponse {
  @JsonKey(name: 'asset-registry')
  AssetRegistryModule? get assetRegistry => throw _privateConstructorUsedError;
  @JsonKey(name: 'facility')
  FacilityModule? get facility => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $AssetRegistryMdmsResponseCopyWith<AssetRegistryMdmsResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AssetRegistryMdmsResponseCopyWith<$Res> {
  factory $AssetRegistryMdmsResponseCopyWith(AssetRegistryMdmsResponse value,
          $Res Function(AssetRegistryMdmsResponse) then) =
      _$AssetRegistryMdmsResponseCopyWithImpl<$Res, AssetRegistryMdmsResponse>;
  @useResult
  $Res call(
      {@JsonKey(name: 'asset-registry') AssetRegistryModule? assetRegistry,
      @JsonKey(name: 'facility') FacilityModule? facility});

  $AssetRegistryModuleCopyWith<$Res>? get assetRegistry;
  $FacilityModuleCopyWith<$Res>? get facility;
}

/// @nodoc
class _$AssetRegistryMdmsResponseCopyWithImpl<$Res,
        $Val extends AssetRegistryMdmsResponse>
    implements $AssetRegistryMdmsResponseCopyWith<$Res> {
  _$AssetRegistryMdmsResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? assetRegistry = freezed,
    Object? facility = freezed,
  }) {
    return _then(_value.copyWith(
      assetRegistry: freezed == assetRegistry
          ? _value.assetRegistry
          : assetRegistry // ignore: cast_nullable_to_non_nullable
              as AssetRegistryModule?,
      facility: freezed == facility
          ? _value.facility
          : facility // ignore: cast_nullable_to_non_nullable
              as FacilityModule?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $AssetRegistryModuleCopyWith<$Res>? get assetRegistry {
    if (_value.assetRegistry == null) {
      return null;
    }

    return $AssetRegistryModuleCopyWith<$Res>(_value.assetRegistry!, (value) {
      return _then(_value.copyWith(assetRegistry: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $FacilityModuleCopyWith<$Res>? get facility {
    if (_value.facility == null) {
      return null;
    }

    return $FacilityModuleCopyWith<$Res>(_value.facility!, (value) {
      return _then(_value.copyWith(facility: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$AssetRegistryMdmsResponseImplCopyWith<$Res>
    implements $AssetRegistryMdmsResponseCopyWith<$Res> {
  factory _$$AssetRegistryMdmsResponseImplCopyWith(
          _$AssetRegistryMdmsResponseImpl value,
          $Res Function(_$AssetRegistryMdmsResponseImpl) then) =
      __$$AssetRegistryMdmsResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {@JsonKey(name: 'asset-registry') AssetRegistryModule? assetRegistry,
      @JsonKey(name: 'facility') FacilityModule? facility});

  @override
  $AssetRegistryModuleCopyWith<$Res>? get assetRegistry;
  @override
  $FacilityModuleCopyWith<$Res>? get facility;
}

/// @nodoc
class __$$AssetRegistryMdmsResponseImplCopyWithImpl<$Res>
    extends _$AssetRegistryMdmsResponseCopyWithImpl<$Res,
        _$AssetRegistryMdmsResponseImpl>
    implements _$$AssetRegistryMdmsResponseImplCopyWith<$Res> {
  __$$AssetRegistryMdmsResponseImplCopyWithImpl(
      _$AssetRegistryMdmsResponseImpl _value,
      $Res Function(_$AssetRegistryMdmsResponseImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? assetRegistry = freezed,
    Object? facility = freezed,
  }) {
    return _then(_$AssetRegistryMdmsResponseImpl(
      assetRegistry: freezed == assetRegistry
          ? _value.assetRegistry
          : assetRegistry // ignore: cast_nullable_to_non_nullable
              as AssetRegistryModule?,
      facility: freezed == facility
          ? _value.facility
          : facility // ignore: cast_nullable_to_non_nullable
              as FacilityModule?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AssetRegistryMdmsResponseImpl implements _AssetRegistryMdmsResponse {
  const _$AssetRegistryMdmsResponseImpl(
      {@JsonKey(name: 'asset-registry') this.assetRegistry,
      @JsonKey(name: 'facility') this.facility});

  factory _$AssetRegistryMdmsResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$AssetRegistryMdmsResponseImplFromJson(json);

  @override
  @JsonKey(name: 'asset-registry')
  final AssetRegistryModule? assetRegistry;
  @override
  @JsonKey(name: 'facility')
  final FacilityModule? facility;

  @override
  String toString() {
    return 'AssetRegistryMdmsResponse(assetRegistry: $assetRegistry, facility: $facility)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AssetRegistryMdmsResponseImpl &&
            (identical(other.assetRegistry, assetRegistry) ||
                other.assetRegistry == assetRegistry) &&
            (identical(other.facility, facility) ||
                other.facility == facility));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, assetRegistry, facility);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$AssetRegistryMdmsResponseImplCopyWith<_$AssetRegistryMdmsResponseImpl>
      get copyWith => __$$AssetRegistryMdmsResponseImplCopyWithImpl<
          _$AssetRegistryMdmsResponseImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AssetRegistryMdmsResponseImplToJson(
      this,
    );
  }
}

abstract class _AssetRegistryMdmsResponse implements AssetRegistryMdmsResponse {
  const factory _AssetRegistryMdmsResponse(
          {@JsonKey(name: 'asset-registry')
          final AssetRegistryModule? assetRegistry,
          @JsonKey(name: 'facility') final FacilityModule? facility}) =
      _$AssetRegistryMdmsResponseImpl;

  factory _AssetRegistryMdmsResponse.fromJson(Map<String, dynamic> json) =
      _$AssetRegistryMdmsResponseImpl.fromJson;

  @override
  @JsonKey(name: 'asset-registry')
  AssetRegistryModule? get assetRegistry;
  @override
  @JsonKey(name: 'facility')
  FacilityModule? get facility;
  @override
  @JsonKey(ignore: true)
  _$$AssetRegistryMdmsResponseImplCopyWith<_$AssetRegistryMdmsResponseImpl>
      get copyWith => throw _privateConstructorUsedError;
}

AssetRegistryModule _$AssetRegistryModuleFromJson(Map<String, dynamic> json) {
  return _AssetRegistryModule.fromJson(json);
}

/// @nodoc
mixin _$AssetRegistryModule {
  @JsonKey(name: 'AssetCountSchema')
  List<AssetCountData> get assetCountSchema =>
      throw _privateConstructorUsedError;
  @JsonKey(name: 'AssetTypeSchema')
  List<AssetTypeData> get assetTypeSchema => throw _privateConstructorUsedError;
  @JsonKey(name: 'SystemSchema')
  List<SystemData> get systemSchema => throw _privateConstructorUsedError;
  @JsonKey(name: 'WarrantyDurationSchema')
  List<WarrantyData> get warrantyDurationSchema =>
      throw _privateConstructorUsedError;
  @JsonKey(name: 'BrandSchema')
  List<BrandData> get brandSchema => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $AssetRegistryModuleCopyWith<AssetRegistryModule> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AssetRegistryModuleCopyWith<$Res> {
  factory $AssetRegistryModuleCopyWith(
          AssetRegistryModule value, $Res Function(AssetRegistryModule) then) =
      _$AssetRegistryModuleCopyWithImpl<$Res, AssetRegistryModule>;
  @useResult
  $Res call(
      {@JsonKey(name: 'AssetCountSchema') List<AssetCountData> assetCountSchema,
      @JsonKey(name: 'AssetTypeSchema') List<AssetTypeData> assetTypeSchema,
      @JsonKey(name: 'SystemSchema') List<SystemData> systemSchema,
      @JsonKey(name: 'WarrantyDurationSchema')
      List<WarrantyData> warrantyDurationSchema,
      @JsonKey(name: 'BrandSchema') List<BrandData> brandSchema});
}

/// @nodoc
class _$AssetRegistryModuleCopyWithImpl<$Res, $Val extends AssetRegistryModule>
    implements $AssetRegistryModuleCopyWith<$Res> {
  _$AssetRegistryModuleCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? assetCountSchema = null,
    Object? assetTypeSchema = null,
    Object? systemSchema = null,
    Object? warrantyDurationSchema = null,
    Object? brandSchema = null,
  }) {
    return _then(_value.copyWith(
      assetCountSchema: null == assetCountSchema
          ? _value.assetCountSchema
          : assetCountSchema // ignore: cast_nullable_to_non_nullable
              as List<AssetCountData>,
      assetTypeSchema: null == assetTypeSchema
          ? _value.assetTypeSchema
          : assetTypeSchema // ignore: cast_nullable_to_non_nullable
              as List<AssetTypeData>,
      systemSchema: null == systemSchema
          ? _value.systemSchema
          : systemSchema // ignore: cast_nullable_to_non_nullable
              as List<SystemData>,
      warrantyDurationSchema: null == warrantyDurationSchema
          ? _value.warrantyDurationSchema
          : warrantyDurationSchema // ignore: cast_nullable_to_non_nullable
              as List<WarrantyData>,
      brandSchema: null == brandSchema
          ? _value.brandSchema
          : brandSchema // ignore: cast_nullable_to_non_nullable
              as List<BrandData>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AssetRegistryModuleImplCopyWith<$Res>
    implements $AssetRegistryModuleCopyWith<$Res> {
  factory _$$AssetRegistryModuleImplCopyWith(_$AssetRegistryModuleImpl value,
          $Res Function(_$AssetRegistryModuleImpl) then) =
      __$$AssetRegistryModuleImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {@JsonKey(name: 'AssetCountSchema') List<AssetCountData> assetCountSchema,
      @JsonKey(name: 'AssetTypeSchema') List<AssetTypeData> assetTypeSchema,
      @JsonKey(name: 'SystemSchema') List<SystemData> systemSchema,
      @JsonKey(name: 'WarrantyDurationSchema')
      List<WarrantyData> warrantyDurationSchema,
      @JsonKey(name: 'BrandSchema') List<BrandData> brandSchema});
}

/// @nodoc
class __$$AssetRegistryModuleImplCopyWithImpl<$Res>
    extends _$AssetRegistryModuleCopyWithImpl<$Res, _$AssetRegistryModuleImpl>
    implements _$$AssetRegistryModuleImplCopyWith<$Res> {
  __$$AssetRegistryModuleImplCopyWithImpl(_$AssetRegistryModuleImpl _value,
      $Res Function(_$AssetRegistryModuleImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? assetCountSchema = null,
    Object? assetTypeSchema = null,
    Object? systemSchema = null,
    Object? warrantyDurationSchema = null,
    Object? brandSchema = null,
  }) {
    return _then(_$AssetRegistryModuleImpl(
      assetCountSchema: null == assetCountSchema
          ? _value._assetCountSchema
          : assetCountSchema // ignore: cast_nullable_to_non_nullable
              as List<AssetCountData>,
      assetTypeSchema: null == assetTypeSchema
          ? _value._assetTypeSchema
          : assetTypeSchema // ignore: cast_nullable_to_non_nullable
              as List<AssetTypeData>,
      systemSchema: null == systemSchema
          ? _value._systemSchema
          : systemSchema // ignore: cast_nullable_to_non_nullable
              as List<SystemData>,
      warrantyDurationSchema: null == warrantyDurationSchema
          ? _value._warrantyDurationSchema
          : warrantyDurationSchema // ignore: cast_nullable_to_non_nullable
              as List<WarrantyData>,
      brandSchema: null == brandSchema
          ? _value._brandSchema
          : brandSchema // ignore: cast_nullable_to_non_nullable
              as List<BrandData>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AssetRegistryModuleImpl implements _AssetRegistryModule {
  const _$AssetRegistryModuleImpl(
      {@JsonKey(name: 'AssetCountSchema')
      final List<AssetCountData> assetCountSchema = const [],
      @JsonKey(name: 'AssetTypeSchema')
      final List<AssetTypeData> assetTypeSchema = const [],
      @JsonKey(name: 'SystemSchema')
      final List<SystemData> systemSchema = const [],
      @JsonKey(name: 'WarrantyDurationSchema')
      final List<WarrantyData> warrantyDurationSchema = const [],
      @JsonKey(name: 'BrandSchema')
      final List<BrandData> brandSchema = const []})
      : _assetCountSchema = assetCountSchema,
        _assetTypeSchema = assetTypeSchema,
        _systemSchema = systemSchema,
        _warrantyDurationSchema = warrantyDurationSchema,
        _brandSchema = brandSchema;

  factory _$AssetRegistryModuleImpl.fromJson(Map<String, dynamic> json) =>
      _$$AssetRegistryModuleImplFromJson(json);

  final List<AssetCountData> _assetCountSchema;
  @override
  @JsonKey(name: 'AssetCountSchema')
  List<AssetCountData> get assetCountSchema {
    if (_assetCountSchema is EqualUnmodifiableListView)
      return _assetCountSchema;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_assetCountSchema);
  }

  final List<AssetTypeData> _assetTypeSchema;
  @override
  @JsonKey(name: 'AssetTypeSchema')
  List<AssetTypeData> get assetTypeSchema {
    if (_assetTypeSchema is EqualUnmodifiableListView) return _assetTypeSchema;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_assetTypeSchema);
  }

  final List<SystemData> _systemSchema;
  @override
  @JsonKey(name: 'SystemSchema')
  List<SystemData> get systemSchema {
    if (_systemSchema is EqualUnmodifiableListView) return _systemSchema;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_systemSchema);
  }

  final List<WarrantyData> _warrantyDurationSchema;
  @override
  @JsonKey(name: 'WarrantyDurationSchema')
  List<WarrantyData> get warrantyDurationSchema {
    if (_warrantyDurationSchema is EqualUnmodifiableListView)
      return _warrantyDurationSchema;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_warrantyDurationSchema);
  }

  final List<BrandData> _brandSchema;
  @override
  @JsonKey(name: 'BrandSchema')
  List<BrandData> get brandSchema {
    if (_brandSchema is EqualUnmodifiableListView) return _brandSchema;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_brandSchema);
  }

  @override
  String toString() {
    return 'AssetRegistryModule(assetCountSchema: $assetCountSchema, assetTypeSchema: $assetTypeSchema, systemSchema: $systemSchema, warrantyDurationSchema: $warrantyDurationSchema, brandSchema: $brandSchema)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AssetRegistryModuleImpl &&
            const DeepCollectionEquality()
                .equals(other._assetCountSchema, _assetCountSchema) &&
            const DeepCollectionEquality()
                .equals(other._assetTypeSchema, _assetTypeSchema) &&
            const DeepCollectionEquality()
                .equals(other._systemSchema, _systemSchema) &&
            const DeepCollectionEquality().equals(
                other._warrantyDurationSchema, _warrantyDurationSchema) &&
            const DeepCollectionEquality()
                .equals(other._brandSchema, _brandSchema));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_assetCountSchema),
      const DeepCollectionEquality().hash(_assetTypeSchema),
      const DeepCollectionEquality().hash(_systemSchema),
      const DeepCollectionEquality().hash(_warrantyDurationSchema),
      const DeepCollectionEquality().hash(_brandSchema));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$AssetRegistryModuleImplCopyWith<_$AssetRegistryModuleImpl> get copyWith =>
      __$$AssetRegistryModuleImplCopyWithImpl<_$AssetRegistryModuleImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AssetRegistryModuleImplToJson(
      this,
    );
  }
}

abstract class _AssetRegistryModule implements AssetRegistryModule {
  const factory _AssetRegistryModule(
          {@JsonKey(name: 'AssetCountSchema')
          final List<AssetCountData> assetCountSchema,
          @JsonKey(name: 'AssetTypeSchema')
          final List<AssetTypeData> assetTypeSchema,
          @JsonKey(name: 'SystemSchema') final List<SystemData> systemSchema,
          @JsonKey(name: 'WarrantyDurationSchema')
          final List<WarrantyData> warrantyDurationSchema,
          @JsonKey(name: 'BrandSchema') final List<BrandData> brandSchema}) =
      _$AssetRegistryModuleImpl;

  factory _AssetRegistryModule.fromJson(Map<String, dynamic> json) =
      _$AssetRegistryModuleImpl.fromJson;

  @override
  @JsonKey(name: 'AssetCountSchema')
  List<AssetCountData> get assetCountSchema;
  @override
  @JsonKey(name: 'AssetTypeSchema')
  List<AssetTypeData> get assetTypeSchema;
  @override
  @JsonKey(name: 'SystemSchema')
  List<SystemData> get systemSchema;
  @override
  @JsonKey(name: 'WarrantyDurationSchema')
  List<WarrantyData> get warrantyDurationSchema;
  @override
  @JsonKey(name: 'BrandSchema')
  List<BrandData> get brandSchema;
  @override
  @JsonKey(ignore: true)
  _$$AssetRegistryModuleImplCopyWith<_$AssetRegistryModuleImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

FacilityModule _$FacilityModuleFromJson(Map<String, dynamic> json) {
  return _FacilityModule.fromJson(json);
}

/// @nodoc
mixin _$FacilityModule {
  @JsonKey(name: 'SolarSolutionDesignType')
  List<SolutionDesignType> get solarSolutionDesignType =>
      throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $FacilityModuleCopyWith<FacilityModule> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $FacilityModuleCopyWith<$Res> {
  factory $FacilityModuleCopyWith(
          FacilityModule value, $Res Function(FacilityModule) then) =
      _$FacilityModuleCopyWithImpl<$Res, FacilityModule>;
  @useResult
  $Res call(
      {@JsonKey(name: 'SolarSolutionDesignType')
      List<SolutionDesignType> solarSolutionDesignType});
}

/// @nodoc
class _$FacilityModuleCopyWithImpl<$Res, $Val extends FacilityModule>
    implements $FacilityModuleCopyWith<$Res> {
  _$FacilityModuleCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? solarSolutionDesignType = null,
  }) {
    return _then(_value.copyWith(
      solarSolutionDesignType: null == solarSolutionDesignType
          ? _value.solarSolutionDesignType
          : solarSolutionDesignType // ignore: cast_nullable_to_non_nullable
              as List<SolutionDesignType>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$FacilityModuleImplCopyWith<$Res>
    implements $FacilityModuleCopyWith<$Res> {
  factory _$$FacilityModuleImplCopyWith(_$FacilityModuleImpl value,
          $Res Function(_$FacilityModuleImpl) then) =
      __$$FacilityModuleImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {@JsonKey(name: 'SolarSolutionDesignType')
      List<SolutionDesignType> solarSolutionDesignType});
}

/// @nodoc
class __$$FacilityModuleImplCopyWithImpl<$Res>
    extends _$FacilityModuleCopyWithImpl<$Res, _$FacilityModuleImpl>
    implements _$$FacilityModuleImplCopyWith<$Res> {
  __$$FacilityModuleImplCopyWithImpl(
      _$FacilityModuleImpl _value, $Res Function(_$FacilityModuleImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? solarSolutionDesignType = null,
  }) {
    return _then(_$FacilityModuleImpl(
      solarSolutionDesignType: null == solarSolutionDesignType
          ? _value._solarSolutionDesignType
          : solarSolutionDesignType // ignore: cast_nullable_to_non_nullable
              as List<SolutionDesignType>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$FacilityModuleImpl implements _FacilityModule {
  const _$FacilityModuleImpl(
      {@JsonKey(name: 'SolarSolutionDesignType')
      final List<SolutionDesignType> solarSolutionDesignType = const []})
      : _solarSolutionDesignType = solarSolutionDesignType;

  factory _$FacilityModuleImpl.fromJson(Map<String, dynamic> json) =>
      _$$FacilityModuleImplFromJson(json);

  final List<SolutionDesignType> _solarSolutionDesignType;
  @override
  @JsonKey(name: 'SolarSolutionDesignType')
  List<SolutionDesignType> get solarSolutionDesignType {
    if (_solarSolutionDesignType is EqualUnmodifiableListView)
      return _solarSolutionDesignType;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_solarSolutionDesignType);
  }

  @override
  String toString() {
    return 'FacilityModule(solarSolutionDesignType: $solarSolutionDesignType)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FacilityModuleImpl &&
            const DeepCollectionEquality().equals(
                other._solarSolutionDesignType, _solarSolutionDesignType));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType,
      const DeepCollectionEquality().hash(_solarSolutionDesignType));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$FacilityModuleImplCopyWith<_$FacilityModuleImpl> get copyWith =>
      __$$FacilityModuleImplCopyWithImpl<_$FacilityModuleImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$FacilityModuleImplToJson(
      this,
    );
  }
}

abstract class _FacilityModule implements FacilityModule {
  const factory _FacilityModule(
          {@JsonKey(name: 'SolarSolutionDesignType')
          final List<SolutionDesignType> solarSolutionDesignType}) =
      _$FacilityModuleImpl;

  factory _FacilityModule.fromJson(Map<String, dynamic> json) =
      _$FacilityModuleImpl.fromJson;

  @override
  @JsonKey(name: 'SolarSolutionDesignType')
  List<SolutionDesignType> get solarSolutionDesignType;
  @override
  @JsonKey(ignore: true)
  _$$FacilityModuleImplCopyWith<_$FacilityModuleImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
