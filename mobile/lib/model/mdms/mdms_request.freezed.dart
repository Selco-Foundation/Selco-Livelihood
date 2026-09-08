// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'mdms_request.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

MdmsRequestModel _$MdmsRequestModelFromJson(Map<String, dynamic> json) {
  return _MdmsRequestModel.fromJson(json);
}

/// @nodoc
mixin _$MdmsRequestModel {
  @JsonKey(name: 'MdmsCriteria')
  MdmsCriteriaModel get mdmsCriteria => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $MdmsRequestModelCopyWith<MdmsRequestModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $MdmsRequestModelCopyWith<$Res> {
  factory $MdmsRequestModelCopyWith(
          MdmsRequestModel value, $Res Function(MdmsRequestModel) then) =
      _$MdmsRequestModelCopyWithImpl<$Res, MdmsRequestModel>;
  @useResult
  $Res call({@JsonKey(name: 'MdmsCriteria') MdmsCriteriaModel mdmsCriteria});

  $MdmsCriteriaModelCopyWith<$Res> get mdmsCriteria;
}

/// @nodoc
class _$MdmsRequestModelCopyWithImpl<$Res, $Val extends MdmsRequestModel>
    implements $MdmsRequestModelCopyWith<$Res> {
  _$MdmsRequestModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? mdmsCriteria = null,
  }) {
    return _then(_value.copyWith(
      mdmsCriteria: null == mdmsCriteria
          ? _value.mdmsCriteria
          : mdmsCriteria // ignore: cast_nullable_to_non_nullable
              as MdmsCriteriaModel,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $MdmsCriteriaModelCopyWith<$Res> get mdmsCriteria {
    return $MdmsCriteriaModelCopyWith<$Res>(_value.mdmsCriteria, (value) {
      return _then(_value.copyWith(mdmsCriteria: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$MdmsRequestModelImplCopyWith<$Res>
    implements $MdmsRequestModelCopyWith<$Res> {
  factory _$$MdmsRequestModelImplCopyWith(_$MdmsRequestModelImpl value,
          $Res Function(_$MdmsRequestModelImpl) then) =
      __$$MdmsRequestModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({@JsonKey(name: 'MdmsCriteria') MdmsCriteriaModel mdmsCriteria});

  @override
  $MdmsCriteriaModelCopyWith<$Res> get mdmsCriteria;
}

/// @nodoc
class __$$MdmsRequestModelImplCopyWithImpl<$Res>
    extends _$MdmsRequestModelCopyWithImpl<$Res, _$MdmsRequestModelImpl>
    implements _$$MdmsRequestModelImplCopyWith<$Res> {
  __$$MdmsRequestModelImplCopyWithImpl(_$MdmsRequestModelImpl _value,
      $Res Function(_$MdmsRequestModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? mdmsCriteria = null,
  }) {
    return _then(_$MdmsRequestModelImpl(
      mdmsCriteria: null == mdmsCriteria
          ? _value.mdmsCriteria
          : mdmsCriteria // ignore: cast_nullable_to_non_nullable
              as MdmsCriteriaModel,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$MdmsRequestModelImpl implements _MdmsRequestModel {
  const _$MdmsRequestModelImpl(
      {@JsonKey(name: 'MdmsCriteria') required this.mdmsCriteria});

  factory _$MdmsRequestModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$MdmsRequestModelImplFromJson(json);

  @override
  @JsonKey(name: 'MdmsCriteria')
  final MdmsCriteriaModel mdmsCriteria;

  @override
  String toString() {
    return 'MdmsRequestModel(mdmsCriteria: $mdmsCriteria)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MdmsRequestModelImpl &&
            (identical(other.mdmsCriteria, mdmsCriteria) ||
                other.mdmsCriteria == mdmsCriteria));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, mdmsCriteria);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$MdmsRequestModelImplCopyWith<_$MdmsRequestModelImpl> get copyWith =>
      __$$MdmsRequestModelImplCopyWithImpl<_$MdmsRequestModelImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$MdmsRequestModelImplToJson(
      this,
    );
  }
}

abstract class _MdmsRequestModel implements MdmsRequestModel {
  const factory _MdmsRequestModel(
      {@JsonKey(name: 'MdmsCriteria')
      required final MdmsCriteriaModel mdmsCriteria}) = _$MdmsRequestModelImpl;

  factory _MdmsRequestModel.fromJson(Map<String, dynamic> json) =
      _$MdmsRequestModelImpl.fromJson;

  @override
  @JsonKey(name: 'MdmsCriteria')
  MdmsCriteriaModel get mdmsCriteria;
  @override
  @JsonKey(ignore: true)
  _$$MdmsRequestModelImplCopyWith<_$MdmsRequestModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

MdmsCriteriaModel _$MdmsCriteriaModelFromJson(Map<String, dynamic> json) {
  return _MdmsCriteriaModel.fromJson(json);
}

/// @nodoc
mixin _$MdmsCriteriaModel {
  String get tenantId => throw _privateConstructorUsedError;
  List<MdmsModuleDetailModel> get moduleDetails =>
      throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $MdmsCriteriaModelCopyWith<MdmsCriteriaModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $MdmsCriteriaModelCopyWith<$Res> {
  factory $MdmsCriteriaModelCopyWith(
          MdmsCriteriaModel value, $Res Function(MdmsCriteriaModel) then) =
      _$MdmsCriteriaModelCopyWithImpl<$Res, MdmsCriteriaModel>;
  @useResult
  $Res call({String tenantId, List<MdmsModuleDetailModel> moduleDetails});
}

/// @nodoc
class _$MdmsCriteriaModelCopyWithImpl<$Res, $Val extends MdmsCriteriaModel>
    implements $MdmsCriteriaModelCopyWith<$Res> {
  _$MdmsCriteriaModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tenantId = null,
    Object? moduleDetails = null,
  }) {
    return _then(_value.copyWith(
      tenantId: null == tenantId
          ? _value.tenantId
          : tenantId // ignore: cast_nullable_to_non_nullable
              as String,
      moduleDetails: null == moduleDetails
          ? _value.moduleDetails
          : moduleDetails // ignore: cast_nullable_to_non_nullable
              as List<MdmsModuleDetailModel>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$MdmsCriteriaModelImplCopyWith<$Res>
    implements $MdmsCriteriaModelCopyWith<$Res> {
  factory _$$MdmsCriteriaModelImplCopyWith(_$MdmsCriteriaModelImpl value,
          $Res Function(_$MdmsCriteriaModelImpl) then) =
      __$$MdmsCriteriaModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String tenantId, List<MdmsModuleDetailModel> moduleDetails});
}

/// @nodoc
class __$$MdmsCriteriaModelImplCopyWithImpl<$Res>
    extends _$MdmsCriteriaModelCopyWithImpl<$Res, _$MdmsCriteriaModelImpl>
    implements _$$MdmsCriteriaModelImplCopyWith<$Res> {
  __$$MdmsCriteriaModelImplCopyWithImpl(_$MdmsCriteriaModelImpl _value,
      $Res Function(_$MdmsCriteriaModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tenantId = null,
    Object? moduleDetails = null,
  }) {
    return _then(_$MdmsCriteriaModelImpl(
      tenantId: null == tenantId
          ? _value.tenantId
          : tenantId // ignore: cast_nullable_to_non_nullable
              as String,
      moduleDetails: null == moduleDetails
          ? _value._moduleDetails
          : moduleDetails // ignore: cast_nullable_to_non_nullable
              as List<MdmsModuleDetailModel>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$MdmsCriteriaModelImpl implements _MdmsCriteriaModel {
  const _$MdmsCriteriaModelImpl(
      {required this.tenantId,
      required final List<MdmsModuleDetailModel> moduleDetails})
      : _moduleDetails = moduleDetails;

  factory _$MdmsCriteriaModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$MdmsCriteriaModelImplFromJson(json);

  @override
  final String tenantId;
  final List<MdmsModuleDetailModel> _moduleDetails;
  @override
  List<MdmsModuleDetailModel> get moduleDetails {
    if (_moduleDetails is EqualUnmodifiableListView) return _moduleDetails;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_moduleDetails);
  }

  @override
  String toString() {
    return 'MdmsCriteriaModel(tenantId: $tenantId, moduleDetails: $moduleDetails)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MdmsCriteriaModelImpl &&
            (identical(other.tenantId, tenantId) ||
                other.tenantId == tenantId) &&
            const DeepCollectionEquality()
                .equals(other._moduleDetails, _moduleDetails));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, tenantId,
      const DeepCollectionEquality().hash(_moduleDetails));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$MdmsCriteriaModelImplCopyWith<_$MdmsCriteriaModelImpl> get copyWith =>
      __$$MdmsCriteriaModelImplCopyWithImpl<_$MdmsCriteriaModelImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$MdmsCriteriaModelImplToJson(
      this,
    );
  }
}

abstract class _MdmsCriteriaModel implements MdmsCriteriaModel {
  const factory _MdmsCriteriaModel(
          {required final String tenantId,
          required final List<MdmsModuleDetailModel> moduleDetails}) =
      _$MdmsCriteriaModelImpl;

  factory _MdmsCriteriaModel.fromJson(Map<String, dynamic> json) =
      _$MdmsCriteriaModelImpl.fromJson;

  @override
  String get tenantId;
  @override
  List<MdmsModuleDetailModel> get moduleDetails;
  @override
  @JsonKey(ignore: true)
  _$$MdmsCriteriaModelImplCopyWith<_$MdmsCriteriaModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

MdmsModuleDetailModel _$MdmsModuleDetailModelFromJson(
    Map<String, dynamic> json) {
  return _MdmsModuleDetailModel.fromJson(json);
}

/// @nodoc
mixin _$MdmsModuleDetailModel {
  String get moduleName => throw _privateConstructorUsedError;
  List<MdmsMasterDetailModel> get masterDetails =>
      throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $MdmsModuleDetailModelCopyWith<MdmsModuleDetailModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $MdmsModuleDetailModelCopyWith<$Res> {
  factory $MdmsModuleDetailModelCopyWith(MdmsModuleDetailModel value,
          $Res Function(MdmsModuleDetailModel) then) =
      _$MdmsModuleDetailModelCopyWithImpl<$Res, MdmsModuleDetailModel>;
  @useResult
  $Res call({String moduleName, List<MdmsMasterDetailModel> masterDetails});
}

/// @nodoc
class _$MdmsModuleDetailModelCopyWithImpl<$Res,
        $Val extends MdmsModuleDetailModel>
    implements $MdmsModuleDetailModelCopyWith<$Res> {
  _$MdmsModuleDetailModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? moduleName = null,
    Object? masterDetails = null,
  }) {
    return _then(_value.copyWith(
      moduleName: null == moduleName
          ? _value.moduleName
          : moduleName // ignore: cast_nullable_to_non_nullable
              as String,
      masterDetails: null == masterDetails
          ? _value.masterDetails
          : masterDetails // ignore: cast_nullable_to_non_nullable
              as List<MdmsMasterDetailModel>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$MdmsModuleDetailModelImplCopyWith<$Res>
    implements $MdmsModuleDetailModelCopyWith<$Res> {
  factory _$$MdmsModuleDetailModelImplCopyWith(
          _$MdmsModuleDetailModelImpl value,
          $Res Function(_$MdmsModuleDetailModelImpl) then) =
      __$$MdmsModuleDetailModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String moduleName, List<MdmsMasterDetailModel> masterDetails});
}

/// @nodoc
class __$$MdmsModuleDetailModelImplCopyWithImpl<$Res>
    extends _$MdmsModuleDetailModelCopyWithImpl<$Res,
        _$MdmsModuleDetailModelImpl>
    implements _$$MdmsModuleDetailModelImplCopyWith<$Res> {
  __$$MdmsModuleDetailModelImplCopyWithImpl(_$MdmsModuleDetailModelImpl _value,
      $Res Function(_$MdmsModuleDetailModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? moduleName = null,
    Object? masterDetails = null,
  }) {
    return _then(_$MdmsModuleDetailModelImpl(
      moduleName: null == moduleName
          ? _value.moduleName
          : moduleName // ignore: cast_nullable_to_non_nullable
              as String,
      masterDetails: null == masterDetails
          ? _value._masterDetails
          : masterDetails // ignore: cast_nullable_to_non_nullable
              as List<MdmsMasterDetailModel>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$MdmsModuleDetailModelImpl implements _MdmsModuleDetailModel {
  const _$MdmsModuleDetailModelImpl(
      {required this.moduleName,
      required final List<MdmsMasterDetailModel> masterDetails})
      : _masterDetails = masterDetails;

  factory _$MdmsModuleDetailModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$MdmsModuleDetailModelImplFromJson(json);

  @override
  final String moduleName;
  final List<MdmsMasterDetailModel> _masterDetails;
  @override
  List<MdmsMasterDetailModel> get masterDetails {
    if (_masterDetails is EqualUnmodifiableListView) return _masterDetails;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_masterDetails);
  }

  @override
  String toString() {
    return 'MdmsModuleDetailModel(moduleName: $moduleName, masterDetails: $masterDetails)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MdmsModuleDetailModelImpl &&
            (identical(other.moduleName, moduleName) ||
                other.moduleName == moduleName) &&
            const DeepCollectionEquality()
                .equals(other._masterDetails, _masterDetails));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, moduleName,
      const DeepCollectionEquality().hash(_masterDetails));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$MdmsModuleDetailModelImplCopyWith<_$MdmsModuleDetailModelImpl>
      get copyWith => __$$MdmsModuleDetailModelImplCopyWithImpl<
          _$MdmsModuleDetailModelImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$MdmsModuleDetailModelImplToJson(
      this,
    );
  }
}

abstract class _MdmsModuleDetailModel implements MdmsModuleDetailModel {
  const factory _MdmsModuleDetailModel(
          {required final String moduleName,
          required final List<MdmsMasterDetailModel> masterDetails}) =
      _$MdmsModuleDetailModelImpl;

  factory _MdmsModuleDetailModel.fromJson(Map<String, dynamic> json) =
      _$MdmsModuleDetailModelImpl.fromJson;

  @override
  String get moduleName;
  @override
  List<MdmsMasterDetailModel> get masterDetails;
  @override
  @JsonKey(ignore: true)
  _$$MdmsModuleDetailModelImplCopyWith<_$MdmsModuleDetailModelImpl>
      get copyWith => throw _privateConstructorUsedError;
}

MdmsMasterDetailModel _$MdmsMasterDetailModelFromJson(
    Map<String, dynamic> json) {
  return _MdmsMasterDetailModel.fromJson(json);
}

/// @nodoc
mixin _$MdmsMasterDetailModel {
  String get name => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $MdmsMasterDetailModelCopyWith<MdmsMasterDetailModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $MdmsMasterDetailModelCopyWith<$Res> {
  factory $MdmsMasterDetailModelCopyWith(MdmsMasterDetailModel value,
          $Res Function(MdmsMasterDetailModel) then) =
      _$MdmsMasterDetailModelCopyWithImpl<$Res, MdmsMasterDetailModel>;
  @useResult
  $Res call({String name});
}

/// @nodoc
class _$MdmsMasterDetailModelCopyWithImpl<$Res,
        $Val extends MdmsMasterDetailModel>
    implements $MdmsMasterDetailModelCopyWith<$Res> {
  _$MdmsMasterDetailModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
  }) {
    return _then(_value.copyWith(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$MdmsMasterDetailModelImplCopyWith<$Res>
    implements $MdmsMasterDetailModelCopyWith<$Res> {
  factory _$$MdmsMasterDetailModelImplCopyWith(
          _$MdmsMasterDetailModelImpl value,
          $Res Function(_$MdmsMasterDetailModelImpl) then) =
      __$$MdmsMasterDetailModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String name});
}

/// @nodoc
class __$$MdmsMasterDetailModelImplCopyWithImpl<$Res>
    extends _$MdmsMasterDetailModelCopyWithImpl<$Res,
        _$MdmsMasterDetailModelImpl>
    implements _$$MdmsMasterDetailModelImplCopyWith<$Res> {
  __$$MdmsMasterDetailModelImplCopyWithImpl(_$MdmsMasterDetailModelImpl _value,
      $Res Function(_$MdmsMasterDetailModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
  }) {
    return _then(_$MdmsMasterDetailModelImpl(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$MdmsMasterDetailModelImpl implements _MdmsMasterDetailModel {
  const _$MdmsMasterDetailModelImpl({required this.name});

  factory _$MdmsMasterDetailModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$MdmsMasterDetailModelImplFromJson(json);

  @override
  final String name;

  @override
  String toString() {
    return 'MdmsMasterDetailModel(name: $name)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MdmsMasterDetailModelImpl &&
            (identical(other.name, name) || other.name == name));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, name);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$MdmsMasterDetailModelImplCopyWith<_$MdmsMasterDetailModelImpl>
      get copyWith => __$$MdmsMasterDetailModelImplCopyWithImpl<
          _$MdmsMasterDetailModelImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$MdmsMasterDetailModelImplToJson(
      this,
    );
  }
}

abstract class _MdmsMasterDetailModel implements MdmsMasterDetailModel {
  const factory _MdmsMasterDetailModel({required final String name}) =
      _$MdmsMasterDetailModelImpl;

  factory _MdmsMasterDetailModel.fromJson(Map<String, dynamic> json) =
      _$MdmsMasterDetailModelImpl.fromJson;

  @override
  String get name;
  @override
  @JsonKey(ignore: true)
  _$$MdmsMasterDetailModelImplCopyWith<_$MdmsMasterDetailModelImpl>
      get copyWith => throw _privateConstructorUsedError;
}
