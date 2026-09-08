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

/// @nodoc
mixin _$ActivityFacilityEvent {
  List<String> get workflowStatuses => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(List<String> workflowStatuses)
        fetchActivityFacilityByWorkflow,
    required TResult Function(String query, List<String> workflowStatuses)
        fetchActivityFacilityBySearch,
    required TResult Function(
            List<String> workflowStatuses, String sortDirection)
        fetchActivityFacilitySorted,
    required TResult Function(List<String> workflowStatuses)
        loadMoreActivityFacility,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(List<String> workflowStatuses)?
        fetchActivityFacilityByWorkflow,
    TResult? Function(String query, List<String> workflowStatuses)?
        fetchActivityFacilityBySearch,
    TResult? Function(List<String> workflowStatuses, String sortDirection)?
        fetchActivityFacilitySorted,
    TResult? Function(List<String> workflowStatuses)? loadMoreActivityFacility,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(List<String> workflowStatuses)?
        fetchActivityFacilityByWorkflow,
    TResult Function(String query, List<String> workflowStatuses)?
        fetchActivityFacilityBySearch,
    TResult Function(List<String> workflowStatuses, String sortDirection)?
        fetchActivityFacilitySorted,
    TResult Function(List<String> workflowStatuses)? loadMoreActivityFacility,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_FetchByWorkflowEvent value)
        fetchActivityFacilityByWorkflow,
    required TResult Function(_FetchBySearchEvent value)
        fetchActivityFacilityBySearch,
    required TResult Function(_FetchSortedEvent value)
        fetchActivityFacilitySorted,
    required TResult Function(_LoadMoreEvent value) loadMoreActivityFacility,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_FetchByWorkflowEvent value)?
        fetchActivityFacilityByWorkflow,
    TResult? Function(_FetchBySearchEvent value)? fetchActivityFacilityBySearch,
    TResult? Function(_FetchSortedEvent value)? fetchActivityFacilitySorted,
    TResult? Function(_LoadMoreEvent value)? loadMoreActivityFacility,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_FetchByWorkflowEvent value)?
        fetchActivityFacilityByWorkflow,
    TResult Function(_FetchBySearchEvent value)? fetchActivityFacilityBySearch,
    TResult Function(_FetchSortedEvent value)? fetchActivityFacilitySorted,
    TResult Function(_LoadMoreEvent value)? loadMoreActivityFacility,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $ActivityFacilityEventCopyWith<ActivityFacilityEvent> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ActivityFacilityEventCopyWith<$Res> {
  factory $ActivityFacilityEventCopyWith(ActivityFacilityEvent value,
          $Res Function(ActivityFacilityEvent) then) =
      _$ActivityFacilityEventCopyWithImpl<$Res, ActivityFacilityEvent>;
  @useResult
  $Res call({List<String> workflowStatuses});
}

