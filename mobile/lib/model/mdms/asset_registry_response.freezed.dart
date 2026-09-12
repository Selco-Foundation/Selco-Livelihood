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
  @JsonKey(name: 'common-masters')
  CommonMastersModule? get commonMasters => throw _privateConstructorUsedError;
  @JsonKey(name: 'livelihood')
  LivelihoodModule? get livelihood => throw _privateConstructorUsedError;

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
      @JsonKey(name: 'facility') FacilityModule? facility,
      @JsonKey(name: 'common-masters') CommonMastersModule? commonMasters,
      @JsonKey(name: 'livelihood') LivelihoodModule? livelihood});

  $AssetRegistryModuleCopyWith<$Res>? get assetRegistry;
  $FacilityModuleCopyWith<$Res>? get facility;
  $CommonMastersModuleCopyWith<$Res>? get commonMasters;
  $LivelihoodModuleCopyWith<$Res>? get livelihood;
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
    Object? commonMasters = freezed,
    Object? livelihood = freezed,
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
      commonMasters: freezed == commonMasters
          ? _value.commonMasters
          : commonMasters // ignore: cast_nullable_to_non_nullable
              as CommonMastersModule?,
      livelihood: freezed == livelihood
          ? _value.livelihood
          : livelihood // ignore: cast_nullable_to_non_nullable
              as LivelihoodModule?,
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
      @JsonKey(name: 'facility') FacilityModule? facility,
      @JsonKey(name: 'common-masters') CommonMastersModule? commonMasters,
      @JsonKey(name: 'livelihood') LivelihoodModule? livelihood});

  @override
  $AssetRegistryModuleCopyWith<$Res>? get assetRegistry;
  @override
  $FacilityModuleCopyWith<$Res>? get facility;
  @override
  $CommonMastersModuleCopyWith<$Res>? get commonMasters;
  @override
  $LivelihoodModuleCopyWith<$Res>? get livelihood;
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
    Object? commonMasters = freezed,
    Object? livelihood = freezed,
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
      commonMasters: freezed == commonMasters
          ? _value.commonMasters
          : commonMasters // ignore: cast_nullable_to_non_nullable
              as CommonMastersModule?,
      livelihood: freezed == livelihood
          ? _value.livelihood
          : livelihood // ignore: cast_nullable_to_non_nullable
              as LivelihoodModule?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AssetRegistryMdmsResponseImpl implements _AssetRegistryMdmsResponse {
  const _$AssetRegistryMdmsResponseImpl(
      {@JsonKey(name: 'asset-registry') this.assetRegistry,
      @JsonKey(name: 'facility') this.facility,
      @JsonKey(name: 'common-masters') this.commonMasters,
      @JsonKey(name: 'livelihood') this.livelihood});

  factory _$AssetRegistryMdmsResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$AssetRegistryMdmsResponseImplFromJson(json);

  @override
  @JsonKey(name: 'asset-registry')
  final AssetRegistryModule? assetRegistry;
  @override
  @JsonKey(name: 'facility')
  final FacilityModule? facility;
  @override
  @JsonKey(name: 'common-masters')
  final CommonMastersModule? commonMasters;
  @override
  @JsonKey(name: 'livelihood')
  final LivelihoodModule? livelihood;

  @override
  String toString() {
    return 'AssetRegistryMdmsResponse(assetRegistry: $assetRegistry, facility: $facility, commonMasters: $commonMasters, livelihood: $livelihood)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AssetRegistryMdmsResponseImpl &&
            (identical(other.assetRegistry, assetRegistry) ||
                other.assetRegistry == assetRegistry) &&
            (identical(other.facility, facility) ||
                other.facility == facility) &&
            (identical(other.commonMasters, commonMasters) ||
                other.commonMasters == commonMasters) &&
            (identical(other.livelihood, livelihood) ||
                other.livelihood == livelihood));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType, assetRegistry, facility, commonMasters, livelihood);

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
      @JsonKey(name: 'facility') final FacilityModule? facility,
      @JsonKey(name: 'common-masters') final CommonMastersModule? commonMasters,
      @JsonKey(name: 'livelihood')
      final LivelihoodModule? livelihood}) = _$AssetRegistryMdmsResponseImpl;

  factory _AssetRegistryMdmsResponse.fromJson(Map<String, dynamic> json) =
      _$AssetRegistryMdmsResponseImpl.fromJson;

  @override
  @JsonKey(name: 'asset-registry')
  AssetRegistryModule? get assetRegistry;
  @override
  @JsonKey(name: 'facility')
  FacilityModule? get facility;
  @override
  @JsonKey(name: 'common-masters')
  CommonMastersModule? get commonMasters;
  @override
  @JsonKey(name: 'livelihood')
  LivelihoodModule? get livelihood;
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
  @JsonKey(name: 'BOMFormSchema')
  List<Map<String, dynamic>> get bomFormSchema =>
      throw _privateConstructorUsedError;
  @JsonKey(name: 'SolutionDesignTypeBOMForms')
  List<Map<String, dynamic>> get solutionDesignTypeBomForms =>
      throw _privateConstructorUsedError;
  @JsonKey(name: 'InstallationImages')
  List<Map<String, dynamic>> get installationImages =>
      throw _privateConstructorUsedError;
  @JsonKey(name: 'RequiredBomFormKeys')
  List<Map<String, dynamic>> get requiredBomFormKeys =>
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
      {@JsonKey(name: 'BOMFormSchema') List<Map<String, dynamic>> bomFormSchema,
      @JsonKey(name: 'SolutionDesignTypeBOMForms')
      List<Map<String, dynamic>> solutionDesignTypeBomForms,
      @JsonKey(name: 'InstallationImages')
      List<Map<String, dynamic>> installationImages,
      @JsonKey(name: 'RequiredBomFormKeys')
      List<Map<String, dynamic>> requiredBomFormKeys});
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
    Object? bomFormSchema = null,
    Object? solutionDesignTypeBomForms = null,
    Object? installationImages = null,
    Object? requiredBomFormKeys = null,
  }) {
    return _then(_value.copyWith(
      bomFormSchema: null == bomFormSchema
          ? _value.bomFormSchema
          : bomFormSchema // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
      solutionDesignTypeBomForms: null == solutionDesignTypeBomForms
          ? _value.solutionDesignTypeBomForms
          : solutionDesignTypeBomForms // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
      installationImages: null == installationImages
          ? _value.installationImages
          : installationImages // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
      requiredBomFormKeys: null == requiredBomFormKeys
          ? _value.requiredBomFormKeys
          : requiredBomFormKeys // ignore: cast_nullable_to_non_nullable
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
      {@JsonKey(name: 'BOMFormSchema') List<Map<String, dynamic>> bomFormSchema,
      @JsonKey(name: 'SolutionDesignTypeBOMForms')
      List<Map<String, dynamic>> solutionDesignTypeBomForms,
      @JsonKey(name: 'InstallationImages')
      List<Map<String, dynamic>> installationImages,
      @JsonKey(name: 'RequiredBomFormKeys')
      List<Map<String, dynamic>> requiredBomFormKeys});
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
    Object? bomFormSchema = null,
    Object? solutionDesignTypeBomForms = null,
    Object? installationImages = null,
    Object? requiredBomFormKeys = null,
  }) {
    return _then(_$CommonMastersModuleImpl(
      bomFormSchema: null == bomFormSchema
          ? _value._bomFormSchema
          : bomFormSchema // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
      solutionDesignTypeBomForms: null == solutionDesignTypeBomForms
          ? _value._solutionDesignTypeBomForms
          : solutionDesignTypeBomForms // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
      installationImages: null == installationImages
          ? _value._installationImages
          : installationImages // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
      requiredBomFormKeys: null == requiredBomFormKeys
          ? _value._requiredBomFormKeys
          : requiredBomFormKeys // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CommonMastersModuleImpl implements _CommonMastersModule {
  const _$CommonMastersModuleImpl(
      {@JsonKey(name: 'BOMFormSchema')
      final List<Map<String, dynamic>> bomFormSchema = const [],
      @JsonKey(name: 'SolutionDesignTypeBOMForms')
      final List<Map<String, dynamic>> solutionDesignTypeBomForms = const [],
      @JsonKey(name: 'InstallationImages')
      final List<Map<String, dynamic>> installationImages = const [],
      @JsonKey(name: 'RequiredBomFormKeys')
      final List<Map<String, dynamic>> requiredBomFormKeys = const []})
      : _bomFormSchema = bomFormSchema,
        _solutionDesignTypeBomForms = solutionDesignTypeBomForms,
        _installationImages = installationImages,
        _requiredBomFormKeys = requiredBomFormKeys;

  factory _$CommonMastersModuleImpl.fromJson(Map<String, dynamic> json) =>
      _$$CommonMastersModuleImplFromJson(json);

  final List<Map<String, dynamic>> _bomFormSchema;
  @override
  @JsonKey(name: 'BOMFormSchema')
  List<Map<String, dynamic>> get bomFormSchema {
    if (_bomFormSchema is EqualUnmodifiableListView) return _bomFormSchema;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_bomFormSchema);
  }

  final List<Map<String, dynamic>> _solutionDesignTypeBomForms;
  @override
  @JsonKey(name: 'SolutionDesignTypeBOMForms')
  List<Map<String, dynamic>> get solutionDesignTypeBomForms {
    if (_solutionDesignTypeBomForms is EqualUnmodifiableListView)
      return _solutionDesignTypeBomForms;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_solutionDesignTypeBomForms);
  }

  final List<Map<String, dynamic>> _installationImages;
  @override
  @JsonKey(name: 'InstallationImages')
  List<Map<String, dynamic>> get installationImages {
    if (_installationImages is EqualUnmodifiableListView)
      return _installationImages;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_installationImages);
  }

  final List<Map<String, dynamic>> _requiredBomFormKeys;
  @override
  @JsonKey(name: 'RequiredBomFormKeys')
  List<Map<String, dynamic>> get requiredBomFormKeys {
    if (_requiredBomFormKeys is EqualUnmodifiableListView)
      return _requiredBomFormKeys;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_requiredBomFormKeys);
  }

  @override
  String toString() {
    return 'CommonMastersModule(bomFormSchema: $bomFormSchema, solutionDesignTypeBomForms: $solutionDesignTypeBomForms, installationImages: $installationImages, requiredBomFormKeys: $requiredBomFormKeys)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CommonMastersModuleImpl &&
            const DeepCollectionEquality()
                .equals(other._bomFormSchema, _bomFormSchema) &&
            const DeepCollectionEquality().equals(
                other._solutionDesignTypeBomForms,
                _solutionDesignTypeBomForms) &&
            const DeepCollectionEquality()
                .equals(other._installationImages, _installationImages) &&
            const DeepCollectionEquality()
                .equals(other._requiredBomFormKeys, _requiredBomFormKeys));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_bomFormSchema),
      const DeepCollectionEquality().hash(_solutionDesignTypeBomForms),
      const DeepCollectionEquality().hash(_installationImages),
      const DeepCollectionEquality().hash(_requiredBomFormKeys));

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
          {@JsonKey(name: 'BOMFormSchema')
          final List<Map<String, dynamic>> bomFormSchema,
          @JsonKey(name: 'SolutionDesignTypeBOMForms')
          final List<Map<String, dynamic>> solutionDesignTypeBomForms,
          @JsonKey(name: 'InstallationImages')
          final List<Map<String, dynamic>> installationImages,
          @JsonKey(name: 'RequiredBomFormKeys')
          final List<Map<String, dynamic>> requiredBomFormKeys}) =
      _$CommonMastersModuleImpl;

  factory _CommonMastersModule.fromJson(Map<String, dynamic> json) =
      _$CommonMastersModuleImpl.fromJson;

  @override
  @JsonKey(name: 'BOMFormSchema')
  List<Map<String, dynamic>> get bomFormSchema;
  @override
  @JsonKey(name: 'SolutionDesignTypeBOMForms')
  List<Map<String, dynamic>> get solutionDesignTypeBomForms;
  @override
  @JsonKey(name: 'InstallationImages')
  List<Map<String, dynamic>> get installationImages;
  @override
  @JsonKey(name: 'RequiredBomFormKeys')
  List<Map<String, dynamic>> get requiredBomFormKeys;
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

