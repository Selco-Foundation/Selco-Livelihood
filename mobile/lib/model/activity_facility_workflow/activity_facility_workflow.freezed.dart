// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'activity_facility_workflow.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

ActivityFacilityWorkflow _$ActivityFacilityWorkflowFromJson(
    Map<String, dynamic> json) {
  return _ActivityFacilityWorkflow.fromJson(json);
}

/// @nodoc
mixin _$ActivityFacilityWorkflow {
  ActivityFacility get activityFacility => throw _privateConstructorUsedError;
  String? get status => throw _privateConstructorUsedError;
  @WorkflowFlexConverter()
  Workflow? get workflow => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $ActivityFacilityWorkflowCopyWith<ActivityFacilityWorkflow> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ActivityFacilityWorkflowCopyWith<$Res> {
  factory $ActivityFacilityWorkflowCopyWith(ActivityFacilityWorkflow value,
          $Res Function(ActivityFacilityWorkflow) then) =
      _$ActivityFacilityWorkflowCopyWithImpl<$Res, ActivityFacilityWorkflow>;
  @useResult
  $Res call(
      {ActivityFacility activityFacility,
      String? status,
      @WorkflowFlexConverter() Workflow? workflow});

  $ActivityFacilityCopyWith<$Res> get activityFacility;
  $WorkflowCopyWith<$Res>? get workflow;
}

/// @nodoc
class _$ActivityFacilityWorkflowCopyWithImpl<$Res,
        $Val extends ActivityFacilityWorkflow>
    implements $ActivityFacilityWorkflowCopyWith<$Res> {
  _$ActivityFacilityWorkflowCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? activityFacility = null,
    Object? status = freezed,
    Object? workflow = freezed,
  }) {
    return _then(_value.copyWith(
      activityFacility: null == activityFacility
          ? _value.activityFacility
          : activityFacility // ignore: cast_nullable_to_non_nullable
              as ActivityFacility,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
      workflow: freezed == workflow
          ? _value.workflow
          : workflow // ignore: cast_nullable_to_non_nullable
              as Workflow?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $ActivityFacilityCopyWith<$Res> get activityFacility {
    return $ActivityFacilityCopyWith<$Res>(_value.activityFacility, (value) {
      return _then(_value.copyWith(activityFacility: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $WorkflowCopyWith<$Res>? get workflow {
    if (_value.workflow == null) {
      return null;
    }

    return $WorkflowCopyWith<$Res>(_value.workflow!, (value) {
      return _then(_value.copyWith(workflow: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$ActivityFacilityWorkflowImplCopyWith<$Res>
    implements $ActivityFacilityWorkflowCopyWith<$Res> {
  factory _$$ActivityFacilityWorkflowImplCopyWith(
          _$ActivityFacilityWorkflowImpl value,
          $Res Function(_$ActivityFacilityWorkflowImpl) then) =
      __$$ActivityFacilityWorkflowImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {ActivityFacility activityFacility,
      String? status,
      @WorkflowFlexConverter() Workflow? workflow});

  @override
  $ActivityFacilityCopyWith<$Res> get activityFacility;
  @override
  $WorkflowCopyWith<$Res>? get workflow;
}

/// @nodoc
class __$$ActivityFacilityWorkflowImplCopyWithImpl<$Res>
    extends _$ActivityFacilityWorkflowCopyWithImpl<$Res,
        _$ActivityFacilityWorkflowImpl>
    implements _$$ActivityFacilityWorkflowImplCopyWith<$Res> {
  __$$ActivityFacilityWorkflowImplCopyWithImpl(
      _$ActivityFacilityWorkflowImpl _value,
      $Res Function(_$ActivityFacilityWorkflowImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? activityFacility = null,
    Object? status = freezed,
    Object? workflow = freezed,
  }) {
    return _then(_$ActivityFacilityWorkflowImpl(
      activityFacility: null == activityFacility
          ? _value.activityFacility
          : activityFacility // ignore: cast_nullable_to_non_nullable
              as ActivityFacility,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
      workflow: freezed == workflow
          ? _value.workflow
          : workflow // ignore: cast_nullable_to_non_nullable
              as Workflow?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ActivityFacilityWorkflowImpl implements _ActivityFacilityWorkflow {
  const _$ActivityFacilityWorkflowImpl(
      {required this.activityFacility,
      this.status,
      @WorkflowFlexConverter() this.workflow});

  factory _$ActivityFacilityWorkflowImpl.fromJson(Map<String, dynamic> json) =>
      _$$ActivityFacilityWorkflowImplFromJson(json);

  @override
  final ActivityFacility activityFacility;
  @override
  final String? status;
  @override
  @WorkflowFlexConverter()
  final Workflow? workflow;

  @override
  String toString() {
    return 'ActivityFacilityWorkflow(activityFacility: $activityFacility, status: $status, workflow: $workflow)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ActivityFacilityWorkflowImpl &&
            (identical(other.activityFacility, activityFacility) ||
                other.activityFacility == activityFacility) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.workflow, workflow) ||
                other.workflow == workflow));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, activityFacility, status, workflow);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$ActivityFacilityWorkflowImplCopyWith<_$ActivityFacilityWorkflowImpl>
      get copyWith => __$$ActivityFacilityWorkflowImplCopyWithImpl<
          _$ActivityFacilityWorkflowImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ActivityFacilityWorkflowImplToJson(
      this,
    );
  }
}

abstract class _ActivityFacilityWorkflow implements ActivityFacilityWorkflow {
  const factory _ActivityFacilityWorkflow(
          {required final ActivityFacility activityFacility,
          final String? status,
          @WorkflowFlexConverter() final Workflow? workflow}) =
      _$ActivityFacilityWorkflowImpl;

  factory _ActivityFacilityWorkflow.fromJson(Map<String, dynamic> json) =
      _$ActivityFacilityWorkflowImpl.fromJson;

  @override
  ActivityFacility get activityFacility;
  @override
  String? get status;
  @override
  @WorkflowFlexConverter()
  Workflow? get workflow;
  @override
  @JsonKey(ignore: true)
  _$$ActivityFacilityWorkflowImplCopyWith<_$ActivityFacilityWorkflowImpl>
      get copyWith => throw _privateConstructorUsedError;
}

Workflow _$WorkflowFromJson(Map<String, dynamic> json) {
  return _Workflow.fromJson(json);
}

/// @nodoc
mixin _$Workflow {
  WorkflowAuditDetails? get auditDetails => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $WorkflowCopyWith<Workflow> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $WorkflowCopyWith<$Res> {
  factory $WorkflowCopyWith(Workflow value, $Res Function(Workflow) then) =
      _$WorkflowCopyWithImpl<$Res, Workflow>;
  @useResult
  $Res call({WorkflowAuditDetails? auditDetails});

  $WorkflowAuditDetailsCopyWith<$Res>? get auditDetails;
}

/// @nodoc
class _$WorkflowCopyWithImpl<$Res, $Val extends Workflow>
    implements $WorkflowCopyWith<$Res> {
  _$WorkflowCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? auditDetails = freezed,
  }) {
    return _then(_value.copyWith(
      auditDetails: freezed == auditDetails
          ? _value.auditDetails
          : auditDetails // ignore: cast_nullable_to_non_nullable
              as WorkflowAuditDetails?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $WorkflowAuditDetailsCopyWith<$Res>? get auditDetails {
    if (_value.auditDetails == null) {
      return null;
    }

    return $WorkflowAuditDetailsCopyWith<$Res>(_value.auditDetails!, (value) {
      return _then(_value.copyWith(auditDetails: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$WorkflowImplCopyWith<$Res>
    implements $WorkflowCopyWith<$Res> {
  factory _$$WorkflowImplCopyWith(
          _$WorkflowImpl value, $Res Function(_$WorkflowImpl) then) =
      __$$WorkflowImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({WorkflowAuditDetails? auditDetails});

  @override
  $WorkflowAuditDetailsCopyWith<$Res>? get auditDetails;
}

/// @nodoc
class __$$WorkflowImplCopyWithImpl<$Res>
    extends _$WorkflowCopyWithImpl<$Res, _$WorkflowImpl>
    implements _$$WorkflowImplCopyWith<$Res> {
  __$$WorkflowImplCopyWithImpl(
      _$WorkflowImpl _value, $Res Function(_$WorkflowImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? auditDetails = freezed,
  }) {
    return _then(_$WorkflowImpl(
      auditDetails: freezed == auditDetails
          ? _value.auditDetails
          : auditDetails // ignore: cast_nullable_to_non_nullable
              as WorkflowAuditDetails?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$WorkflowImpl implements _Workflow {
  const _$WorkflowImpl({this.auditDetails});

  factory _$WorkflowImpl.fromJson(Map<String, dynamic> json) =>
      _$$WorkflowImplFromJson(json);

  @override
  final WorkflowAuditDetails? auditDetails;

  @override
  String toString() {
    return 'Workflow(auditDetails: $auditDetails)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$WorkflowImpl &&
            (identical(other.auditDetails, auditDetails) ||
                other.auditDetails == auditDetails));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, auditDetails);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$WorkflowImplCopyWith<_$WorkflowImpl> get copyWith =>
      __$$WorkflowImplCopyWithImpl<_$WorkflowImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$WorkflowImplToJson(
      this,
    );
  }
}

abstract class _Workflow implements Workflow {
  const factory _Workflow({final WorkflowAuditDetails? auditDetails}) =
      _$WorkflowImpl;

  factory _Workflow.fromJson(Map<String, dynamic> json) =
      _$WorkflowImpl.fromJson;

  @override
  WorkflowAuditDetails? get auditDetails;
  @override
  @JsonKey(ignore: true)
  _$$WorkflowImplCopyWith<_$WorkflowImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

WorkflowAuditDetails _$WorkflowAuditDetailsFromJson(Map<String, dynamic> json) {
  return _WorkflowAuditDetails.fromJson(json);
}

/// @nodoc
mixin _$WorkflowAuditDetails {
  int? get lastModifiedTime => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $WorkflowAuditDetailsCopyWith<WorkflowAuditDetails> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $WorkflowAuditDetailsCopyWith<$Res> {
  factory $WorkflowAuditDetailsCopyWith(WorkflowAuditDetails value,
          $Res Function(WorkflowAuditDetails) then) =
      _$WorkflowAuditDetailsCopyWithImpl<$Res, WorkflowAuditDetails>;
  @useResult
  $Res call({int? lastModifiedTime});
}

/// @nodoc
class _$WorkflowAuditDetailsCopyWithImpl<$Res,
        $Val extends WorkflowAuditDetails>
    implements $WorkflowAuditDetailsCopyWith<$Res> {
  _$WorkflowAuditDetailsCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? lastModifiedTime = freezed,
  }) {
    return _then(_value.copyWith(
      lastModifiedTime: freezed == lastModifiedTime
          ? _value.lastModifiedTime
          : lastModifiedTime // ignore: cast_nullable_to_non_nullable
              as int?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$WorkflowAuditDetailsImplCopyWith<$Res>
    implements $WorkflowAuditDetailsCopyWith<$Res> {
  factory _$$WorkflowAuditDetailsImplCopyWith(_$WorkflowAuditDetailsImpl value,
          $Res Function(_$WorkflowAuditDetailsImpl) then) =
      __$$WorkflowAuditDetailsImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({int? lastModifiedTime});
}

/// @nodoc
class __$$WorkflowAuditDetailsImplCopyWithImpl<$Res>
    extends _$WorkflowAuditDetailsCopyWithImpl<$Res, _$WorkflowAuditDetailsImpl>
    implements _$$WorkflowAuditDetailsImplCopyWith<$Res> {
  __$$WorkflowAuditDetailsImplCopyWithImpl(_$WorkflowAuditDetailsImpl _value,
      $Res Function(_$WorkflowAuditDetailsImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? lastModifiedTime = freezed,
  }) {
    return _then(_$WorkflowAuditDetailsImpl(
      lastModifiedTime: freezed == lastModifiedTime
          ? _value.lastModifiedTime
          : lastModifiedTime // ignore: cast_nullable_to_non_nullable
              as int?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$WorkflowAuditDetailsImpl implements _WorkflowAuditDetails {
  const _$WorkflowAuditDetailsImpl({this.lastModifiedTime});

  factory _$WorkflowAuditDetailsImpl.fromJson(Map<String, dynamic> json) =>
      _$$WorkflowAuditDetailsImplFromJson(json);

  @override
  final int? lastModifiedTime;

  @override
  String toString() {
    return 'WorkflowAuditDetails(lastModifiedTime: $lastModifiedTime)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$WorkflowAuditDetailsImpl &&
            (identical(other.lastModifiedTime, lastModifiedTime) ||
                other.lastModifiedTime == lastModifiedTime));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, lastModifiedTime);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$WorkflowAuditDetailsImplCopyWith<_$WorkflowAuditDetailsImpl>
      get copyWith =>
          __$$WorkflowAuditDetailsImplCopyWithImpl<_$WorkflowAuditDetailsImpl>(
              this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$WorkflowAuditDetailsImplToJson(
      this,
    );
  }
}

abstract class _WorkflowAuditDetails implements WorkflowAuditDetails {
  const factory _WorkflowAuditDetails({final int? lastModifiedTime}) =
      _$WorkflowAuditDetailsImpl;

  factory _WorkflowAuditDetails.fromJson(Map<String, dynamic> json) =
      _$WorkflowAuditDetailsImpl.fromJson;

  @override
  int? get lastModifiedTime;
  @override
  @JsonKey(ignore: true)
  _$$WorkflowAuditDetailsImplCopyWith<_$WorkflowAuditDetailsImpl>
      get copyWith => throw _privateConstructorUsedError;
}