/// @nodoc
class _$ActivityFacilityEventCopyWithImpl<$Res,
        $Val extends ActivityFacilityEvent>
    implements $ActivityFacilityEventCopyWith<$Res> {
  _$ActivityFacilityEventCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? workflowStatuses = null,
  }) {
    return _then(_value.copyWith(
      workflowStatuses: null == workflowStatuses
          ? _value.workflowStatuses
          : workflowStatuses // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$FetchByWorkflowEventImplCopyWith<$Res>
    implements $ActivityFacilityEventCopyWith<$Res> {
  factory _$$FetchByWorkflowEventImplCopyWith(_$FetchByWorkflowEventImpl value,
          $Res Function(_$FetchByWorkflowEventImpl) then) =
      __$$FetchByWorkflowEventImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({List<String> workflowStatuses});
}

/// @nodoc
class __$$FetchByWorkflowEventImplCopyWithImpl<$Res>
    extends _$ActivityFacilityEventCopyWithImpl<$Res,
        _$FetchByWorkflowEventImpl>
    implements _$$FetchByWorkflowEventImplCopyWith<$Res> {
  __$$FetchByWorkflowEventImplCopyWithImpl(_$FetchByWorkflowEventImpl _value,
      $Res Function(_$FetchByWorkflowEventImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? workflowStatuses = null,
  }) {
    return _then(_$FetchByWorkflowEventImpl(
      workflowStatuses: null == workflowStatuses
          ? _value._workflowStatuses
          : workflowStatuses // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc

class _$FetchByWorkflowEventImpl implements _FetchByWorkflowEvent {
  const _$FetchByWorkflowEventImpl(
      {required final List<String> workflowStatuses})
      : _workflowStatuses = workflowStatuses;

  final List<String> _workflowStatuses;
  @override
  List<String> get workflowStatuses {
    if (_workflowStatuses is EqualUnmodifiableListView)
      return _workflowStatuses;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_workflowStatuses);
  }

  @override
  String toString() {
    return 'ActivityFacilityEvent.fetchActivityFacilityByWorkflow(workflowStatuses: $workflowStatuses)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FetchByWorkflowEventImpl &&
            const DeepCollectionEquality()
                .equals(other._workflowStatuses, _workflowStatuses));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType, const DeepCollectionEquality().hash(_workflowStatuses));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$FetchByWorkflowEventImplCopyWith<_$FetchByWorkflowEventImpl>
      get copyWith =>
          __$$FetchByWorkflowEventImplCopyWithImpl<_$FetchByWorkflowEventImpl>(
              this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(List<String> workflowStatuses)
        fetchActivityFacilityByWorkflow,
    required TResult Function(String query, List<String> workflowStatuses)
        fetchActivityFacilityBySearch,
    required TResult Function(
            List<String> workflowStatuses, String sortDirection)
        fetchActivityFacilitySorted,
    required TResult Function(List<String> workflowStatuses)
        loadMoreActivityFacility,
  }) {
    return fetchActivityFacilityByWorkflow(workflowStatuses);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(List<String> workflowStatuses)?
        fetchActivityFacilityByWorkflow,
    TResult? Function(String query, List<String> workflowStatuses)?
        fetchActivityFacilityBySearch,
    TResult? Function(List<String> workflowStatuses, String sortDirection)?
        fetchActivityFacilitySorted,
    TResult? Function(List<String> workflowStatuses)? loadMoreActivityFacility,
  }) {
    return fetchActivityFacilityByWorkflow?.call(workflowStatuses);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(List<String> workflowStatuses)?
        fetchActivityFacilityByWorkflow,
    TResult Function(String query, List<String> workflowStatuses)?
        fetchActivityFacilityBySearch,
    TResult Function(List<String> workflowStatuses, String sortDirection)?
        fetchActivityFacilitySorted,
    TResult Function(List<String> workflowStatuses)? loadMoreActivityFacility,
    required TResult orElse(),
  }) {
    if (fetchActivityFacilityByWorkflow != null) {
      return fetchActivityFacilityByWorkflow(workflowStatuses);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_FetchByWorkflowEvent value)
        fetchActivityFacilityByWorkflow,
    required TResult Function(_FetchBySearchEvent value)
        fetchActivityFacilityBySearch,
    required TResult Function(_FetchSortedEvent value)
        fetchActivityFacilitySorted,
    required TResult Function(_LoadMoreEvent value) loadMoreActivityFacility,
  }) {
    return fetchActivityFacilityByWorkflow(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_FetchByWorkflowEvent value)?
        fetchActivityFacilityByWorkflow,
    TResult? Function(_FetchBySearchEvent value)? fetchActivityFacilityBySearch,
    TResult? Function(_FetchSortedEvent value)? fetchActivityFacilitySorted,
    TResult? Function(_LoadMoreEvent value)? loadMoreActivityFacility,
  }) {
    return fetchActivityFacilityByWorkflow?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_FetchByWorkflowEvent value)?
        fetchActivityFacilityByWorkflow,
    TResult Function(_FetchBySearchEvent value)? fetchActivityFacilityBySearch,
    TResult Function(_FetchSortedEvent value)? fetchActivityFacilitySorted,
    TResult Function(_LoadMoreEvent value)? loadMoreActivityFacility,
    required TResult orElse(),
  }) {
    if (fetchActivityFacilityByWorkflow != null) {
      return fetchActivityFacilityByWorkflow(this);
    }
    return orElse();
  }
}

abstract class _FetchByWorkflowEvent implements ActivityFacilityEvent {
  const factory _FetchByWorkflowEvent(
          {required final List<String> workflowStatuses}) =
      _$FetchByWorkflowEventImpl;

  @override
  List<String> get workflowStatuses;
  @override
  @JsonKey(ignore: true)
  _$$FetchByWorkflowEventImplCopyWith<_$FetchByWorkflowEventImpl>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$FetchBySearchEventImplCopyWith<$Res>
    implements $ActivityFacilityEventCopyWith<$Res> {
  factory _$$FetchBySearchEventImplCopyWith(_$FetchBySearchEventImpl value,
          $Res Function(_$FetchBySearchEventImpl) then) =
      __$$FetchBySearchEventImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String query, List<String> workflowStatuses});
}

