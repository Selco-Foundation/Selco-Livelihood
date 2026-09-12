// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'item_code.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

ItemCode _$ItemCodeFromJson(Map<String, dynamic> json) {
  return _ItemCode.fromJson(json);
}

/// @nodoc
mixin _$ItemCode {
  String get code => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  bool get active => throw _privateConstructorUsedError;
  String get category => throw _privateConstructorUsedError;
  bool get solarAsset => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $ItemCodeCopyWith<ItemCode> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ItemCodeCopyWith<$Res> {
  factory $ItemCodeCopyWith(ItemCode value, $Res Function(ItemCode) then) =
      _$ItemCodeCopyWithImpl<$Res, ItemCode>;
  @useResult
  $Res call(
      {String code,
      String name,
      bool active,
      String category,
      bool solarAsset});
}

/// @nodoc
class _$ItemCodeCopyWithImpl<$Res, $Val extends ItemCode>
    implements $ItemCodeCopyWith<$Res> {
  _$ItemCodeCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? code = null,
    Object? name = null,
    Object? active = null,
    Object? category = null,
    Object? solarAsset = null,
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
      active: null == active
          ? _value.active
          : active // ignore: cast_nullable_to_non_nullable
              as bool,
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as String,
      solarAsset: null == solarAsset
          ? _value.solarAsset
          : solarAsset // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ItemCodeImplCopyWith<$Res>
    implements $ItemCodeCopyWith<$Res> {
  factory _$$ItemCodeImplCopyWith(
          _$ItemCodeImpl value, $Res Function(_$ItemCodeImpl) then) =
      __$$ItemCodeImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String code,
      String name,
      bool active,
      String category,
      bool solarAsset});
}

/// @nodoc
class __$$ItemCodeImplCopyWithImpl<$Res>
    extends _$ItemCodeCopyWithImpl<$Res, _$ItemCodeImpl>
    implements _$$ItemCodeImplCopyWith<$Res> {
  __$$ItemCodeImplCopyWithImpl(
      _$ItemCodeImpl _value, $Res Function(_$ItemCodeImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? code = null,
    Object? name = null,
    Object? active = null,
    Object? category = null,
    Object? solarAsset = null,
  }) {
    return _then(_$ItemCodeImpl(
      code: null == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      active: null == active
          ? _value.active
          : active // ignore: cast_nullable_to_non_nullable
              as bool,
      category: null == category
          ? _value.category
          : category // ignore: cast_nullable_to_non_nullable
              as String,
      solarAsset: null == solarAsset
          ? _value.solarAsset
          : solarAsset // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ItemCodeImpl implements _ItemCode {
  const _$ItemCodeImpl(
      {required this.code,
      required this.name,
      required this.active,
      required this.category,
      required this.solarAsset});

  factory _$ItemCodeImpl.fromJson(Map<String, dynamic> json) =>
      _$$ItemCodeImplFromJson(json);

  @override
  final String code;
  @override
  final String name;
  @override
  final bool active;
  @override
  final String category;
  @override
  final bool solarAsset;

  @override
  String toString() {
    return 'ItemCode(code: $code, name: $name, active: $active, category: $category, solarAsset: $solarAsset)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ItemCodeImpl &&
            (identical(other.code, code) || other.code == code) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.active, active) || other.active == active) &&
            (identical(other.category, category) ||
                other.category == category) &&
            (identical(other.solarAsset, solarAsset) ||
                other.solarAsset == solarAsset));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, code, name, active, category, solarAsset);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$ItemCodeImplCopyWith<_$ItemCodeImpl> get copyWith =>
      __$$ItemCodeImplCopyWithImpl<_$ItemCodeImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ItemCodeImplToJson(
      this,
    );
  }
}

abstract class _ItemCode implements ItemCode {
  const factory _ItemCode(
      {required final String code,
      required final String name,
      required final bool active,
      required final String category,
      required final bool solarAsset}) = _$ItemCodeImpl;

  factory _ItemCode.fromJson(Map<String, dynamic> json) =
      _$ItemCodeImpl.fromJson;

  @override
  String get code;
  @override
  String get name;
  @override
  bool get active;
  @override
  String get category;
  @override
  bool get solarAsset;
  @override
  @JsonKey(ignore: true)
  _$$ItemCodeImplCopyWith<_$ItemCodeImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
