import 'package:isar/isar.dart';

part 'cache_installation_data.g.dart';

/// Generic, version-tolerant storage for large MDMS masters, installation
/// drafts, backend snapshots and the media index. Payloads remain JSON because
/// BOM schemas and backend additionalDetails are intentionally schemaless.
@Collection()
class CacheInstallationData {
  Id id = Isar.autoIncrement;

  @Index()
  late String namespace;

  @Index()
  late String cacheKey;

  late String rawJson;

  DateTime updatedAt = DateTime.now();
}