/// @nodoc
class __$$FetchBySearchEventImplCopyWithImpl<$Res>
    extends _$ActivityFacilityEventCopyWithImpl<$Res, _$FetchBySearchEventImpl>
    implements _$$FetchBySearchEventImplCopyWith<$Res> {
  __$$FetchBySearchEventImplCopyWithImpl(_$FetchBySearchEventImpl _value,
      $Res Function(_$FetchBySearchEventImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? query = null,
    Object? workflowStatuses = null,
  }) {
    return _then(_$FetchBySearchEventImpl(
      query: null == query
          ? _value.query
          : query // ignore: cast_nullable_to_non_nullable
              as String,
      workflowStatuses: null == workflowStatuses
          ? _value._workflowStatuses
          : workflowStatuses // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc

class _$FetchBySearchEventImpl implements _FetchBySearchEvent {
  const _$FetchBySearchEventImpl(
      {required this.query, required final List<String> workflowStatuses})
      : _workflowStatuses = workflowStatuses;

  @override
  final String query;
  final List<String> _workflowStatuses;
  @override
  List<String> get workflowStatuses {
    if (_workflowStatuses is EqualUnmodifiableListView)
      return _workflowStatuses;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_workflowStatuses);
  }

  @override
  String toString() {
    return 'ActivityFacilityEvent.fetchActivityFacilityBySearch(query: $query, workflowStatuses: $workflowStatuses)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FetchBySearchEventImpl &&
            (identical(other.query, query) || other.query == query) &&
            const DeepCollectionEquality()
                .equals(other._workflowStatuses, _workflowStatuses));
  }

  @override
  int get hashCode => Object.hash(runtimeType, query,
      const DeepCollectionEquality().hash(_workflowStatuses));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$FetchBySearchEventImplCopyWith<_$FetchBySearchEventImpl> get copyWith =>
      __$$FetchBySearchEventImplCopyWithImpl<_$FetchBySearchEventImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(List<String> workflowStatuses)
        fetchActivityFacilityByWorkflow,
    required TResult Function(String query, List<String> workflowStatuses)
        fetchActivityFacilityBySearch,
    required TResult Function(
            List<String> workflowStatuses, String sortDirection)
        fetchActivityFacilitySorted,
    required TResult Function(List<String> workflowStatuses)
        loadMoreActivityFacility,
  }) {
    return fetchActivityFacilityBySearch(query, workflowStatuses);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(List<String> workflowStatuses)?
        fetchActivityFacilityByWorkflow,
    TResult? Function(String query, List<String> workflowStatuses)?
        fetchActivityFacilityBySearch,
    TResult? Function(List<String> workflowStatuses, String sortDirection)?
        fetchActivityFacilitySorted,
    TResult? Function(List<String> workflowStatuses)? loadMoreActivityFacility,
  }) {
    return fetchActivityFacilityBySearch?.call(query, workflowStatuses);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(List<String> workflowStatuses)?
        fetchActivityFacilityByWorkflow,
    TResult Function(String query, List<String> workflowStatuses)?
        fetchActivityFacilityBySearch,
    TResult Function(List<String> workflowStatuses, String sortDirection)?
        fetchActivityFacilitySorted,
    TResult Function(List<String> workflowStatuses)? loadMoreActivityFacility,
    required TResult orElse(),
  }) {
    if (fetchActivityFacilityBySearch != null) {
      return fetchActivityFacilityBySearch(query, workflowStatuses);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_FetchByWorkflowEvent value)
        fetchActivityFacilityByWorkflow,
    required TResult Function(_FetchBySearchEvent value)
        fetchActivityFacilityBySearch,
    required TResult Function(_FetchSortedEvent value)
        fetchActivityFacilitySorted,
    required TResult Function(_LoadMoreEvent value) loadMoreActivityFacility,
  }) {
    return fetchActivityFacilityBySearch(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_FetchByWorkflowEvent value)?
        fetchActivityFacilityByWorkflow,
    TResult? Function(_FetchBySearchEvent value)? fetchActivityFacilityBySearch,
    TResult? Function(_FetchSortedEvent value)? fetchActivityFacilitySorted,
    TResult? Function(_LoadMoreEvent value)? loadMoreActivityFacility,
  }) {
    return fetchActivityFacilityBySearch?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_FetchByWorkflowEvent value)?
        fetchActivityFacilityByWorkflow,
    TResult Function(_FetchBySearchEvent value)? fetchActivityFacilityBySearch,
    TResult Function(_FetchSortedEvent value)? fetchActivityFacilitySorted,
    TResult Function(_LoadMoreEvent value)? loadMoreActivityFacility,
    required TResult orElse(),
  }) {
    if (fetchActivityFacilityBySearch != null) {
      return fetchActivityFacilityBySearch(this);
    }
    return orElse();
  }
}

abstract class _FetchBySearchEvent implements ActivityFacilityEvent {
  const factory _FetchBySearchEvent(
      {required final String query,
      required final List<String> workflowStatuses}) = _$FetchBySearchEventImpl;