LivelihoodModule _$LivelihoodModuleFromJson(Map<String, dynamic> json) {
  return _LivelihoodModule.fromJson(json);
}

/// @nodoc
mixin _$LivelihoodModule {
  @JsonKey(name: 'ItemCode')
  List<ItemCode> get itemCode => throw _privateConstructorUsedError;

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
  $Res call({@JsonKey(name: 'ItemCode') List<ItemCode> itemCode});
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
  }) {
    return _then(_value.copyWith(
      itemCode: null == itemCode
          ? _value.itemCode
          : itemCode // ignore: cast_nullable_to_non_nullable
              as List<ItemCode>,
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
  $Res call({@JsonKey(name: 'ItemCode') List<ItemCode> itemCode});
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
  }) {
    return _then(_$LivelihoodModuleImpl(
      itemCode: null == itemCode
          ? _value._itemCode
          : itemCode // ignore: cast_nullable_to_non_nullable
              as List<ItemCode>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$LivelihoodModuleImpl implements _LivelihoodModule {
  const _$LivelihoodModuleImpl(
      {@JsonKey(name: 'ItemCode') final List<ItemCode> itemCode = const []})
      : _itemCode = itemCode;

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

  @override
  String toString() {
    return 'LivelihoodModule(itemCode: $itemCode)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LivelihoodModuleImpl &&
            const DeepCollectionEquality().equals(other._itemCode, _itemCode));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(_itemCode));

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
          {@JsonKey(name: 'ItemCode') final List<ItemCode> itemCode}) =
      _$LivelihoodModuleImpl;

  factory _LivelihoodModule.fromJson(Map<String, dynamic> json) =
      _$LivelihoodModuleImpl.fromJson;

  @override
  @JsonKey(name: 'ItemCode')
  List<ItemCode> get itemCode;
  @override
  @JsonKey(ignore: true)
  _$$LivelihoodModuleImplCopyWith<_$LivelihoodModuleImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
