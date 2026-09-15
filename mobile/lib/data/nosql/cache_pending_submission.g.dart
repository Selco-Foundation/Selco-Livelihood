// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cache_pending_submission.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetCachePendingSubmissionCollection on Isar {
  IsarCollection<CachePendingSubmission> get cachePendingSubmissions =>
      this.collection();
}

const CachePendingSubmissionSchema = CollectionSchema(
  name: r'CachePendingSubmission',
  id: -18141983337877162,
  properties: {
    r'activityFacilityId': PropertySchema(
      id: 0,
      name: r'activityFacilityId',
      type: IsarType.string,
    ),
    r'componentType': PropertySchema(
      id: 1,
      name: r'componentType',
      type: IsarType.string,
    ),
    r'createdAt': PropertySchema(
      id: 2,
      name: r'createdAt',
      type: IsarType.dateTime,
    ),
    r'facilityId': PropertySchema(
      id: 3,
      name: r'facilityId',
      type: IsarType.string,
    ),
    r'otpRequested': PropertySchema(
      id: 4,
      name: r'otpRequested',
      type: IsarType.bool,
    ),
    r'otpVerified': PropertySchema(
      id: 5,
      name: r'otpVerified',
      type: IsarType.bool,
    ),
    r'rawWorkflowJson': PropertySchema(
      id: 6,
      name: r'rawWorkflowJson',
      type: IsarType.string,
    ),
    r'state': PropertySchema(
      id: 7,
      name: r'state',
      type: IsarType.string,
    ),
    r'submissionCompleted': PropertySchema(
      id: 8,
      name: r'submissionCompleted',
      type: IsarType.bool,
    ),
    r'updatedAt': PropertySchema(
      id: 9,
      name: r'updatedAt',
      type: IsarType.dateTime,
    ),
    r'workflowMode': PropertySchema(
      id: 10,
      name: r'workflowMode',
      type: IsarType.string,
    )
  },
  estimateSize: _cachePendingSubmissionEstimateSize,
  serialize: _cachePendingSubmissionSerialize,
  deserialize: _cachePendingSubmissionDeserialize,
  deserializeProp: _cachePendingSubmissionDeserializeProp,
  idName: r'id',
  indexes: {
    r'activityFacilityId': IndexSchema(
      id: -3740981522167357561,
      name: r'activityFacilityId',
      unique: true,
      replace: true,
      properties: [
        IndexPropertySchema(
          name: r'activityFacilityId',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    )
  },
  links: {},
  embeddedSchemas: {},
  getId: _cachePendingSubmissionGetId,
  getLinks: _cachePendingSubmissionGetLinks,
  attach: _cachePendingSubmissionAttach,
  version: '3.1.0+1',
);

int _cachePendingSubmissionEstimateSize(
  CachePendingSubmission object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.activityFacilityId.length * 3;
  bytesCount += 3 + object.componentType.length * 3;
  bytesCount += 3 + object.facilityId.length * 3;
  bytesCount += 3 + object.rawWorkflowJson.length * 3;
  bytesCount += 3 + object.state.length * 3;
  bytesCount += 3 + object.workflowMode.length * 3;
  return bytesCount;
}

void _cachePendingSubmissionSerialize(
  CachePendingSubmission object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeString(offsets[0], object.activityFacilityId);
  writer.writeString(offsets[1], object.componentType);
  writer.writeDateTime(offsets[2], object.createdAt);
  writer.writeString(offsets[3], object.facilityId);
  writer.writeBool(offsets[4], object.otpRequested);
  writer.writeBool(offsets[5], object.otpVerified);
  writer.writeString(offsets[6], object.rawWorkflowJson);
  writer.writeString(offsets[7], object.state);
  writer.writeBool(offsets[8], object.submissionCompleted);
  writer.writeDateTime(offsets[9], object.updatedAt);
  writer.writeString(offsets[10], object.workflowMode);
}

CachePendingSubmission _cachePendingSubmissionDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = CachePendingSubmission();
  object.activityFacilityId = reader.readString(offsets[0]);
  object.componentType = reader.readString(offsets[1]);
  object.createdAt = reader.readDateTime(offsets[2]);
  object.facilityId = reader.readString(offsets[3]);
  object.id = id;
  object.otpRequested = reader.readBool(offsets[4]);
  object.otpVerified = reader.readBool(offsets[5]);
  object.rawWorkflowJson = reader.readString(offsets[6]);
  object.state = reader.readString(offsets[7]);
  object.submissionCompleted = reader.readBool(offsets[8]);
  object.updatedAt = reader.readDateTime(offsets[9]);
  object.workflowMode = reader.readString(offsets[10]);
  return object;
}

P _cachePendingSubmissionDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readString(offset)) as P;
    case 1:
      return (reader.readString(offset)) as P;
    case 2:
      return (reader.readDateTime(offset)) as P;
    case 3:
      return (reader.readString(offset)) as P;
    case 4:
      return (reader.readBool(offset)) as P;
    case 5:
      return (reader.readBool(offset)) as P;
    case 6:
      return (reader.readString(offset)) as P;
    case 7:
      return (reader.readString(offset)) as P;
    case 8:
      return (reader.readBool(offset)) as P;
    case 9:
      return (reader.readDateTime(offset)) as P;
    case 10:
      return (reader.readString(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _cachePendingSubmissionGetId(CachePendingSubmission object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _cachePendingSubmissionGetLinks(
    CachePendingSubmission object) {
  return [];
}

void _cachePendingSubmissionAttach(
    IsarCollection<dynamic> col, Id id, CachePendingSubmission object) {
  object.id = id;
}

extension CachePendingSubmissionByIndex
    on IsarCollection<CachePendingSubmission> {
  Future<CachePendingSubmission?> getByActivityFacilityId(
      String activityFacilityId) {
    return getByIndex(r'activityFacilityId', [activityFacilityId]);
  }

  CachePendingSubmission? getByActivityFacilityIdSync(
      String activityFacilityId) {
    return getByIndexSync(r'activityFacilityId', [activityFacilityId]);
  }

  Future<bool> deleteByActivityFacilityId(String activityFacilityId) {
    return deleteByIndex(r'activityFacilityId', [activityFacilityId]);
  }

  bool deleteByActivityFacilityIdSync(String activityFacilityId) {
    return deleteByIndexSync(r'activityFacilityId', [activityFacilityId]);
  }

  Future<List<CachePendingSubmission?>> getAllByActivityFacilityId(
      List<String> activityFacilityIdValues) {
    final values = activityFacilityIdValues.map((e) => [e]).toList();
    return getAllByIndex(r'activityFacilityId', values);
  }

  List<CachePendingSubmission?> getAllByActivityFacilityIdSync(
      List<String> activityFacilityIdValues) {
    final values = activityFacilityIdValues.map((e) => [e]).toList();
    return getAllByIndexSync(r'activityFacilityId', values);
  }

  Future<int> deleteAllByActivityFacilityId(
      List<String> activityFacilityIdValues) {
    final values = activityFacilityIdValues.map((e) => [e]).toList();
    return deleteAllByIndex(r'activityFacilityId', values);
  }

  int deleteAllByActivityFacilityIdSync(List<String> activityFacilityIdValues) {
    final values = activityFacilityIdValues.map((e) => [e]).toList();
    return deleteAllByIndexSync(r'activityFacilityId', values);
  }

  Future<Id> putByActivityFacilityId(CachePendingSubmission object) {
    return putByIndex(r'activityFacilityId', object);
  }

  Id putByActivityFacilityIdSync(CachePendingSubmission object,
      {bool saveLinks = true}) {
    return putByIndexSync(r'activityFacilityId', object, saveLinks: saveLinks);
  }

  Future<List<Id>> putAllByActivityFacilityId(
      List<CachePendingSubmission> objects) {
    return putAllByIndex(r'activityFacilityId', objects);
  }

  List<Id> putAllByActivityFacilityIdSync(List<CachePendingSubmission> objects,
      {bool saveLinks = true}) {
    return putAllByIndexSync(r'activityFacilityId', objects,
        saveLinks: saveLinks);
  }
}

extension CachePendingSubmissionQueryWhereSort
    on QueryBuilder<CachePendingSubmission, CachePendingSubmission, QWhere> {
  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterWhere>
      anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension CachePendingSubmissionQueryWhere on QueryBuilder<
    CachePendingSubmission, CachePendingSubmission, QWhereClause> {
  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterWhereClause> idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterWhereClause> idNotEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterWhereClause> idGreaterThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterWhereClause> idLessThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterWhereClause> idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterWhereClause> activityFacilityIdEqualTo(String activityFacilityId) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'activityFacilityId',
        value: [activityFacilityId],
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
          QAfterWhereClause>
      activityFacilityIdNotEqualTo(String activityFacilityId) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'activityFacilityId',
              lower: [],
              upper: [activityFacilityId],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'activityFacilityId',
              lower: [activityFacilityId],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'activityFacilityId',
              lower: [activityFacilityId],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'activityFacilityId',
              lower: [],
              upper: [activityFacilityId],
              includeUpper: false,
            ));
      }
    });
  }
}