  String get query;
  @override
  List<String> get workflowStatuses;
  @override
  @JsonKey(ignore: true)
  _$$FetchBySearchEventImplCopyWith<_$FetchBySearchEventImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$FetchSortedEventImplCopyWith<$Res>
    implements $ActivityFacilityEventCopyWith<$Res> {
  factory _$$FetchSortedEventImplCopyWith(_$FetchSortedEventImpl value,
          $Res Function(_$FetchSortedEventImpl) then) =
      __$$FetchSortedEventImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({List<String> workflowStatuses, String sortDirection});
}

/// @nodoc
class __$$FetchSortedEventImplCopyWithImpl<$Res>
    extends _$ActivityFacilityEventCopyWithImpl<$Res, _$FetchSortedEventImpl>
    implements _$$FetchSortedEventImplCopyWith<$Res> {
  __$$FetchSortedEventImplCopyWithImpl(_$FetchSortedEventImpl _value,
      $Res Function(_$FetchSortedEventImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? workflowStatuses = null,
    Object? sortDirection = null,
  }) {
    return _then(_$FetchSortedEventImpl(
      workflowStatuses: null == workflowStatuses
          ? _value._workflowStatuses
          : workflowStatuses // ignore: cast_nullable_to_non_nullable
              as List<String>,
      sortDirection: null == sortDirection
          ? _value.sortDirection
          : sortDirection // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc

class _$FetchSortedEventImpl implements _FetchSortedEvent {
  const _$FetchSortedEventImpl(
      {required final List<String> workflowStatuses,
      required this.sortDirection})
      : _workflowStatuses = workflowStatuses;

  final List<String> _workflowStatuses;
  @override
  List<String> get workflowStatuses {
    if (_workflowStatuses is EqualUnmodifiableListView)
      return _workflowStatuses;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_workflowStatuses);
  }

  @override
  final String sortDirection;

  @override
  String toString() {
    return 'ActivityFacilityEvent.fetchActivityFacilitySorted(workflowStatuses: $workflowStatuses, sortDirection: $sortDirection)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FetchSortedEventImpl &&
            const DeepCollectionEquality()
                .equals(other._workflowStatuses, _workflowStatuses) &&
            (identical(other.sortDirection, sortDirection) ||
                other.sortDirection == sortDirection));
  }

  @override
  int get hashCode => Object.hash(runtimeType,
      const DeepCollectionEquality().hash(_workflowStatuses), sortDirection);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$FetchSortedEventImplCopyWith<_$FetchSortedEventImpl> get copyWith =>
      __$$FetchSortedEventImplCopyWithImpl<_$FetchSortedEventImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(List<String> workflowStatuses)
        fetchActivityFacilityByWorkflow,
    required TResult Function(String query, List<String> workflowStatuses)
        fetchActivityFacilityBySearch,
    required TResult Function(
            List<String> workflowStatuses, String sortDirection)
        fetchActivityFacilitySorted,
    required TResult Function(List<String> workflowStatuses)
        loadMoreActivityFacility,
  }) {
    return fetchActivityFacilitySorted(workflowStatuses, sortDirection);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(List<String> workflowStatuses)?
        fetchActivityFacilityByWorkflow,
    TResult? Function(String query, List<String> workflowStatuses)?
        fetchActivityFacilityBySearch,
    TResult? Function(List<String> workflowStatuses, String sortDirection)?
        fetchActivityFacilitySorted,
    TResult? Function(List<String> workflowStatuses)? loadMoreActivityFacility,
  }) {
    return fetchActivityFacilitySorted?.call(workflowStatuses, sortDirection);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(List<String> workflowStatuses)?
        fetchActivityFacilityByWorkflow,
    TResult Function(String query, List<String> workflowStatuses)?
        fetchActivityFacilityBySearch,
    TResult Function(List<String> workflowStatuses, String sortDirection)?
        fetchActivityFacilitySorted,
    TResult Function(List<String> workflowStatuses)? loadMoreActivityFacility,
    required TResult orElse(),
  }) {
    if (fetchActivityFacilitySorted != null) {
      return fetchActivityFacilitySorted(workflowStatuses, sortDirection);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_FetchByWorkflowEvent value)
        fetchActivityFacilityByWorkflow,
    required TResult Function(_FetchBySearchEvent value)
        fetchActivityFacilityBySearch,
    required TResult Function(_FetchSortedEvent value)
        fetchActivityFacilitySorted,
    required TResult Function(_LoadMoreEvent value) loadMoreActivityFacility,
  }) {
    return fetchActivityFacilitySorted(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_FetchByWorkflowEvent value)?
        fetchActivityFacilityByWorkflow,
    TResult? Function(_FetchBySearchEvent value)? fetchActivityFacilityBySearch,
    TResult? Function(_FetchSortedEvent value)? fetchActivityFacilitySorted,
    TResult? Function(_LoadMoreEvent value)? loadMoreActivityFacility,
  }) {
    return fetchActivityFacilitySorted?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_FetchByWorkflowEvent value)?
        fetchActivityFacilityByWorkflow,
    TResult Function(_FetchBySearchEvent value)? fetchActivityFacilityBySearch,
    TResult Function(_FetchSortedEvent value)? fetchActivityFacilitySorted,
    TResult Function(_LoadMoreEvent value)? loadMoreActivityFacility,
    required TResult orElse(),
  }) {
    if (fetchActivityFacilitySorted != null) {
      return fetchActivityFacilitySorted(this);
    }
    return orElse();
  }
}

abstract class _FetchSortedEvent implements ActivityFacilityEvent {
  const factory _FetchSortedEvent(
      {required final List<String> workflowStatuses,
      required final String sortDirection}) = _$FetchSortedEventImpl;

