Map<String, dynamic> transformBomMdmsRecordToSchema(
  Map<String, dynamic> record,
) {
  final data = record['data'] is Map
      ? Map<String, dynamic>.from(record['data'] as Map)
      : Map<String, dynamic>.from(record);
  final name =
      (data['name'] ?? record['schemaCode'] ?? record['uniqueIdentifier'] ?? '')
          .toString();
  final pages = <String, dynamic>{};

  final pageEntries = _entries(data['pages'])
    ..sort((a, b) => _order(a.value).compareTo(_order(b.value)));
  for (final pageEntry in pageEntries) {
    final page = pageEntry.value;
    final pageName = (page['page'] ?? page['name'] ?? pageEntry.key).toString();
    if (pageName.isEmpty) continue;
    final properties = <String, dynamic>{};

    final propertyEntries = _entries(page['properties'])
      ..sort((a, b) => _order(a.value).compareTo(_order(b.value)));
    for (final propertyEntry in propertyEntries) {
      final property = propertyEntry.value;
      final fieldName = (property['fieldName'] ?? propertyEntry.key).toString();
      if (fieldName.isEmpty) continue;
      properties[fieldName] = <String, dynamic>{
        ...property,
        'fieldName': fieldName,
        'type': property['type'] ?? 'string',
      };
    }

    pages[pageName] = <String, dynamic>{
      ...page,
      'page': pageName,
      'type': page['type'] ?? 'object',
      'properties': properties,
    };
  }

  return <String, dynamic>{
    'name': name,
    'version': _integer(data['version'], fallback: 1),
    'summary': data['summary'] == true,
    'pages': pages,
  };
}

List<MapEntry<String, Map<String, dynamic>>> _entries(dynamic raw) {
  final entries = <MapEntry<String, Map<String, dynamic>>>[];
  if (raw is List) {
    for (var index = 0; index < raw.length; index++) {
      final value = raw[index];
      if (value is Map) {
        entries.add(MapEntry(
          'item_${index + 1}',
          Map<String, dynamic>.from(value),
        ));
      }
    }
    return entries;
  }
  if (raw is Map) {
    for (final entry in raw.entries) {
      if (entry.value is Map) {
        entries.add(MapEntry(
          entry.key.toString(),
          Map<String, dynamic>.from(entry.value as Map),
        ));
      }
    }
  }
  return entries;
}

int _order(Map<String, dynamic> value) => _integer(value['order'], fallback: 0);

int _integer(dynamic value, {required int fallback}) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? fallback;