extension CachePendingSubmissionQueryFilter on QueryBuilder<
    CachePendingSubmission, CachePendingSubmission, QFilterCondition> {
  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> activityFacilityIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'activityFacilityId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> activityFacilityIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'activityFacilityId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> activityFacilityIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'activityFacilityId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> activityFacilityIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'activityFacilityId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> activityFacilityIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'activityFacilityId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> activityFacilityIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'activityFacilityId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
          QAfterFilterCondition>
      activityFacilityIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'activityFacilityId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
          QAfterFilterCondition>
      activityFacilityIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'activityFacilityId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> activityFacilityIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'activityFacilityId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> activityFacilityIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'activityFacilityId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> componentTypeEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'componentType',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> componentTypeGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'componentType',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> componentTypeLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'componentType',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> componentTypeBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'componentType',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> componentTypeStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'componentType',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> componentTypeEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'componentType',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
          QAfterFilterCondition>
      componentTypeContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'componentType',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
          QAfterFilterCondition>
      componentTypeMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'componentType',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> componentTypeIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'componentType',
        value: '',
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> componentTypeIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'componentType',
        value: '',
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> createdAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> createdAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> createdAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> createdAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'createdAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> facilityIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'facilityId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> facilityIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'facilityId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> facilityIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'facilityId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> facilityIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'facilityId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> facilityIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'facilityId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> facilityIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'facilityId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
          QAfterFilterCondition>
      facilityIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'facilityId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
          QAfterFilterCondition>
      facilityIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'facilityId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> facilityIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'facilityId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> facilityIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'facilityId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> idEqualTo(Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> otpRequestedEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'otpRequested',
        value: value,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> otpVerifiedEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'otpVerified',
        value: value,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> rawWorkflowJsonEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'rawWorkflowJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> rawWorkflowJsonGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'rawWorkflowJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> rawWorkflowJsonLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'rawWorkflowJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> rawWorkflowJsonBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'rawWorkflowJson',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> rawWorkflowJsonStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'rawWorkflowJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> rawWorkflowJsonEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'rawWorkflowJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
          QAfterFilterCondition>
      rawWorkflowJsonContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'rawWorkflowJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
          QAfterFilterCondition>
      rawWorkflowJsonMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'rawWorkflowJson',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> rawWorkflowJsonIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'rawWorkflowJson',
        value: '',
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> rawWorkflowJsonIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'rawWorkflowJson',
        value: '',
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> stateEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'state',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> stateGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'state',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> stateLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'state',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> stateBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'state',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> stateStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'state',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> stateEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'state',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
          QAfterFilterCondition>
      stateContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'state',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
          QAfterFilterCondition>
      stateMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'state',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> stateIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'state',
        value: '',
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> stateIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'state',
        value: '',
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> submissionCompletedEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'submissionCompleted',
        value: value,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> updatedAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> updatedAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> updatedAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> updatedAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'updatedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> workflowModeEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'workflowMode',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> workflowModeGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'workflowMode',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> workflowModeLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'workflowMode',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> workflowModeBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'workflowMode',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> workflowModeStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'workflowMode',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> workflowModeEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'workflowMode',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
          QAfterFilterCondition>
      workflowModeContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'workflowMode',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
          QAfterFilterCondition>
      workflowModeMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'workflowMode',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> workflowModeIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'workflowMode',
        value: '',
      ));
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission,
      QAfterFilterCondition> workflowModeIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'workflowMode',
        value: '',
      ));
    });
  }
}