  @override
  List<String> get workflowStatuses;
  String get sortDirection;
  @override
  @JsonKey(ignore: true)
  _$$FetchSortedEventImplCopyWith<_$FetchSortedEventImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$LoadMoreEventImplCopyWith<$Res>
    implements $ActivityFacilityEventCopyWith<$Res> {
  factory _$$LoadMoreEventImplCopyWith(
          _$LoadMoreEventImpl value, $Res Function(_$LoadMoreEventImpl) then) =
      __$$LoadMoreEventImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({List<String> workflowStatuses});
}

/// @nodoc
class __$$LoadMoreEventImplCopyWithImpl<$Res>
    extends _$ActivityFacilityEventCopyWithImpl<$Res, _$LoadMoreEventImpl>
    implements _$$LoadMoreEventImplCopyWith<$Res> {
  __$$LoadMoreEventImplCopyWithImpl(
      _$LoadMoreEventImpl _value, $Res Function(_$LoadMoreEventImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? workflowStatuses = null,
  }) {
    return _then(_$LoadMoreEventImpl(
      workflowStatuses: null == workflowStatuses
          ? _value._workflowStatuses
          : workflowStatuses // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc

class _$LoadMoreEventImpl implements _LoadMoreEvent {
  const _$LoadMoreEventImpl({required final List<String> workflowStatuses})
      : _workflowStatuses = workflowStatuses;

  final List<String> _workflowStatuses;
  @override
  List<String> get workflowStatuses {
    if (_workflowStatuses is EqualUnmodifiableListView)
      return _workflowStatuses;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_workflowStatuses);
  }

  @override
  String toString() {
    return 'ActivityFacilityEvent.loadMoreActivityFacility(workflowStatuses: $workflowStatuses)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LoadMoreEventImpl &&
            const DeepCollectionEquality()
                .equals(other._workflowStatuses, _workflowStatuses));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType, const DeepCollectionEquality().hash(_workflowStatuses));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$LoadMoreEventImplCopyWith<_$LoadMoreEventImpl> get copyWith =>
      __$$LoadMoreEventImplCopyWithImpl<_$LoadMoreEventImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(List<String> workflowStatuses)
        fetchActivityFacilityByWorkflow,
    required TResult Function(String query, List<String> workflowStatuses)
        fetchActivityFacilityBySearch,
    required TResult Function(
            List<String> workflowStatuses, String sortDirection)
        fetchActivityFacilitySorted,
    required TResult Function(List<String> workflowStatuses)
        loadMoreActivityFacility,
  }) {
    return loadMoreActivityFacility(workflowStatuses);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(List<String> workflowStatuses)?
        fetchActivityFacilityByWorkflow,
    TResult? Function(String query, List<String> workflowStatuses)?
        fetchActivityFacilityBySearch,
    TResult? Function(List<String> workflowStatuses, String sortDirection)?
        fetchActivityFacilitySorted,
    TResult? Function(List<String> workflowStatuses)? loadMoreActivityFacility,
  }) {
    return loadMoreActivityFacility?.call(workflowStatuses);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(List<String> workflowStatuses)?
        fetchActivityFacilityByWorkflow,
    TResult Function(String query, List<String> workflowStatuses)?
        fetchActivityFacilityBySearch,
    TResult Function(List<String> workflowStatuses, String sortDirection)?
        fetchActivityFacilitySorted,
    TResult Function(List<String> workflowStatuses)? loadMoreActivityFacility,
    required TResult orElse(),
  }) {
    if (loadMoreActivityFacility != null) {
      return loadMoreActivityFacility(workflowStatuses);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_FetchByWorkflowEvent value)
        fetchActivityFacilityByWorkflow,
    required TResult Function(_FetchBySearchEvent value)
        fetchActivityFacilityBySearch,
    required TResult Function(_FetchSortedEvent value)
        fetchActivityFacilitySorted,
    required TResult Function(_LoadMoreEvent value) loadMoreActivityFacility,
  }) {
    return loadMoreActivityFacility(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_FetchByWorkflowEvent value)?
        fetchActivityFacilityByWorkflow,
    TResult? Function(_FetchBySearchEvent value)? fetchActivityFacilityBySearch,
    TResult? Function(_FetchSortedEvent value)? fetchActivityFacilitySorted,
    TResult? Function(_LoadMoreEvent value)? loadMoreActivityFacility,
  }) {
    return loadMoreActivityFacility?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_FetchByWorkflowEvent value)?
        fetchActivityFacilityByWorkflow,
    TResult Function(_FetchBySearchEvent value)? fetchActivityFacilityBySearch,
    TResult Function(_FetchSortedEvent value)? fetchActivityFacilitySorted,
    TResult Function(_LoadMoreEvent value)? loadMoreActivityFacility,
    required TResult orElse(),
  }) {
    if (loadMoreActivityFacility != null) {
      return loadMoreActivityFacility(this);
    }
    return orElse();
  }
}

abstract class _LoadMoreEvent implements ActivityFacilityEvent {
  const factory _LoadMoreEvent({required final List<String> workflowStatuses}) =
      _$LoadMoreEventImpl;

