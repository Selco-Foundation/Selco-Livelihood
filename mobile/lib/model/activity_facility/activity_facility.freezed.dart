// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'activity_facility.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

ActivityFacility _$ActivityFacilityFromJson(Map<String, dynamic> json) {
  return _ActivityFacility.fromJson(json);
}

/// @nodoc
mixin _$ActivityFacility {
  String? get id => throw _privateConstructorUsedError;
  String? get tenantId => throw _privateConstructorUsedError;
  String? get activityId => throw _privateConstructorUsedError;
  String? get facilityId => throw _privateConstructorUsedError;
  String? get status => throw _privateConstructorUsedError;
  int? get scheduledAt => throw _privateConstructorUsedError;
  int? get activatedAt => throw _privateConstructorUsedError;
  int? get completedAt => throw _privateConstructorUsedError;
  Facility? get facility => throw _privateConstructorUsedError;
  ActivityFacilityAdditionalDetails? get additionalDetails =>
      throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $ActivityFacilityCopyWith<ActivityFacility> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ActivityFacilityCopyWith<$Res> {
  factory $ActivityFacilityCopyWith(
          ActivityFacility value, $Res Function(ActivityFacility) then) =
      _$ActivityFacilityCopyWithImpl<$Res, ActivityFacility>;
  @useResult
  $Res call(
      {String? id,
      String? tenantId,
      String? activityId,
      String? facilityId,
      String? status,
      int? scheduledAt,
      int? activatedAt,
      int? completedAt,
      Facility? facility,
      ActivityFacilityAdditionalDetails? additionalDetails});

  $FacilityCopyWith<$Res>? get facility;
  $ActivityFacilityAdditionalDetailsCopyWith<$Res>? get additionalDetails;
}

/// @nodoc
class _$ActivityFacilityCopyWithImpl<$Res, $Val extends ActivityFacility>
    implements $ActivityFacilityCopyWith<$Res> {
  _$ActivityFacilityCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = freezed,
    Object? tenantId = freezed,
    Object? activityId = freezed,
    Object? facilityId = freezed,
    Object? status = freezed,
    Object? scheduledAt = freezed,
    Object? activatedAt = freezed,
    Object? completedAt = freezed,
    Object? facility = freezed,
    Object? additionalDetails = freezed,
  }) {
    return _then(_value.copyWith(
      id: freezed == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String?,
      tenantId: freezed == tenantId
          ? _value.tenantId
          : tenantId // ignore: cast_nullable_to_non_nullable
              as String?,
      activityId: freezed == activityId
          ? _value.activityId
          : activityId // ignore: cast_nullable_to_non_nullable
              as String?,
      facilityId: freezed == facilityId
          ? _value.facilityId
          : facilityId // ignore: cast_nullable_to_non_nullable
              as String?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
      scheduledAt: freezed == scheduledAt
          ? _value.scheduledAt
          : scheduledAt // ignore: cast_nullable_to_non_nullable
              as int?,
      activatedAt: freezed == activatedAt
          ? _value.activatedAt
          : activatedAt // ignore: cast_nullable_to_non_nullable
              as int?,
      completedAt: freezed == completedAt
          ? _value.completedAt
          : completedAt // ignore: cast_nullable_to_non_nullable
              as int?,
      facility: freezed == facility
          ? _value.facility
          : facility // ignore: cast_nullable_to_non_nullable
              as Facility?,
      additionalDetails: freezed == additionalDetails
          ? _value.additionalDetails
          : additionalDetails // ignore: cast_nullable_to_non_nullable
              as ActivityFacilityAdditionalDetails?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $FacilityCopyWith<$Res>? get facility {
    if (_value.facility == null) {
      return null;
    }

    return $FacilityCopyWith<$Res>(_value.facility!, (value) {
      return _then(_value.copyWith(facility: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $ActivityFacilityAdditionalDetailsCopyWith<$Res>? get additionalDetails {
    if (_value.additionalDetails == null) {
      return null;
    }

    return $ActivityFacilityAdditionalDetailsCopyWith<$Res>(
        _value.additionalDetails!, (value) {
      return _then(_value.copyWith(additionalDetails: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$ActivityFacilityImplCopyWith<$Res>
    implements $ActivityFacilityCopyWith<$Res> {
  factory _$$ActivityFacilityImplCopyWith(_$ActivityFacilityImpl value,
          $Res Function(_$ActivityFacilityImpl) then) =
      __$$ActivityFacilityImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String? id,
      String? tenantId,
      String? activityId,
      String? facilityId,
      String? status,
      int? scheduledAt,
      int? activatedAt,
      int? completedAt,
      Facility? facility,
      ActivityFacilityAdditionalDetails? additionalDetails});

  @override
  $FacilityCopyWith<$Res>? get facility;
  @override
  $ActivityFacilityAdditionalDetailsCopyWith<$Res>? get additionalDetails;
}

/// @nodoc
class __$$ActivityFacilityImplCopyWithImpl<$Res>
    extends _$ActivityFacilityCopyWithImpl<$Res, _$ActivityFacilityImpl>
    implements _$$ActivityFacilityImplCopyWith<$Res> {
  __$$ActivityFacilityImplCopyWithImpl(_$ActivityFacilityImpl _value,
      $Res Function(_$ActivityFacilityImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = freezed,
    Object? tenantId = freezed,
    Object? activityId = freezed,
    Object? facilityId = freezed,
    Object? status = freezed,
    Object? scheduledAt = freezed,
    Object? activatedAt = freezed,
    Object? completedAt = freezed,
    Object? facility = freezed,
    Object? additionalDetails = freezed,
  }) {
    return _then(_$ActivityFacilityImpl(
      id: freezed == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String?,
      tenantId: freezed == tenantId
          ? _value.tenantId
          : tenantId // ignore: cast_nullable_to_non_nullable
              as String?,
      activityId: freezed == activityId
          ? _value.activityId
          : activityId // ignore: cast_nullable_to_non_nullable
              as String?,
      facilityId: freezed == facilityId
          ? _value.facilityId
          : facilityId // ignore: cast_nullable_to_non_nullable
              as String?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
      scheduledAt: freezed == scheduledAt
          ? _value.scheduledAt
          : scheduledAt // ignore: cast_nullable_to_non_nullable
              as int?,
      activatedAt: freezed == activatedAt
          ? _value.activatedAt
          : activatedAt // ignore: cast_nullable_to_non_nullable
              as int?,
      completedAt: freezed == completedAt
          ? _value.completedAt
          : completedAt // ignore: cast_nullable_to_non_nullable
              as int?,
      facility: freezed == facility
          ? _value.facility
          : facility // ignore: cast_nullable_to_non_nullable
              as Facility?,
      additionalDetails: freezed == additionalDetails
          ? _value.additionalDetails
          : additionalDetails // ignore: cast_nullable_to_non_nullable
              as ActivityFacilityAdditionalDetails?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ActivityFacilityImpl implements _ActivityFacility {
  const _$ActivityFacilityImpl(
      {this.id,
      this.tenantId,
      this.activityId,
      this.facilityId,
      this.status,
      this.scheduledAt,
      this.activatedAt,
      this.completedAt,
      this.facility,
      this.additionalDetails});

  factory _$ActivityFacilityImpl.fromJson(Map<String, dynamic> json) =>
      _$$ActivityFacilityImplFromJson(json);

  @override
  final String? id;
  @override
  final String? tenantId;
  @override
  final String? activityId;
  @override
  final String? facilityId;
  @override
  final String? status;
  @override
  final int? scheduledAt;
  @override
  final int? activatedAt;
  @override
  final int? completedAt;
  @override
  final Facility? facility;
  @override
  final ActivityFacilityAdditionalDetails? additionalDetails;

  @override
  String toString() {
    return 'ActivityFacility(id: $id, tenantId: $tenantId, activityId: $activityId, facilityId: $facilityId, status: $status, scheduledAt: $scheduledAt, activatedAt: $activatedAt, completedAt: $completedAt, facility: $facility, additionalDetails: $additionalDetails)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ActivityFacilityImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.tenantId, tenantId) ||
                other.tenantId == tenantId) &&
            (identical(other.activityId, activityId) ||
                other.activityId == activityId) &&
            (identical(other.facilityId, facilityId) ||
                other.facilityId == facilityId) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.scheduledAt, scheduledAt) ||
                other.scheduledAt == scheduledAt) &&
            (identical(other.activatedAt, activatedAt) ||
                other.activatedAt == activatedAt) &&
            (identical(other.completedAt, completedAt) ||
                other.completedAt == completedAt) &&
            (identical(other.facility, facility) ||
                other.facility == facility) &&
            (identical(other.additionalDetails, additionalDetails) ||
                other.additionalDetails == additionalDetails));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      tenantId,
      activityId,
      facilityId,
      status,
      scheduledAt,
      activatedAt,
      completedAt,
      facility,
      additionalDetails);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$ActivityFacilityImplCopyWith<_$ActivityFacilityImpl> get copyWith =>
      __$$ActivityFacilityImplCopyWithImpl<_$ActivityFacilityImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ActivityFacilityImplToJson(
      this,
    );
  }
}

abstract class _ActivityFacility implements ActivityFacility {
  const factory _ActivityFacility(
          {final String? id,
          final String? tenantId,
          final String? activityId,
          final String? facilityId,
          final String? status,
          final int? scheduledAt,
          final int? activatedAt,
          final int? completedAt,
          final Facility? facility,
          final ActivityFacilityAdditionalDetails? additionalDetails}) =
      _$ActivityFacilityImpl;

  factory _ActivityFacility.fromJson(Map<String, dynamic> json) =
      _$ActivityFacilityImpl.fromJson;

  @override
  String? get id;
  @override
  String? get tenantId;
  @override
  String? get activityId;
  @override
  String? get facilityId;
  @override
  String? get status;
  @override
  int? get scheduledAt;
  @override
  int? get activatedAt;
  @override
  int? get completedAt;
  @override
  Facility? get facility;
  @override
  ActivityFacilityAdditionalDetails? get additionalDetails;
  @override
  @JsonKey(ignore: true)
  _$$ActivityFacilityImplCopyWith<_$ActivityFacilityImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

Facility _$FacilityFromJson(Map<String, dynamic> json) {
  return _Facility.fromJson(json);
}

/// @nodoc
mixin _$Facility {
  @JsonKey(name: 'facility_name')
  String? get facilityName => throw _privateConstructorUsedError;
  String? get boundaryCode => throw _privateConstructorUsedError;
  String? get systemCode => throw _privateConstructorUsedError;
  String? get systemType => throw _privateConstructorUsedError;
  FacilityDetails? get facilityDetails => throw _privateConstructorUsedError;
  Map<String, dynamic>? get additionalDetails =>
      throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $FacilityCopyWith<Facility> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $FacilityCopyWith<$Res> {
  factory $FacilityCopyWith(Facility value, $Res Function(Facility) then) =
      _$FacilityCopyWithImpl<$Res, Facility>;
  @useResult
  $Res call(
      {@JsonKey(name: 'facility_name') String? facilityName,
      String? boundaryCode,
      String? systemCode,
      String? systemType,
      FacilityDetails? facilityDetails,
      Map<String, dynamic>? additionalDetails});

  $FacilityDetailsCopyWith<$Res>? get facilityDetails;
}

/// @nodoc
class _$FacilityCopyWithImpl<$Res, $Val extends Facility>
    implements $FacilityCopyWith<$Res> {
  _$FacilityCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? facilityName = freezed,
    Object? boundaryCode = freezed,
    Object? systemCode = freezed,
    Object? systemType = freezed,
    Object? facilityDetails = freezed,
    Object? additionalDetails = freezed,
  }) {
    return _then(_value.copyWith(
      facilityName: freezed == facilityName
          ? _value.facilityName
          : facilityName // ignore: cast_nullable_to_non_nullable
              as String?,
      boundaryCode: freezed == boundaryCode
          ? _value.boundaryCode
          : boundaryCode // ignore: cast_nullable_to_non_nullable
              as String?,
      systemCode: freezed == systemCode
          ? _value.systemCode
          : systemCode // ignore: cast_nullable_to_non_nullable
              as String?,
      systemType: freezed == systemType
          ? _value.systemType
          : systemType // ignore: cast_nullable_to_non_nullable
              as String?,
      facilityDetails: freezed == facilityDetails
          ? _value.facilityDetails
          : facilityDetails // ignore: cast_nullable_to_non_nullable
              as FacilityDetails?,
      additionalDetails: freezed == additionalDetails
          ? _value.additionalDetails
          : additionalDetails // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $FacilityDetailsCopyWith<$Res>? get facilityDetails {
    if (_value.facilityDetails == null) {
      return null;
    }

    return $FacilityDetailsCopyWith<$Res>(_value.facilityDetails!, (value) {
      return _then(_value.copyWith(facilityDetails: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$FacilityImplCopyWith<$Res>
    implements $FacilityCopyWith<$Res> {
  factory _$$FacilityImplCopyWith(
          _$FacilityImpl value, $Res Function(_$FacilityImpl) then) =
      __$$FacilityImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {@JsonKey(name: 'facility_name') String? facilityName,
      String? boundaryCode,
      String? systemCode,
      String? systemType,
      FacilityDetails? facilityDetails,
      Map<String, dynamic>? additionalDetails});

  @override
  $FacilityDetailsCopyWith<$Res>? get facilityDetails;
}

/// @nodoc
class __$$FacilityImplCopyWithImpl<$Res>
    extends _$FacilityCopyWithImpl<$Res, _$FacilityImpl>
    implements _$$FacilityImplCopyWith<$Res> {
  __$$FacilityImplCopyWithImpl(
      _$FacilityImpl _value, $Res Function(_$FacilityImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? facilityName = freezed,
    Object? boundaryCode = freezed,
    Object? systemCode = freezed,
    Object? systemType = freezed,
    Object? facilityDetails = freezed,
    Object? additionalDetails = freezed,
  }) {
    return _then(_$FacilityImpl(
      facilityName: freezed == facilityName
          ? _value.facilityName
          : facilityName // ignore: cast_nullable_to_non_nullable
              as String?,
      boundaryCode: freezed == boundaryCode
          ? _value.boundaryCode
          : boundaryCode // ignore: cast_nullable_to_non_nullable
              as String?,
      systemCode: freezed == systemCode
          ? _value.systemCode
          : systemCode // ignore: cast_nullable_to_non_nullable
              as String?,
      systemType: freezed == systemType
          ? _value.systemType
          : systemType // ignore: cast_nullable_to_non_nullable
              as String?,
      facilityDetails: freezed == facilityDetails
          ? _value.facilityDetails
          : facilityDetails // ignore: cast_nullable_to_non_nullable
              as FacilityDetails?,
      additionalDetails: freezed == additionalDetails
          ? _value._additionalDetails
          : additionalDetails // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$FacilityImpl implements _Facility {
  const _$FacilityImpl(
      {@JsonKey(name: 'facility_name') this.facilityName,
      this.boundaryCode,
      this.systemCode,
      this.systemType,
      this.facilityDetails,
      final Map<String, dynamic>? additionalDetails})
      : _additionalDetails = additionalDetails;

  factory _$FacilityImpl.fromJson(Map<String, dynamic> json) =>
      _$$FacilityImplFromJson(json);

  @override
  @JsonKey(name: 'facility_name')
  final String? facilityName;
  @override
  final String? boundaryCode;
  @override
  final String? systemCode;
  @override
  final String? systemType;
  @override
  final FacilityDetails? facilityDetails;
  final Map<String, dynamic>? _additionalDetails;
  @override
  Map<String, dynamic>? get additionalDetails {
    final value = _additionalDetails;
    if (value == null) return null;
    if (_additionalDetails is EqualUnmodifiableMapView)
      return _additionalDetails;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  String toString() {
    return 'Facility(facilityName: $facilityName, boundaryCode: $boundaryCode, systemCode: $systemCode, systemType: $systemType, facilityDetails: $facilityDetails, additionalDetails: $additionalDetails)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FacilityImpl &&
            (identical(other.facilityName, facilityName) ||
                other.facilityName == facilityName) &&
            (identical(other.boundaryCode, boundaryCode) ||
                other.boundaryCode == boundaryCode) &&
            (identical(other.systemCode, systemCode) ||
                other.systemCode == systemCode) &&
            (identical(other.systemType, systemType) ||
                other.systemType == systemType) &&
            (identical(other.facilityDetails, facilityDetails) ||
                other.facilityDetails == facilityDetails) &&
            const DeepCollectionEquality()
                .equals(other._additionalDetails, _additionalDetails));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      facilityName,
      boundaryCode,
      systemCode,
      systemType,
      facilityDetails,
      const DeepCollectionEquality().hash(_additionalDetails));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$FacilityImplCopyWith<_$FacilityImpl> get copyWith =>
      __$$FacilityImplCopyWithImpl<_$FacilityImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$FacilityImplToJson(
      this,
    );
  }
}

abstract class _Facility implements Facility {
  const factory _Facility(
      {@JsonKey(name: 'facility_name') final String? facilityName,
      final String? boundaryCode,
      final String? systemCode,
      final String? systemType,
      final FacilityDetails? facilityDetails,
      final Map<String, dynamic>? additionalDetails}) = _$FacilityImpl;

  factory _Facility.fromJson(Map<String, dynamic> json) =
      _$FacilityImpl.fromJson;

  @override
  @JsonKey(name: 'facility_name')
  String? get facilityName;
  @override
  String? get boundaryCode;
  @override
  String? get systemCode;
  @override
  String? get systemType;
  @override
  FacilityDetails? get facilityDetails;
  @override
  Map<String, dynamic>? get additionalDetails;
  @override
  @JsonKey(ignore: true)
  _$$FacilityImplCopyWith<_$FacilityImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

FacilityDetails _$FacilityDetailsFromJson(Map<String, dynamic> json) {
  return _FacilityDetails.fromJson(json);
}

/// @nodoc
mixin _$FacilityDetails {
  @JsonKey(name: 'solar_solution_design_type')
  String? get solutionDesignType => throw _privateConstructorUsedError;
  String? get systemType => throw _privateConstructorUsedError;
  String? get systemCode => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $FacilityDetailsCopyWith<FacilityDetails> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $FacilityDetailsCopyWith<$Res> {
  factory $FacilityDetailsCopyWith(
          FacilityDetails value, $Res Function(FacilityDetails) then) =
      _$FacilityDetailsCopyWithImpl<$Res, FacilityDetails>;
  @useResult
  $Res call(
      {@JsonKey(name: 'solar_solution_design_type') String? solutionDesignType,
      String? systemType,
      String? systemCode});
}

/// @nodoc
class _$FacilityDetailsCopyWithImpl<$Res, $Val extends FacilityDetails>
    implements $FacilityDetailsCopyWith<$Res> {
  _$FacilityDetailsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? solutionDesignType = freezed,
    Object? systemType = freezed,
    Object? systemCode = freezed,
  }) {
    return _then(_value.copyWith(
      solutionDesignType: freezed == solutionDesignType
          ? _value.solutionDesignType
          : solutionDesignType // ignore: cast_nullable_to_non_nullable
              as String?,
      systemType: freezed == systemType
          ? _value.systemType
          : systemType // ignore: cast_nullable_to_non_nullable
              as String?,
      systemCode: freezed == systemCode
          ? _value.systemCode
          : systemCode // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$FacilityDetailsImplCopyWith<$Res>
    implements $FacilityDetailsCopyWith<$Res> {
  factory _$$FacilityDetailsImplCopyWith(_$FacilityDetailsImpl value,
          $Res Function(_$FacilityDetailsImpl) then) =
      __$$FacilityDetailsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {@JsonKey(name: 'solar_solution_design_type') String? solutionDesignType,
      String? systemType,
      String? systemCode});
}

/// @nodoc
class __$$FacilityDetailsImplCopyWithImpl<$Res>
    extends _$FacilityDetailsCopyWithImpl<$Res, _$FacilityDetailsImpl>
    implements _$$FacilityDetailsImplCopyWith<$Res> {
  __$$FacilityDetailsImplCopyWithImpl(
      _$FacilityDetailsImpl _value, $Res Function(_$FacilityDetailsImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? solutionDesignType = freezed,
    Object? systemType = freezed,
    Object? systemCode = freezed,
  }) {
    return _then(_$FacilityDetailsImpl(
      solutionDesignType: freezed == solutionDesignType
          ? _value.solutionDesignType
          : solutionDesignType // ignore: cast_nullable_to_non_nullable
              as String?,
      systemType: freezed == systemType
          ? _value.systemType
          : systemType // ignore: cast_nullable_to_non_nullable
              as String?,
      systemCode: freezed == systemCode
          ? _value.systemCode
          : systemCode // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$FacilityDetailsImpl implements _FacilityDetails {
  const _$FacilityDetailsImpl(
      {@JsonKey(name: 'solar_solution_design_type') this.solutionDesignType,
      this.systemType,
      this.systemCode});

  factory _$FacilityDetailsImpl.fromJson(Map<String, dynamic> json) =>
      _$$FacilityDetailsImplFromJson(json);

  @override
  @JsonKey(name: 'solar_solution_design_type')
  final String? solutionDesignType;
  @override
  final String? systemType;
  @override
  final String? systemCode;

  @override
  String toString() {
    return 'FacilityDetails(solutionDesignType: $solutionDesignType, systemType: $systemType, systemCode: $systemCode)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FacilityDetailsImpl &&
            (identical(other.solutionDesignType, solutionDesignType) ||
                other.solutionDesignType == solutionDesignType) &&
            (identical(other.systemType, systemType) ||
                other.systemType == systemType) &&
            (identical(other.systemCode, systemCode) ||
                other.systemCode == systemCode));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, solutionDesignType, systemType, systemCode);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$FacilityDetailsImplCopyWith<_$FacilityDetailsImpl> get copyWith =>
      __$$FacilityDetailsImplCopyWithImpl<_$FacilityDetailsImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$FacilityDetailsImplToJson(
      this,
    );
  }
}

abstract class _FacilityDetails implements FacilityDetails {
  const factory _FacilityDetails(
      {@JsonKey(name: 'solar_solution_design_type')
      final String? solutionDesignType,
      final String? systemType,
      final String? systemCode}) = _$FacilityDetailsImpl;

  factory _FacilityDetails.fromJson(Map<String, dynamic> json) =
      _$FacilityDetailsImpl.fromJson;

  @override
  @JsonKey(name: 'solar_solution_design_type')
  String? get solutionDesignType;
  @override
  String? get systemType;
  @override
  String? get systemCode;
  @override
  @JsonKey(ignore: true)
  _$$FacilityDetailsImplCopyWith<_$FacilityDetailsImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ActivityFacilityAdditionalDetails _$ActivityFacilityAdditionalDetailsFromJson(
    Map<String, dynamic> json) {
  return _ActivityFacilityAdditionalDetails.fromJson(json);
}

/// @nodoc
mixin _$ActivityFacilityAdditionalDetails {
  Map<String, dynamic>? get bom => throw _privateConstructorUsedError;
  Map<String, dynamic>? get battery => throw _privateConstructorUsedError;
  Map<String, dynamic>? get inverter => throw _privateConstructorUsedError;
  Map<String, dynamic>? get panel => throw _privateConstructorUsedError;
  String? get systemCode => throw _privateConstructorUsedError;
  String? get componentType => throw _privateConstructorUsedError;
  String? get assetType => throw _privateConstructorUsedError;
  List<Map<String, dynamic>>? get documents =>
      throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $ActivityFacilityAdditionalDetailsCopyWith<ActivityFacilityAdditionalDetails>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ActivityFacilityAdditionalDetailsCopyWith<$Res> {
  factory $ActivityFacilityAdditionalDetailsCopyWith(
          ActivityFacilityAdditionalDetails value,
          $Res Function(ActivityFacilityAdditionalDetails) then) =
      _$ActivityFacilityAdditionalDetailsCopyWithImpl<$Res,
          ActivityFacilityAdditionalDetails>;
  @useResult
  $Res call(
      {Map<String, dynamic>? bom,
      Map<String, dynamic>? battery,
      Map<String, dynamic>? inverter,
      Map<String, dynamic>? panel,
      String? systemCode,
      String? componentType,
      String? assetType,
      List<Map<String, dynamic>>? documents});
}

/// @nodoc
class _$ActivityFacilityAdditionalDetailsCopyWithImpl<$Res,
        $Val extends ActivityFacilityAdditionalDetails>
    implements $ActivityFacilityAdditionalDetailsCopyWith<$Res> {
  _$ActivityFacilityAdditionalDetailsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? bom = freezed,
    Object? battery = freezed,
    Object? inverter = freezed,
    Object? panel = freezed,
    Object? systemCode = freezed,
    Object? componentType = freezed,
    Object? assetType = freezed,
    Object? documents = freezed,
  }) {
    return _then(_value.copyWith(
      bom: freezed == bom
          ? _value.bom
          : bom // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      battery: freezed == battery
          ? _value.battery
          : battery // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      inverter: freezed == inverter
          ? _value.inverter
          : inverter // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      panel: freezed == panel
          ? _value.panel
          : panel // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      systemCode: freezed == systemCode
          ? _value.systemCode
          : systemCode // ignore: cast_nullable_to_non_nullable
              as String?,
      componentType: freezed == componentType
          ? _value.componentType
          : componentType // ignore: cast_nullable_to_non_nullable
              as String?,
      assetType: freezed == assetType
          ? _value.assetType
          : assetType // ignore: cast_nullable_to_non_nullable
              as String?,
      documents: freezed == documents
          ? _value.documents
          : documents // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ActivityFacilityAdditionalDetailsImplCopyWith<$Res>
    implements $ActivityFacilityAdditionalDetailsCopyWith<$Res> {
  factory _$$ActivityFacilityAdditionalDetailsImplCopyWith(
          _$ActivityFacilityAdditionalDetailsImpl value,
          $Res Function(_$ActivityFacilityAdditionalDetailsImpl) then) =
      __$$ActivityFacilityAdditionalDetailsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {Map<String, dynamic>? bom,
      Map<String, dynamic>? battery,
      Map<String, dynamic>? inverter,
      Map<String, dynamic>? panel,
      String? systemCode,
      String? componentType,
      String? assetType,
      List<Map<String, dynamic>>? documents});
}

/// @nodoc
class __$$ActivityFacilityAdditionalDetailsImplCopyWithImpl<$Res>
    extends _$ActivityFacilityAdditionalDetailsCopyWithImpl<$Res,
        _$ActivityFacilityAdditionalDetailsImpl>
    implements _$$ActivityFacilityAdditionalDetailsImplCopyWith<$Res> {
  __$$ActivityFacilityAdditionalDetailsImplCopyWithImpl(
      _$ActivityFacilityAdditionalDetailsImpl _value,
      $Res Function(_$ActivityFacilityAdditionalDetailsImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? bom = freezed,
    Object? battery = freezed,
    Object? inverter = freezed,
    Object? panel = freezed,
    Object? systemCode = freezed,
    Object? componentType = freezed,
    Object? assetType = freezed,
    Object? documents = freezed,
  }) {
    return _then(_$ActivityFacilityAdditionalDetailsImpl(
      bom: freezed == bom
          ? _value._bom
          : bom // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      battery: freezed == battery
          ? _value._battery
          : battery // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      inverter: freezed == inverter
          ? _value._inverter
          : inverter // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      panel: freezed == panel
          ? _value._panel
          : panel // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      systemCode: freezed == systemCode
          ? _value.systemCode
          : systemCode // ignore: cast_nullable_to_non_nullable
              as String?,
      componentType: freezed == componentType
          ? _value.componentType
          : componentType // ignore: cast_nullable_to_non_nullable
              as String?,
      assetType: freezed == assetType
          ? _value.assetType
          : assetType // ignore: cast_nullable_to_non_nullable
              as String?,
      documents: freezed == documents
          ? _value._documents
          : documents // ignore: cast_nullable_to_non_nullable
              as List<Map<String, dynamic>>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ActivityFacilityAdditionalDetailsImpl
    implements _ActivityFacilityAdditionalDetails {
  const _$ActivityFacilityAdditionalDetailsImpl(
      {final Map<String, dynamic>? bom,
      final Map<String, dynamic>? battery,
      final Map<String, dynamic>? inverter,
      final Map<String, dynamic>? panel,
      this.systemCode,
      this.componentType,
      this.assetType,
      final List<Map<String, dynamic>>? documents})
      : _bom = bom,
        _battery = battery,
        _inverter = inverter,
        _panel = panel,
        _documents = documents;

  factory _$ActivityFacilityAdditionalDetailsImpl.fromJson(
          Map<String, dynamic> json) =>
      _$$ActivityFacilityAdditionalDetailsImplFromJson(json);

  final Map<String, dynamic>? _bom;
  @override
  Map<String, dynamic>? get bom {
    final value = _bom;
    if (value == null) return null;
    if (_bom is EqualUnmodifiableMapView) return _bom;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  final Map<String, dynamic>? _battery;
  @override
  Map<String, dynamic>? get battery {
    final value = _battery;
    if (value == null) return null;
    if (_battery is EqualUnmodifiableMapView) return _battery;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  final Map<String, dynamic>? _inverter;
  @override
  Map<String, dynamic>? get inverter {
    final value = _inverter;
    if (value == null) return null;
    if (_inverter is EqualUnmodifiableMapView) return _inverter;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  final Map<String, dynamic>? _panel;
  @override
  Map<String, dynamic>? get panel {
    final value = _panel;
    if (value == null) return null;
    if (_panel is EqualUnmodifiableMapView) return _panel;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  final String? systemCode;
  @override
  final String? componentType;
  @override
  final String? assetType;
  final List<Map<String, dynamic>>? _documents;
  @override
  List<Map<String, dynamic>>? get documents {
    final value = _documents;
    if (value == null) return null;
    if (_documents is EqualUnmodifiableListView) return _documents;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  String toString() {
    return 'ActivityFacilityAdditionalDetails(bom: $bom, battery: $battery, inverter: $inverter, panel: $panel, systemCode: $systemCode, componentType: $componentType, assetType: $assetType, documents: $documents)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ActivityFacilityAdditionalDetailsImpl &&
            const DeepCollectionEquality().equals(other._bom, _bom) &&
            const DeepCollectionEquality().equals(other._battery, _battery) &&
            const DeepCollectionEquality().equals(other._inverter, _inverter) &&
            const DeepCollectionEquality().equals(other._panel, _panel) &&
            (identical(other.systemCode, systemCode) ||
                other.systemCode == systemCode) &&
            (identical(other.componentType, componentType) ||
                other.componentType == componentType) &&
            (identical(other.assetType, assetType) ||
                other.assetType == assetType) &&
            const DeepCollectionEquality()
                .equals(other._documents, _documents));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_bom),
      const DeepCollectionEquality().hash(_battery),
      const DeepCollectionEquality().hash(_inverter),
      const DeepCollectionEquality().hash(_panel),
      systemCode,
      componentType,
      assetType,
      const DeepCollectionEquality().hash(_documents));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$ActivityFacilityAdditionalDetailsImplCopyWith<
          _$ActivityFacilityAdditionalDetailsImpl>
      get copyWith => __$$ActivityFacilityAdditionalDetailsImplCopyWithImpl<
          _$ActivityFacilityAdditionalDetailsImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ActivityFacilityAdditionalDetailsImplToJson(
      this,
    );
  }
}

abstract class _ActivityFacilityAdditionalDetails
    implements ActivityFacilityAdditionalDetails {
  const factory _ActivityFacilityAdditionalDetails(
          {final Map<String, dynamic>? bom,
          final Map<String, dynamic>? battery,
          final Map<String, dynamic>? inverter,
          final Map<String, dynamic>? panel,
          final String? systemCode,
          final String? componentType,
          final String? assetType,
          final List<Map<String, dynamic>>? documents}) =
      _$ActivityFacilityAdditionalDetailsImpl;

  factory _ActivityFacilityAdditionalDetails.fromJson(
          Map<String, dynamic> json) =
      _$ActivityFacilityAdditionalDetailsImpl.fromJson;

  @override
  Map<String, dynamic>? get bom;
  @override
  Map<String, dynamic>? get battery;
  @override
  Map<String, dynamic>? get inverter;
  @override
  Map<String, dynamic>? get panel;
  @override
  String? get systemCode;
  @override
  String? get componentType;
  @override
  String? get assetType;
  @override
  List<Map<String, dynamic>>? get documents;
  @override
  @JsonKey(ignore: true)
  _$$ActivityFacilityAdditionalDetailsImplCopyWith<
          _$ActivityFacilityAdditionalDetailsImpl>
      get copyWith => throw _privateConstructorUsedError;
}