extension CachePendingSubmissionQueryObject on QueryBuilder<
    CachePendingSubmission, CachePendingSubmission, QFilterCondition> {}

extension CachePendingSubmissionQueryLinks on QueryBuilder<
    CachePendingSubmission, CachePendingSubmission, QFilterCondition> {}

extension CachePendingSubmissionQuerySortBy
    on QueryBuilder<CachePendingSubmission, CachePendingSubmission, QSortBy> {
  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByActivityFacilityId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'activityFacilityId', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByActivityFacilityIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'activityFacilityId', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByComponentType() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'componentType', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByComponentTypeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'componentType', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByFacilityId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'facilityId', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByFacilityIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'facilityId', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByOtpRequested() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'otpRequested', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByOtpRequestedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'otpRequested', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByOtpVerified() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'otpVerified', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByOtpVerifiedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'otpVerified', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByRawWorkflowJson() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'rawWorkflowJson', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByRawWorkflowJsonDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'rawWorkflowJson', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByState() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'state', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByStateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'state', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortBySubmissionCompleted() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'submissionCompleted', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortBySubmissionCompletedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'submissionCompleted', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByUpdatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByWorkflowMode() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'workflowMode', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      sortByWorkflowModeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'workflowMode', Sort.desc);
    });
  }
}