  @override
  List<String> get workflowStatuses;
  @override
  @JsonKey(ignore: true)
  _$$LoadMoreEventImplCopyWith<_$LoadMoreEventImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$ActivityFacilityState {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function() searchLoading,
    required TResult Function(List<ActivityFacilityWorkflow> items,
            bool hasMore, int totalCount, bool fromCache, bool isLoadingMore)
        paginatedLoaded,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function()? searchLoading,
    TResult? Function(List<ActivityFacilityWorkflow> items, bool hasMore,
            int totalCount, bool fromCache, bool isLoadingMore)?
        paginatedLoaded,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function()? searchLoading,
    TResult Function(List<ActivityFacilityWorkflow> items, bool hasMore,
            int totalCount, bool fromCache, bool isLoadingMore)?
        paginatedLoaded,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_Initial value) initial,
    required TResult Function(_Loading value) loading,
    required TResult Function(_SearchLoading value) searchLoading,
    required TResult Function(_PaginatedLoaded value) paginatedLoaded,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_Initial value)? initial,
    TResult? Function(_Loading value)? loading,
    TResult? Function(_SearchLoading value)? searchLoading,
    TResult? Function(_PaginatedLoaded value)? paginatedLoaded,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_Initial value)? initial,
    TResult Function(_Loading value)? loading,
    TResult Function(_SearchLoading value)? searchLoading,
    TResult Function(_PaginatedLoaded value)? paginatedLoaded,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ActivityFacilityStateCopyWith<$Res> {
  factory $ActivityFacilityStateCopyWith(ActivityFacilityState value,
          $Res Function(ActivityFacilityState) then) =
      _$ActivityFacilityStateCopyWithImpl<$Res, ActivityFacilityState>;
}

/// @nodoc
class _$ActivityFacilityStateCopyWithImpl<$Res,
        $Val extends ActivityFacilityState>
    implements $ActivityFacilityStateCopyWith<$Res> {
  _$ActivityFacilityStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;
}

/// @nodoc
abstract class _$$InitialImplCopyWith<$Res> {
  factory _$$InitialImplCopyWith(
          _$InitialImpl value, $Res Function(_$InitialImpl) then) =
      __$$InitialImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$InitialImplCopyWithImpl<$Res>
    extends _$ActivityFacilityStateCopyWithImpl<$Res, _$InitialImpl>
    implements _$$InitialImplCopyWith<$Res> {
  __$$InitialImplCopyWithImpl(
      _$InitialImpl _value, $Res Function(_$InitialImpl) _then)
      : super(_value, _then);
}

/// @nodoc

class _$InitialImpl implements _Initial {
  const _$InitialImpl();

  @override
  String toString() {
    return 'ActivityFacilityState.initial()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$InitialImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function() searchLoading,
    required TResult Function(List<ActivityFacilityWorkflow> items,
            bool hasMore, int totalCount, bool fromCache, bool isLoadingMore)
        paginatedLoaded,
  }) {
    return initial();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function()? searchLoading,
    TResult? Function(List<ActivityFacilityWorkflow> items, bool hasMore,
            int totalCount, bool fromCache, bool isLoadingMore)?
        paginatedLoaded,
  }) {
    return initial?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function()? searchLoading,
    TResult Function(List<ActivityFacilityWorkflow> items, bool hasMore,
            int totalCount, bool fromCache, bool isLoadingMore)?
        paginatedLoaded,
    required TResult orElse(),
  }) {
    if (initial != null) {
      return initial();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_Initial value) initial,
    required TResult Function(_Loading value) loading,
    required TResult Function(_SearchLoading value) searchLoading,
    required TResult Function(_PaginatedLoaded value) paginatedLoaded,
  }) {
    return initial(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_Initial value)? initial,
    TResult? Function(_Loading value)? loading,
    TResult? Function(_SearchLoading value)? searchLoading,
    TResult? Function(_PaginatedLoaded value)? paginatedLoaded,
  }) {
    return initial?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_Initial value)? initial,
    TResult Function(_Loading value)? loading,
    TResult Function(_SearchLoading value)? searchLoading,
    TResult Function(_PaginatedLoaded value)? paginatedLoaded,
    required TResult orElse(),
  }) {
    if (initial != null) {
      return initial(this);
    }
    return orElse();
  }
}

abstract class _Initial implements ActivityFacilityState {
  const factory _Initial() = _$InitialImpl;
}

/// @nodoc
abstract class _$$LoadingImplCopyWith<$Res> {
  factory _$$LoadingImplCopyWith(
          _$LoadingImpl value, $Res Function(_$LoadingImpl) then) =
      __$$LoadingImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$LoadingImplCopyWithImpl<$Res>
    extends _$ActivityFacilityStateCopyWithImpl<$Res, _$LoadingImpl>
    implements _$$LoadingImplCopyWith<$Res> {
  __$$LoadingImplCopyWithImpl(
      _$LoadingImpl _value, $Res Function(_$LoadingImpl) _then)
      : super(_value, _then);
}

/// @nodoc

class _$LoadingImpl implements _Loading {
  const _$LoadingImpl();

