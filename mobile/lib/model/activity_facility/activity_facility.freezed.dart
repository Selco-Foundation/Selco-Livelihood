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
      String? boundaryCode});
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
    ) as $Val);
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
      String? boundaryCode});
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
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$FacilityImpl implements _Facility {
  const _$FacilityImpl(
      {@JsonKey(name: 'facility_name') this.facilityName, this.boundaryCode});

  factory _$FacilityImpl.fromJson(Map<String, dynamic> json) =>
      _$$FacilityImplFromJson(json);

  @override
  @JsonKey(name: 'facility_name')
  final String? facilityName;
  @override
  final String? boundaryCode;

  @override
  String toString() {
    return 'Facility(facilityName: $facilityName, boundaryCode: $boundaryCode)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FacilityImpl &&
            (identical(other.facilityName, facilityName) ||
                other.facilityName == facilityName) &&
            (identical(other.boundaryCode, boundaryCode) ||
                other.boundaryCode == boundaryCode));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, facilityName, boundaryCode);

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
      final String? boundaryCode}) = _$FacilityImpl;

  factory _Facility.fromJson(Map<String, dynamic> json) =
      _$FacilityImpl.fromJson;

  @override
  @JsonKey(name: 'facility_name')
  String? get facilityName;
  @override
  String? get boundaryCode;
  @override
  @JsonKey(ignore: true)
  _$$FacilityImplCopyWith<_$FacilityImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ActivityFacilityAdditionalDetails _$ActivityFacilityAdditionalDetailsFromJson(
    Map<String, dynamic> json) {
  return _ActivityFacilityAdditionalDetails.fromJson(json);
}

/// @nodoc
mixin _$ActivityFacilityAdditionalDetails {
  Map<String, dynamic>? get bom => throw _privateConstructorUsedError;

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
  $Res call({Map<String, dynamic>? bom});
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
  }) {
    return _then(_value.copyWith(
      bom: freezed == bom
          ? _value.bom
          : bom // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
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
  $Res call({Map<String, dynamic>? bom});
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
  }) {
    return _then(_$ActivityFacilityAdditionalDetailsImpl(
      bom: freezed == bom
          ? _value._bom
          : bom // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ActivityFacilityAdditionalDetailsImpl
    implements _ActivityFacilityAdditionalDetails {
  const _$ActivityFacilityAdditionalDetailsImpl(
      {final Map<String, dynamic>? bom})
      : _bom = bom;

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

  @override
  String toString() {
    return 'ActivityFacilityAdditionalDetails(bom: $bom)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ActivityFacilityAdditionalDetailsImpl &&
            const DeepCollectionEquality().equals(other._bom, _bom));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(_bom));

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
          {final Map<String, dynamic>? bom}) =
      _$ActivityFacilityAdditionalDetailsImpl;

  factory _ActivityFacilityAdditionalDetails.fromJson(
          Map<String, dynamic> json) =
      _$ActivityFacilityAdditionalDetailsImpl.fromJson;

  @override
  Map<String, dynamic>? get bom;
  @override
  @JsonKey(ignore: true)
  _$$ActivityFacilityAdditionalDetailsImplCopyWith<
          _$ActivityFacilityAdditionalDetailsImpl>
      get copyWith => throw _privateConstructorUsedError;
}
