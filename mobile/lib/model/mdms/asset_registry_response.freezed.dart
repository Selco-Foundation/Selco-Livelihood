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
  @JsonKey(name: 'common-masters')
  CommonMastersModule? get commonMasters => throw _privateConstructorUsedError;
  @JsonKey(name: 'livelihood')
  LivelihoodModule? get livelihood => throw _privateConstructorUsedError;
  @JsonKey(name: 'Installation')
  InstallationModule? get installation => throw _privateConstructorUsedError;

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
      @JsonKey(name: 'common-masters') CommonMastersModule? commonMasters,
      @JsonKey(name: 'livelihood') LivelihoodModule? livelihood,
      @JsonKey(name: 'Installation') InstallationModule? installation});

  $AssetRegistryModuleCopyWith<$Res>? get assetRegistry;
  $CommonMastersModuleCopyWith<$Res>? get commonMasters;
  $LivelihoodModuleCopyWith<$Res>? get livelihood;
  $InstallationModuleCopyWith<$Res>? get installation;
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
    Object? commonMasters = freezed,
    Object? livelihood = freezed,
    Object? installation = freezed,
  }) {
    return _then(_value.copyWith(
      assetRegistry: freezed == assetRegistry
          ? _value.assetRegistry
          : assetRegistry // ignore: cast_nullable_to_non_nullable
              as AssetRegistryModule?,
      commonMasters: freezed == commonMasters
          ? _value.commonMasters
          : commonMasters // ignore: cast_nullable_to_non_nullable
              as CommonMastersModule?,
      livelihood: freezed == livelihood
          ? _value.livelihood
          : livelihood // ignore: cast_nullable_to_non_nullable
              as LivelihoodModule?,
      installation: freezed == installation
          ? _value.installation
          : installation // ignore: cast_nullable_to_non_nullable
              as InstallationModule?,
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
  $CommonMastersModuleCopyWith<$Res>? get commonMasters {
    if (_value.commonMasters == null) {
      return null;
    }

    return $CommonMastersModuleCopyWith<$Res>(_value.commonMasters!, (value) {
      return _then(_value.copyWith(commonMasters: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $LivelihoodModuleCopyWith<$Res>? get livelihood {
    if (_value.livelihood == null) {
      return null;
    }

    return $LivelihoodModuleCopyWith<$Res>(_value.livelihood!, (value) {
      return _then(_value.copyWith(livelihood: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $InstallationModuleCopyWith<$Res>? get installation {
    if (_value.installation == null) {
      return null;
    }

    return $InstallationModuleCopyWith<$Res>(_value.installation!, (value) {
      return _then(_value.copyWith(installation: value) as $Val);
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
      @JsonKey(name: 'common-masters') CommonMastersModule? commonMasters,
      @JsonKey(name: 'livelihood') LivelihoodModule? livelihood,
      @JsonKey(name: 'Installation') InstallationModule? installation});

  @override
  $AssetRegistryModuleCopyWith<$Res>? get assetRegistry;
  @override
  $CommonMastersModuleCopyWith<$Res>? get commonMasters;
  @override
  $LivelihoodModuleCopyWith<$Res>? get livelihood;
  @override
  $InstallationModuleCopyWith<$Res>? get installation;
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
    Object? commonMasters = freezed,
    Object? livelihood = freezed,
    Object? installation = freezed,
  }) {
    return _then(_$AssetRegistryMdmsResponseImpl(
      assetRegistry: freezed == assetRegistry
          ? _value.assetRegistry
          : assetRegistry // ignore: cast_nullable_to_non_nullable
              as AssetRegistryModule?,
      commonMasters: freezed == commonMasters
          ? _value.commonMasters
          : commonMasters // ignore: cast_nullable_to_non_nullable
              as CommonMastersModule?,
      livelihood: freezed == livelihood
          ? _value.livelihood
          : livelihood // ignore: cast_nullable_to_non_nullable
              as LivelihoodModule?,
      installation: freezed == installation
          ? _value.installation
          : installation // ignore: cast_nullable_to_non_nullable
              as InstallationModule?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AssetRegistryMdmsResponseImpl implements _AssetRegistryMdmsResponse {
  const _$AssetRegistryMdmsResponseImpl(
      {@JsonKey(name: 'asset-registry') this.assetRegistry,
      @JsonKey(name: 'common-masters') this.commonMasters,
      @JsonKey(name: 'livelihood') this.livelihood,
      @JsonKey(name: 'Installation') this.installation});

  factory _$AssetRegistryMdmsResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$AssetRegistryMdmsResponseImplFromJson(json);

  @override
  @JsonKey(name: 'asset-registry')
  final AssetRegistryModule? assetRegistry;
  @override
  @JsonKey(name: 'common-masters')
  final CommonMastersModule? commonMasters;
  @override
  @JsonKey(name: 'livelihood')
  final LivelihoodModule? livelihood;
  @override
  @JsonKey(name: 'Installation')
  final InstallationModule? installation;

  @override
  String toString() {
    return 'AssetRegistryMdmsResponse(assetRegistry: $assetRegistry, commonMasters: $commonMasters, livelihood: $livelihood, installation: $installation)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AssetRegistryMdmsResponseImpl &&
            (identical(other.assetRegistry, assetRegistry) ||
                other.assetRegistry == assetRegistry) &&
            (identical(other.commonMasters, commonMasters) ||
                other.commonMasters == commonMasters) &&
            (identical(other.livelihood, livelihood) ||
                other.livelihood == livelihood) &&
            (identical(other.installation, installation) ||
                other.installation == installation));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType, assetRegistry, commonMasters, livelihood, installation);

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
      @JsonKey(name: 'common-masters') final CommonMastersModule? commonMasters,
      @JsonKey(name: 'livelihood') final LivelihoodModule? livelihood,
      @JsonKey(name: 'Installation')
      final InstallationModule?
          installation}) = _$AssetRegistryMdmsResponseImpl;

  factory _AssetRegistryMdmsResponse.fromJson(Map<String, dynamic> json) =
      _$AssetRegistryMdmsResponseImpl.fromJson;

  @override
  @JsonKey(name: 'asset-registry')
  AssetRegistryModule? get assetRegistry;
  @override
  @JsonKey(name: 'common-masters')
  CommonMastersModule? get commonMasters;
  @override
  @JsonKey(name: 'livelihood')
  LivelihoodModule? get livelihood;
  @override
  @JsonKey(name: 'Installation')
  InstallationModule? get installation;
  @override
  @JsonKey(ignore: true)
  _$$AssetRegistryMdmsResponseImplCopyWith<_$AssetRegistryMdmsResponseImpl>
      get copyWith => throw _privateConstructorUsedError;
}

CommonMastersModule _$CommonMastersModuleFromJson(Map<String, dynamic> json) {
  return _CommonMastersModule.fromJson(json);
}

/// @nodoc
mixin _$CommonMastersModule {
  @JsonKey(name: 'InstallationImages')
  List<Map<String, dynamic>> get installationImages =>
      throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $CommonMastersModuleCopyWith<CommonMastersModule> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CommonMastersModuleCopyWith<$Res> {
  factory $CommonMastersModuleCopyWith(
          CommonMastersModule value, $Res Function(CommonMastersModule) then) =
      _$CommonMastersModuleCopyWithImpl<$Res, CommonMastersModule>;
  @useResult
  $Res call(
      {@JsonKey(name: 'InstallationImages')
      List<Map<String, dynamic>> installationImages});
}

/// @nodoc
class _$CommonMastersModuleCopyWithImpl<$Res, $Val extends CommonMastersModule>
    implements $CommonMastersModuleCopyWith<$Res> {
  _$CommonMastersModuleCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? installationImages = null,
  }) {
    return _then(_value.copyWith(
      installationImages: null == installationImages
          ? _value.installationImages
          : installationImages // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CommonMastersModuleImplCopyWith<$Res>
    implements $CommonMastersModuleCopyWith<$Res> {
  factory _$$CommonMastersModuleImplCopyWith(_$CommonMastersModuleImpl value,
          $Res Function(_$CommonMastersModuleImpl) then) =
      __$$CommonMastersModuleImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {@JsonKey(name: 'InstallationImages')
      List<Map<String, dynamic>> installationImages});
}

/// @nodoc
class __$$CommonMastersModuleImplCopyWithImpl<$Res>
    extends _$CommonMastersModuleCopyWithImpl<$Res, _$CommonMastersModuleImpl>
    implements _$$CommonMastersModuleImplCopyWith<$Res> {
  __$$CommonMastersModuleImplCopyWithImpl(_$CommonMastersModuleImpl _value,
      $Res Function(_$CommonMastersModuleImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? installationImages = null,
  }) {
    return _then(_$CommonMastersModuleImpl(
      installationImages: null == installationImages
          ? _value._installationImages
          : installationImages // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CommonMastersModuleImpl implements _CommonMastersModule {
  const _$CommonMastersModuleImpl(
      {@JsonKey(name: 'InstallationImages')
      final List<Map<String, dynamic>> installationImages = const []})
      : _installationImages = installationImages;

  factory _$CommonMastersModuleImpl.fromJson(Map<String, dynamic> json) =>
      _$$CommonMastersModuleImplFromJson(json);

  final List<Map<String, dynamic>> _installationImages;
  @override
  @JsonKey(name: 'InstallationImages')
  List<Map<String, dynamic>> get installationImages {
    if (_installationImages is EqualUnmodifiableListView)
      return _installationImages;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_installationImages);
  }

  @override
  String toString() {
    return 'CommonMastersModule(installationImages: $installationImages)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CommonMastersModuleImpl &&
            const DeepCollectionEquality()
                .equals(other._installationImages, _installationImages));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType, const DeepCollectionEquality().hash(_installationImages));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$CommonMastersModuleImplCopyWith<_$CommonMastersModuleImpl> get copyWith =>
      __$$CommonMastersModuleImplCopyWithImpl<_$CommonMastersModuleImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CommonMastersModuleImplToJson(
      this,
    );
  }
}

abstract class _CommonMastersModule implements CommonMastersModule {
  const factory _CommonMastersModule(
          {@JsonKey(name: 'InstallationImages')
          final List<Map<String, dynamic>> installationImages}) =
      _$CommonMastersModuleImpl;

  factory _CommonMastersModule.fromJson(Map<String, dynamic> json) =
      _$CommonMastersModuleImpl.fromJson;

  @override
  @JsonKey(name: 'InstallationImages')
  List<Map<String, dynamic>> get installationImages;
  @override
  @JsonKey(ignore: true)
  _$$CommonMastersModuleImplCopyWith<_$CommonMastersModuleImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AssetRegistryModule _$AssetRegistryModuleFromJson(Map<String, dynamic> json) {
  return _AssetRegistryModule.fromJson(json);
}

/// @nodoc
mixin _$AssetRegistryModule {
  @JsonKey(name: 'AssetTypeSchema')
  List<AssetTypeData> get assetTypeSchema => throw _privateConstructorUsedError;
  @JsonKey(name: 'WarrantyDurationSchema')
  List<WarrantyData> get warrantyDurationSchema =>
      throw _privateConstructorUsedError;

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
      {@JsonKey(name: 'AssetTypeSchema') List<AssetTypeData> assetTypeSchema,
      @JsonKey(name: 'WarrantyDurationSchema')
      List<WarrantyData> warrantyDurationSchema});
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
    Object? assetTypeSchema = null,
    Object? warrantyDurationSchema = null,
  }) {
    return _then(_value.copyWith(
      assetTypeSchema: null == assetTypeSchema
          ? _value.assetTypeSchema
          : assetTypeSchema // ignore: cast_nullable_to_non_nullable
              as List<AssetTypeData>,
      warrantyDurationSchema: null == warrantyDurationSchema
          ? _value.warrantyDurationSchema
          : warrantyDurationSchema // ignore: cast_nullable_to_non_nullable
              as List<WarrantyData>,
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
      {@JsonKey(name: 'AssetTypeSchema') List<AssetTypeData> assetTypeSchema,
      @JsonKey(name: 'WarrantyDurationSchema')
      List<WarrantyData> warrantyDurationSchema});
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
    Object? assetTypeSchema = null,
    Object? warrantyDurationSchema = null,
  }) {
    return _then(_$AssetRegistryModuleImpl(
      assetTypeSchema: null == assetTypeSchema
          ? _value._assetTypeSchema
          : assetTypeSchema // ignore: cast_nullable_to_non_nullable
              as List<AssetTypeData>,
      warrantyDurationSchema: null == warrantyDurationSchema
          ? _value._warrantyDurationSchema
          : warrantyDurationSchema // ignore: cast_nullable_to_non_nullable
              as List<WarrantyData>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AssetRegistryModuleImpl implements _AssetRegistryModule {
  const _$AssetRegistryModuleImpl(
      {@JsonKey(name: 'AssetTypeSchema')
      final List<AssetTypeData> assetTypeSchema = const [],
      @JsonKey(name: 'WarrantyDurationSchema')
      final List<WarrantyData> warrantyDurationSchema = const []})
      : _assetTypeSchema = assetTypeSchema,
        _warrantyDurationSchema = warrantyDurationSchema;

  factory _$AssetRegistryModuleImpl.fromJson(Map<String, dynamic> json) =>
      _$$AssetRegistryModuleImplFromJson(json);

  final List<AssetTypeData> _assetTypeSchema;
  @override
  @JsonKey(name: 'AssetTypeSchema')
  List<AssetTypeData> get assetTypeSchema {
    if (_assetTypeSchema is EqualUnmodifiableListView) return _assetTypeSchema;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_assetTypeSchema);
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

  @override
  String toString() {
    return 'AssetRegistryModule(assetTypeSchema: $assetTypeSchema, warrantyDurationSchema: $warrantyDurationSchema)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AssetRegistryModuleImpl &&
            const DeepCollectionEquality()
                .equals(other._assetTypeSchema, _assetTypeSchema) &&
            const DeepCollectionEquality().equals(
                other._warrantyDurationSchema, _warrantyDurationSchema));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_assetTypeSchema),
      const DeepCollectionEquality().hash(_warrantyDurationSchema));

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
          {@JsonKey(name: 'AssetTypeSchema')
          final List<AssetTypeData> assetTypeSchema,
          @JsonKey(name: 'WarrantyDurationSchema')
          final List<WarrantyData> warrantyDurationSchema}) =
      _$AssetRegistryModuleImpl;

  factory _AssetRegistryModule.fromJson(Map<String, dynamic> json) =
      _$AssetRegistryModuleImpl.fromJson;

  @override
  @JsonKey(name: 'AssetTypeSchema')
  List<AssetTypeData> get assetTypeSchema;
  @override
  @JsonKey(name: 'WarrantyDurationSchema')
  List<WarrantyData> get warrantyDurationSchema;
  @override
  @JsonKey(ignore: true)
  _$$AssetRegistryModuleImplCopyWith<_$AssetRegistryModuleImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

LivelihoodModule _$LivelihoodModuleFromJson(Map<String, dynamic> json) {
  return _LivelihoodModule.fromJson(json);
}

/// @nodoc
mixin _$LivelihoodModule {
  @JsonKey(name: 'ItemCode')
  List<ItemCode> get itemCode => throw _privateConstructorUsedError;
  @JsonKey(name: 'BOMFormSchema')
  List<Map<String, dynamic>> get bomFormSchema =>
      throw _privateConstructorUsedError;
  @JsonKey(name: 'SolutionBOMForms')
  List<Map<String, dynamic>> get solutionBomForms =>
      throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $LivelihoodModuleCopyWith<LivelihoodModule> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LivelihoodModuleCopyWith<$Res> {
  factory $LivelihoodModuleCopyWith(
          LivelihoodModule value, $Res Function(LivelihoodModule) then) =
      _$LivelihoodModuleCopyWithImpl<$Res, LivelihoodModule>;
  @useResult
  $Res call(
      {@JsonKey(name: 'ItemCode') List<ItemCode> itemCode,
      @JsonKey(name: 'BOMFormSchema') List<Map<String, dynamic>> bomFormSchema,
      @JsonKey(name: 'SolutionBOMForms')
      List<Map<String, dynamic>> solutionBomForms});
}

/// @nodoc
class _$LivelihoodModuleCopyWithImpl<$Res, $Val extends LivelihoodModule>
    implements $LivelihoodModuleCopyWith<$Res> {
  _$LivelihoodModuleCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? itemCode = null,
    Object? bomFormSchema = null,
    Object? solutionBomForms = null,
  }) {
    return _then(_value.copyWith(
      itemCode: null == itemCode
          ? _value.itemCode
          : itemCode // ignore: cast_nullable_to_non_nullable
              as List<ItemCode>,
      bomFormSchema: null == bomFormSchema
          ? _value.bomFormSchema
          : bomFormSchema // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
      solutionBomForms: null == solutionBomForms
          ? _value.solutionBomForms
          : solutionBomForms // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$LivelihoodModuleImplCopyWith<$Res>
    implements $LivelihoodModuleCopyWith<$Res> {
  factory _$$LivelihoodModuleImplCopyWith(_$LivelihoodModuleImpl value,
          $Res Function(_$LivelihoodModuleImpl) then) =
      __$$LivelihoodModuleImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {@JsonKey(name: 'ItemCode') List<ItemCode> itemCode,
      @JsonKey(name: 'BOMFormSchema') List<Map<String, dynamic>> bomFormSchema,
      @JsonKey(name: 'SolutionBOMForms')
      List<Map<String, dynamic>> solutionBomForms});
}

/// @nodoc
class __$$LivelihoodModuleImplCopyWithImpl<$Res>
    extends _$LivelihoodModuleCopyWithImpl<$Res, _$LivelihoodModuleImpl>
    implements _$$LivelihoodModuleImplCopyWith<$Res> {
  __$$LivelihoodModuleImplCopyWithImpl(_$LivelihoodModuleImpl _value,
      $Res Function(_$LivelihoodModuleImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? itemCode = null,
    Object? bomFormSchema = null,
    Object? solutionBomForms = null,
  }) {
    return _then(_$LivelihoodModuleImpl(
      itemCode: null == itemCode
          ? _value._itemCode
          : itemCode // ignore: cast_nullable_to_non_nullable
              as List<ItemCode>,
      bomFormSchema: null == bomFormSchema
          ? _value._bomFormSchema
          : bomFormSchema // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
      solutionBomForms: null == solutionBomForms
          ? _value._solutionBomForms
          : solutionBomForms // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$LivelihoodModuleImpl implements _LivelihoodModule {
  const _$LivelihoodModuleImpl(
      {@JsonKey(name: 'ItemCode') final List<ItemCode> itemCode = const [],
      @JsonKey(name: 'BOMFormSchema')
      final List<Map<String, dynamic>> bomFormSchema = const [],
      @JsonKey(name: 'SolutionBOMForms')
      final List<Map<String, dynamic>> solutionBomForms = const []})
      : _itemCode = itemCode,
        _bomFormSchema = bomFormSchema,
        _solutionBomForms = solutionBomForms;

  factory _$LivelihoodModuleImpl.fromJson(Map<String, dynamic> json) =>
      _$$LivelihoodModuleImplFromJson(json);

  final List<ItemCode> _itemCode;
  @override
  @JsonKey(name: 'ItemCode')
  List<ItemCode> get itemCode {
    if (_itemCode is EqualUnmodifiableListView) return _itemCode;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_itemCode);
  }

  final List<Map<String, dynamic>> _bomFormSchema;
  @override
  @JsonKey(name: 'BOMFormSchema')
  List<Map<String, dynamic>> get bomFormSchema {
    if (_bomFormSchema is EqualUnmodifiableListView) return _bomFormSchema;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_bomFormSchema);
  }

  final List<Map<String, dynamic>> _solutionBomForms;
  @override
  @JsonKey(name: 'SolutionBOMForms')
  List<Map<String, dynamic>> get solutionBomForms {
    if (_solutionBomForms is EqualUnmodifiableListView)
      return _solutionBomForms;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_solutionBomForms);
  }

  @override
  String toString() {
    return 'LivelihoodModule(itemCode: $itemCode, bomFormSchema: $bomFormSchema, solutionBomForms: $solutionBomForms)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LivelihoodModuleImpl &&
            const DeepCollectionEquality().equals(other._itemCode, _itemCode) &&
            const DeepCollectionEquality()
                .equals(other._bomFormSchema, _bomFormSchema) &&
            const DeepCollectionEquality()
                .equals(other._solutionBomForms, _solutionBomForms));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_itemCode),
      const DeepCollectionEquality().hash(_bomFormSchema),
      const DeepCollectionEquality().hash(_solutionBomForms));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$LivelihoodModuleImplCopyWith<_$LivelihoodModuleImpl> get copyWith =>
      __$$LivelihoodModuleImplCopyWithImpl<_$LivelihoodModuleImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$LivelihoodModuleImplToJson(
      this,
    );
  }
}

abstract class _LivelihoodModule implements LivelihoodModule {
  const factory _LivelihoodModule(
          {@JsonKey(name: 'ItemCode') final List<ItemCode> itemCode,
          @JsonKey(name: 'BOMFormSchema')
          final List<Map<String, dynamic>> bomFormSchema,
          @JsonKey(name: 'SolutionBOMForms')
          final List<Map<String, dynamic>> solutionBomForms}) =
      _$LivelihoodModuleImpl;

  factory _LivelihoodModule.fromJson(Map<String, dynamic> json) =
      _$LivelihoodModuleImpl.fromJson;

  @override
  @JsonKey(name: 'ItemCode')
  List<ItemCode> get itemCode;
  @override
  @JsonKey(name: 'BOMFormSchema')
  List<Map<String, dynamic>> get bomFormSchema;
  @override
  @JsonKey(name: 'SolutionBOMForms')
  List<Map<String, dynamic>> get solutionBomForms;
  @override
  @JsonKey(ignore: true)
  _$$LivelihoodModuleImplCopyWith<_$LivelihoodModuleImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

InstallationModule _$InstallationModuleFromJson(Map<String, dynamic> json) {
  return _InstallationModule.fromJson(json);
}

/// @nodoc
mixin _$InstallationModule {
  @JsonKey(name: 'Solution')
  List<InstallationSolution> get solution => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $InstallationModuleCopyWith<InstallationModule> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $InstallationModuleCopyWith<$Res> {
  factory $InstallationModuleCopyWith(
          InstallationModule value, $Res Function(InstallationModule) then) =
      _$InstallationModuleCopyWithImpl<$Res, InstallationModule>;
  @useResult
  $Res call({@JsonKey(name: 'Solution') List<InstallationSolution> solution});
}

/// @nodoc
class _$InstallationModuleCopyWithImpl<$Res, $Val extends InstallationModule>
    implements $InstallationModuleCopyWith<$Res> {
  _$InstallationModuleCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? solution = null,
  }) {
    return _then(_value.copyWith(
      solution: null == solution
          ? _value.solution
          : solution // ignore: cast_nullable_to_non_nullable
              as List<InstallationSolution>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$InstallationModuleImplCopyWith<$Res>
    implements $InstallationModuleCopyWith<$Res> {
  factory _$$InstallationModuleImplCopyWith(_$InstallationModuleImpl value,
          $Res Function(_$InstallationModuleImpl) then) =
      __$$InstallationModuleImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({@JsonKey(name: 'Solution') List<InstallationSolution> solution});
}

/// @nodoc
class __$$InstallationModuleImplCopyWithImpl<$Res>
    extends _$InstallationModuleCopyWithImpl<$Res, _$InstallationModuleImpl>
    implements _$$InstallationModuleImplCopyWith<$Res> {
  __$$InstallationModuleImplCopyWithImpl(_$InstallationModuleImpl _value,
      $Res Function(_$InstallationModuleImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? solution = null,
  }) {
    return _then(_$InstallationModuleImpl(
      solution: null == solution
          ? _value._solution
          : solution // ignore: cast_nullable_to_non_nullable
              as List<InstallationSolution>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$InstallationModuleImpl implements _InstallationModule {
  const _$InstallationModuleImpl(
      {@JsonKey(name: 'Solution')
      final List<InstallationSolution> solution = const []})
      : _solution = solution;

  factory _$InstallationModuleImpl.fromJson(Map<String, dynamic> json) =>
      _$$InstallationModuleImplFromJson(json);

  final List<InstallationSolution> _solution;
  @override
  @JsonKey(name: 'Solution')
  List<InstallationSolution> get solution {
    if (_solution is EqualUnmodifiableListView) return _solution;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_solution);
  }

  @override
  String toString() {
    return 'InstallationModule(solution: $solution)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$InstallationModuleImpl &&
            const DeepCollectionEquality().equals(other._solution, _solution));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(_solution));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$InstallationModuleImplCopyWith<_$InstallationModuleImpl> get copyWith =>
      __$$InstallationModuleImplCopyWithImpl<_$InstallationModuleImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$InstallationModuleImplToJson(
      this,
    );
  }
}

abstract class _InstallationModule implements InstallationModule {
  const factory _InstallationModule(
      {@JsonKey(name: 'Solution')
      final List<InstallationSolution> solution}) = _$InstallationModuleImpl;

  factory _InstallationModule.fromJson(Map<String, dynamic> json) =
      _$InstallationModuleImpl.fromJson;

  @override
  @JsonKey(name: 'Solution')
  List<InstallationSolution> get solution;
  @override
  @JsonKey(ignore: true)
  _$$InstallationModuleImplCopyWith<_$InstallationModuleImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

InstallationSolution _$InstallationSolutionFromJson(Map<String, dynamic> json) {
  return _InstallationSolution.fromJson(json);
}

/// @nodoc
mixin _$InstallationSolution {
  String get code => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String? get sectorName => throw _privateConstructorUsedError;
  num? get sunshineHrsMin => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $InstallationSolutionCopyWith<InstallationSolution> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $InstallationSolutionCopyWith<$Res> {
  factory $InstallationSolutionCopyWith(InstallationSolution value,
          $Res Function(InstallationSolution) then) =
      _$InstallationSolutionCopyWithImpl<$Res, InstallationSolution>;
  @useResult
  $Res call(
      {String code, String name, String? sectorName, num? sunshineHrsMin});
}

/// @nodoc
class _$InstallationSolutionCopyWithImpl<$Res,
        $Val extends InstallationSolution>
    implements $InstallationSolutionCopyWith<$Res> {
  _$InstallationSolutionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? code = null,
    Object? name = null,
    Object? sectorName = freezed,
    Object? sunshineHrsMin = freezed,
  }) {
    return _then(_value.copyWith(
      code: null == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      sectorName: freezed == sectorName
          ? _value.sectorName
          : sectorName // ignore: cast_nullable_to_non_nullable
              as String?,
      sunshineHrsMin: freezed == sunshineHrsMin
          ? _value.sunshineHrsMin
          : sunshineHrsMin // ignore: cast_nullable_to_non_nullable
              as num?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$InstallationSolutionImplCopyWith<$Res>
    implements $InstallationSolutionCopyWith<$Res> {
  factory _$$InstallationSolutionImplCopyWith(_$InstallationSolutionImpl value,
          $Res Function(_$InstallationSolutionImpl) then) =
      __$$InstallationSolutionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String code, String name, String? sectorName, num? sunshineHrsMin});
}

/// @nodoc
class __$$InstallationSolutionImplCopyWithImpl<$Res>
    extends _$InstallationSolutionCopyWithImpl<$Res, _$InstallationSolutionImpl>
    implements _$$InstallationSolutionImplCopyWith<$Res> {
  __$$InstallationSolutionImplCopyWithImpl(_$InstallationSolutionImpl _value,
      $Res Function(_$InstallationSolutionImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? code = null,
    Object? name = null,
    Object? sectorName = freezed,
    Object? sunshineHrsMin = freezed,
  }) {
    return _then(_$InstallationSolutionImpl(
      code: null == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      sectorName: freezed == sectorName
          ? _value.sectorName
          : sectorName // ignore: cast_nullable_to_non_nullable
              as String?,
      sunshineHrsMin: freezed == sunshineHrsMin
          ? _value.sunshineHrsMin
          : sunshineHrsMin // ignore: cast_nullable_to_non_nullable
              as num?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$InstallationSolutionImpl implements _InstallationSolution {
  const _$InstallationSolutionImpl(
      {required this.code,
      required this.name,
      this.sectorName,
      this.sunshineHrsMin});

  factory _$InstallationSolutionImpl.fromJson(Map<String, dynamic> json) =>
      _$$InstallationSolutionImplFromJson(json);

  @override
  final String code;
  @override
  final String name;
  @override
  final String? sectorName;
  @override
  final num? sunshineHrsMin;

  @override
  String toString() {
    return 'InstallationSolution(code: $code, name: $name, sectorName: $sectorName, sunshineHrsMin: $sunshineHrsMin)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$InstallationSolutionImpl &&
            (identical(other.code, code) || other.code == code) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.sectorName, sectorName) ||
                other.sectorName == sectorName) &&
            (identical(other.sunshineHrsMin, sunshineHrsMin) ||
                other.sunshineHrsMin == sunshineHrsMin));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, code, name, sectorName, sunshineHrsMin);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$InstallationSolutionImplCopyWith<_$InstallationSolutionImpl>
      get copyWith =>
          __$$InstallationSolutionImplCopyWithImpl<_$InstallationSolutionImpl>(
              this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$InstallationSolutionImplToJson(
      this,
    );
  }
}

abstract class _InstallationSolution implements InstallationSolution {
  const factory _InstallationSolution(
      {required final String code,
      required final String name,
      final String? sectorName,
      final num? sunshineHrsMin}) = _$InstallationSolutionImpl;

  factory _InstallationSolution.fromJson(Map<String, dynamic> json) =
      _$InstallationSolutionImpl.fromJson;

  @override
  String get code;
  @override
  String get name;
  @override
  String? get sectorName;
  @override
  num? get sunshineHrsMin;
  @override
  @JsonKey(ignore: true)
  _$$InstallationSolutionImplCopyWith<_$InstallationSolutionImpl>
      get copyWith => throw _privateConstructorUsedError;
}