  @override
  String toString() {
    return 'ActivityFacilityState.loading()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$LoadingImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function() searchLoading,
    required TResult Function(List<ActivityFacilityWorkflow> items,
            bool hasMore, int totalCount, bool fromCache, bool isLoadingMore)
        paginatedLoaded,
  }) {
    return loading();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function()? searchLoading,
    TResult? Function(List<ActivityFacilityWorkflow> items, bool hasMore,
            int totalCount, bool fromCache, bool isLoadingMore)?
        paginatedLoaded,
  }) {
    return loading?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function()? searchLoading,
    TResult Function(List<ActivityFacilityWorkflow> items, bool hasMore,
            int totalCount, bool fromCache, bool isLoadingMore)?
        paginatedLoaded,
    required TResult orElse(),
  }) {
    if (loading != null) {
      return loading();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_Initial value) initial,
    required TResult Function(_Loading value) loading,
    required TResult Function(_SearchLoading value) searchLoading,
    required TResult Function(_PaginatedLoaded value) paginatedLoaded,
  }) {
    return loading(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_Initial value)? initial,
    TResult? Function(_Loading value)? loading,
    TResult? Function(_SearchLoading value)? searchLoading,
    TResult? Function(_PaginatedLoaded value)? paginatedLoaded,
  }) {
    return loading?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_Initial value)? initial,
    TResult Function(_Loading value)? loading,
    TResult Function(_SearchLoading value)? searchLoading,
    TResult Function(_PaginatedLoaded value)? paginatedLoaded,
    required TResult orElse(),
  }) {
    if (loading != null) {
      return loading(this);
    }
    return orElse();
  }
}

abstract class _Loading implements ActivityFacilityState {
  const factory _Loading() = _$LoadingImpl;
}

/// @nodoc
abstract class _$$SearchLoadingImplCopyWith<$Res> {
  factory _$$SearchLoadingImplCopyWith(
          _$SearchLoadingImpl value, $Res Function(_$SearchLoadingImpl) then) =
      __$$SearchLoadingImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$SearchLoadingImplCopyWithImpl<$Res>
    extends _$ActivityFacilityStateCopyWithImpl<$Res, _$SearchLoadingImpl>
    implements _$$SearchLoadingImplCopyWith<$Res> {
  __$$SearchLoadingImplCopyWithImpl(
      _$SearchLoadingImpl _value, $Res Function(_$SearchLoadingImpl) _then)
      : super(_value, _then);
}

/// @nodoc

class _$SearchLoadingImpl implements _SearchLoading {
  const _$SearchLoadingImpl();

  @override
  String toString() {
    return 'ActivityFacilityState.searchLoading()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$SearchLoadingImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function() searchLoading,
    required TResult Function(List<ActivityFacilityWorkflow> items,
            bool hasMore, int totalCount, bool fromCache, bool isLoadingMore)
        paginatedLoaded,
  }) {
    return searchLoading();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function()? searchLoading,
    TResult? Function(List<ActivityFacilityWorkflow> items, bool hasMore,
            int totalCount, bool fromCache, bool isLoadingMore)?
        paginatedLoaded,
  }) {
    return searchLoading?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function()? searchLoading,
    TResult Function(List<ActivityFacilityWorkflow> items, bool hasMore,
            int totalCount, bool fromCache, bool isLoadingMore)?
        paginatedLoaded,
    required TResult orElse(),
  }) {
    if (searchLoading != null) {
      return searchLoading();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_Initial value) initial,
    required TResult Function(_Loading value) loading,
    required TResult Function(_SearchLoading value) searchLoading,
    required TResult Function(_PaginatedLoaded value) paginatedLoaded,
  }) {
    return searchLoading(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_Initial value)? initial,
    TResult? Function(_Loading value)? loading,
    TResult? Function(_SearchLoading value)? searchLoading,
    TResult? Function(_PaginatedLoaded value)? paginatedLoaded,
  }) {
    return searchLoading?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_Initial value)? initial,
    TResult Function(_Loading value)? loading,
    TResult Function(_SearchLoading value)? searchLoading,
    TResult Function(_PaginatedLoaded value)? paginatedLoaded,
    required TResult orElse(),
  }) {
    if (searchLoading != null) {
      return searchLoading(this);
    }
    return orElse();
  }
}

abstract class _SearchLoading implements ActivityFacilityState {
  const factory _SearchLoading() = _$SearchLoadingImpl;
}

/// @nodoc
abstract class _$$PaginatedLoadedImplCopyWith<$Res> {
  factory _$$PaginatedLoadedImplCopyWith(_$PaginatedLoadedImpl value,
          $Res Function(_$PaginatedLoadedImpl) then) =
      __$$PaginatedLoadedImplCopyWithImpl<$Res>;
  @useResult
  $Res call(
      {List<ActivityFacilityWorkflow> items,
      bool hasMore,
      int totalCount,
      bool fromCache,
      bool isLoadingMore});
}