extension CachePendingSubmissionQuerySortThenBy on QueryBuilder<
    CachePendingSubmission, CachePendingSubmission, QSortThenBy> {
  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByActivityFacilityId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'activityFacilityId', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByActivityFacilityIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'activityFacilityId', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByComponentType() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'componentType', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByComponentTypeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'componentType', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByFacilityId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'facilityId', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByFacilityIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'facilityId', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByOtpRequested() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'otpRequested', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByOtpRequestedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'otpRequested', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByOtpVerified() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'otpVerified', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByOtpVerifiedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'otpVerified', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByRawWorkflowJson() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'rawWorkflowJson', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByRawWorkflowJsonDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'rawWorkflowJson', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByState() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'state', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByStateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'state', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenBySubmissionCompleted() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'submissionCompleted', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenBySubmissionCompletedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'submissionCompleted', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByUpdatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.desc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByWorkflowMode() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'workflowMode', Sort.asc);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QAfterSortBy>
      thenByWorkflowModeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'workflowMode', Sort.desc);
    });
  }
}

extension CachePendingSubmissionQueryWhereDistinct
    on QueryBuilder<CachePendingSubmission, CachePendingSubmission, QDistinct> {
  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QDistinct>
      distinctByActivityFacilityId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'activityFacilityId',
          caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QDistinct>
      distinctByComponentType({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'componentType',
          caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QDistinct>
      distinctByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'createdAt');
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QDistinct>
      distinctByFacilityId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'facilityId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QDistinct>
      distinctByOtpRequested() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'otpRequested');
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QDistinct>
      distinctByOtpVerified() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'otpVerified');
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QDistinct>
      distinctByRawWorkflowJson({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'rawWorkflowJson',
          caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QDistinct>
      distinctByState({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'state', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QDistinct>
      distinctBySubmissionCompleted() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'submissionCompleted');
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QDistinct>
      distinctByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'updatedAt');
    });
  }

  QueryBuilder<CachePendingSubmission, CachePendingSubmission, QDistinct>
      distinctByWorkflowMode({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'workflowMode', caseSensitive: caseSensitive);
    });
  }
}

extension CachePendingSubmissionQueryProperty on QueryBuilder<
    CachePendingSubmission, CachePendingSubmission, QQueryProperty> {
  QueryBuilder<CachePendingSubmission, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<CachePendingSubmission, String, QQueryOperations>
      activityFacilityIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'activityFacilityId');
    });
  }

  QueryBuilder<CachePendingSubmission, String, QQueryOperations>
      componentTypeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'componentType');
    });
  }

  QueryBuilder<CachePendingSubmission, DateTime, QQueryOperations>
      createdAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'createdAt');
    });
  }

  QueryBuilder<CachePendingSubmission, String, QQueryOperations>
      facilityIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'facilityId');
    });
  }

  QueryBuilder<CachePendingSubmission, bool, QQueryOperations>
      otpRequestedProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'otpRequested');
    });
  }

  QueryBuilder<CachePendingSubmission, bool, QQueryOperations>
      otpVerifiedProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'otpVerified');
    });
  }

  QueryBuilder<CachePendingSubmission, String, QQueryOperations>
      rawWorkflowJsonProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'rawWorkflowJson');
    });
  }

  QueryBuilder<CachePendingSubmission, String, QQueryOperations>
      stateProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'state');
    });
  }

  QueryBuilder<CachePendingSubmission, bool, QQueryOperations>
      submissionCompletedProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'submissionCompleted');
    });
  }

  QueryBuilder<CachePendingSubmission, DateTime, QQueryOperations>
      updatedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'updatedAt');
    });
  }

  QueryBuilder<CachePendingSubmission, String, QQueryOperations>
      workflowModeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'workflowMode');
    });
  }
}