/// @nodoc
class __$$PaginatedLoadedImplCopyWithImpl<$Res>
    extends _$ActivityFacilityStateCopyWithImpl<$Res, _$PaginatedLoadedImpl>
    implements _$$PaginatedLoadedImplCopyWith<$Res> {
  __$$PaginatedLoadedImplCopyWithImpl(
      _$PaginatedLoadedImpl _value, $Res Function(_$PaginatedLoadedImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? items = null,
    Object? hasMore = null,
    Object? totalCount = null,
    Object? fromCache = null,
    Object? isLoadingMore = null,
  }) {
    return _then(_$PaginatedLoadedImpl(
      items: null == items
          ? _value._items
          : items // ignore: cast_nullable_to_non_nullable
              as List<ActivityFacilityWorkflow>,
      hasMore: null == hasMore
          ? _value.hasMore
          : hasMore // ignore: cast_nullable_to_non_nullable
              as bool,
      totalCount: null == totalCount
          ? _value.totalCount
          : totalCount // ignore: cast_nullable_to_non_nullable
              as int,
      fromCache: null == fromCache
          ? _value.fromCache
          : fromCache // ignore: cast_nullable_to_non_nullable
              as bool,
      isLoadingMore: null == isLoadingMore
          ? _value.isLoadingMore
          : isLoadingMore // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc

class _$PaginatedLoadedImpl implements _PaginatedLoaded {
  const _$PaginatedLoadedImpl(
      {required final List<ActivityFacilityWorkflow> items,
      required this.hasMore,
      required this.totalCount,
      this.fromCache = false,
      this.isLoadingMore = false})
      : _items = items;

  final List<ActivityFacilityWorkflow> _items;
  @override
  List<ActivityFacilityWorkflow> get items {
    if (_items is EqualUnmodifiableListView) return _items;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_items);
  }

  @override
  final bool hasMore;
  @override
  final int totalCount;
  @override
  @JsonKey()
  final bool fromCache;
  @override
  @JsonKey()
  final bool isLoadingMore;

  @override
  String toString() {
    return 'ActivityFacilityState.paginatedLoaded(items: $items, hasMore: $hasMore, totalCount: $totalCount, fromCache: $fromCache, isLoadingMore: $isLoadingMore)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PaginatedLoadedImpl &&
            const DeepCollectionEquality().equals(other._items, _items) &&
            (identical(other.hasMore, hasMore) || other.hasMore == hasMore) &&
            (identical(other.totalCount, totalCount) ||
                other.totalCount == totalCount) &&
            (identical(other.fromCache, fromCache) ||
                other.fromCache == fromCache) &&
            (identical(other.isLoadingMore, isLoadingMore) ||
                other.isLoadingMore == isLoadingMore));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_items),
      hasMore,
      totalCount,
      fromCache,
      isLoadingMore);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$PaginatedLoadedImplCopyWith<_$PaginatedLoadedImpl> get copyWith =>
      __$$PaginatedLoadedImplCopyWithImpl<_$PaginatedLoadedImpl>(
          this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function() searchLoading,
    required TResult Function(List<ActivityFacilityWorkflow> items,
            bool hasMore, int totalCount, bool fromCache, bool isLoadingMore)
        paginatedLoaded,
  }) {
    return paginatedLoaded(
        items, hasMore, totalCount, fromCache, isLoadingMore);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function()? searchLoading,
    TResult? Function(List<ActivityFacilityWorkflow> items, bool hasMore,
            int totalCount, bool fromCache, bool isLoadingMore)?
        paginatedLoaded,
  }) {
    return paginatedLoaded?.call(
        items, hasMore, totalCount, fromCache, isLoadingMore);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function()? searchLoading,
    TResult Function(List<ActivityFacilityWorkflow> items, bool hasMore,
            int totalCount, bool fromCache, bool isLoadingMore)?
        paginatedLoaded,
    required TResult orElse(),
  }) {
    if (paginatedLoaded != null) {
      return paginatedLoaded(
          items, hasMore, totalCount, fromCache, isLoadingMore);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_Initial value) initial,
    required TResult Function(_Loading value) loading,
    required TResult Function(_SearchLoading value) searchLoading,
    required TResult Function(_PaginatedLoaded value) paginatedLoaded,
  }) {
    return paginatedLoaded(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_Initial value)? initial,
    TResult? Function(_Loading value)? loading,
    TResult? Function(_SearchLoading value)? searchLoading,
    TResult? Function(_PaginatedLoaded value)? paginatedLoaded,
  }) {
    return paginatedLoaded?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_Initial value)? initial,
    TResult Function(_Loading value)? loading,
    TResult Function(_SearchLoading value)? searchLoading,
    TResult Function(_PaginatedLoaded value)? paginatedLoaded,
    required TResult orElse(),
  }) {
    if (paginatedLoaded != null) {
      return paginatedLoaded(this);
    }
    return orElse();
  }
}

abstract class _PaginatedLoaded implements ActivityFacilityState {
  const factory _PaginatedLoaded(
      {required final List<ActivityFacilityWorkflow> items,
      required final bool hasMore,
      required final int totalCount,
      final bool fromCache,
      final bool isLoadingMore}) = _$PaginatedLoadedImpl;

  List<ActivityFacilityWorkflow> get items;
  bool get hasMore;
  int get totalCount;
  bool get fromCache;
  bool get isLoadingMore;
  @JsonKey(ignore: true)
  _$$PaginatedLoadedImplCopyWith<_$PaginatedLoadedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
