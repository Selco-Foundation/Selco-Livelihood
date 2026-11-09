import 'package:flutter/foundation.dart';
import 'package:synchronized/synchronized.dart';

import '../../data/secure_storage/secureStore.dart';
import '../../model/amc/scheduled_visit.dart';
import '../../utils/envConfig.dart';
import '../../utils/role_login_resolver.dart';

/// Ported from E4H `lib/repositories/report_bookmark_repo.dart` (the generic
/// base and its AMC subclass; the installation subclass is not used here).
/// Bookmarks live in secure storage under
/// `reportBookmarks:[kind, tenant, user, userType]`, as in E4H.
abstract class ReportBookmarkRepository<T> {
  static final _lock = Lock();
  final SecureStore storage;
  final String tenantId;
  final String userId;
  final String userType;
  final String kind;

  ReportBookmarkRepository(
      {SecureStore? storage,
      required this.tenantId,
      required this.userId,
      required this.userType,
      required this.kind})
      : storage = storage ?? SecureStore();

  String identity(T item);
  String facilityName(T item);
  Map<String, dynamic> encode(T item);
  T decode(Map<String, dynamic> json);

  Future<Map<String, dynamic>> _read() async {
    if (userId.trim().isEmpty) return {};
    return storage.getReportBookmarks(kind, tenantId, userId, userType);
  }

  Future<Set<String>> ids() async {
    final entries = (await _read()).entries.toList();
    entries.sort((a, b) => ((b.value as Map)['bookmarkedAt'] as int)
        .compareTo((a.value as Map)['bookmarkedAt'] as int));
    return entries.map((entry) => entry.key).toSet();
  }

  Future<int> count() async => (await _read()).length;

  Future<List<T>> list({String query = '', String sortOrder = 'DESC'}) async {
    final entries = (await _read())
        .values
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    entries.sort((a, b) {
      final order =
          (a['bookmarkedAt'] as int).compareTo(b['bookmarkedAt'] as int);
      return sortOrder == 'ASC' ? order : -order;
    });
    final search = query.trim().toLowerCase();
    return entries
        .where((e) => e['record'] is Map)
        .map((e) => decode(Map<String, dynamic>.from(e['record'] as Map)))
        .where((item) => facilityName(item).toLowerCase().contains(search))
        .toList();
  }

  Future<void> save(T item) => _lock.synchronized(() async {
        final id = identity(item).trim();
        if (id.isEmpty || userId.trim().isEmpty) {
          throw const FormatException('Missing report bookmark identity');
        }
        final entries = await _read();
        entries[id] = {
          'record': encode(item),
          'bookmarkedAt': (entries[id] as Map?)?['bookmarkedAt'] ??
              DateTime.now().microsecondsSinceEpoch,
        };
        await storage.setReportBookmarks(
            kind, tenantId, userId, userType, entries);
      });

  Future<void> invalidate(String id) => _lock.synchronized(() async {
        final entries = await _read();
        final entry = entries[id.trim()] as Map?;
        if (entry == null) return;
        entries[id.trim()] = {...entry, 'record': null};
        await storage.setReportBookmarks(
            kind, tenantId, userId, userType, entries);
      });

  Future<void> refreshSnapshots(List<T> items) => _lock.synchronized(() async {
        final entries = await _read();
        var changed = false;
        for (final item in items) {
          final id = identity(item).trim();
          final entry = entries[id] as Map?;
          if (entry == null) continue;
          entries[id] = {...entry, 'record': encode(item)};
          changed = true;
        }
        if (changed) {
          await storage.setReportBookmarks(
              kind, tenantId, userId, userType, entries);
        }
      });

  Future<void> remove(String id) => _lock.synchronized(() async {
        final entries = await _read();
        if (entries.remove(id.trim()) == null) return;
        await storage.setReportBookmarks(
            kind, tenantId, userId, userType, entries);
      });
}

class AmcBookmarkRepository extends ReportBookmarkRepository<ScheduledVisit> {
  AmcBookmarkRepository(
      {super.storage,
      required super.tenantId,
      required super.userId,
      required super.userType})
      : super(kind: 'amc');

  @override
  String identity(ScheduledVisit item) => item.id ?? '';

  @override
  String facilityName(ScheduledVisit item) => item.facility?.facilityName ?? '';

  @override
  Map<String, dynamic> encode(ScheduledVisit item) => item.toJson();

  @override
  ScheduledVisit decode(Map<String, dynamic> json) =>
      ScheduledVisit.fromJson(json);
}

/// Called only after the server has accepted `SUBMIT_VISIT_REPORT`: the
/// bookmark keeps its id but drops its stale snapshot.
Future<void> invalidateSubmittedReportBookmark(
    {required String id,
    required String action,
    SecureStore? storage,
    String? tenantId}) async {
  if (action != 'SUBMIT_VISIT_REPORT') return;
  try {
    final store = storage ?? SecureStore();
    final user = (await store.getAccessInfo())?.userRequest;
    final userId = user?.uuid ?? user?.userName ?? '';
    await AmcBookmarkRepository(
            storage: store,
            tenantId: tenantId ?? envConfig.variables.tenantId,
            userId: userId,
            userType: USER_TYPES.AMC.name)
        .invalidate(id);
  } catch (error) {
    debugPrint('Unable to invalidate submitted report bookmark: $error');
  }
}

/// Refresh only existing bookmarks in the current user's AMC scope.
Future<void> refreshReportBookmarkSnapshots(List<ScheduledVisit> items,
    {SecureStore? storage, String? tenantId}) async {
  try {
    final store = storage ?? SecureStore();
    final user = (await store.getAccessInfo())?.userRequest;
    final userId = user?.uuid ?? user?.userName ?? '';
    if (userId.isEmpty) return;
    await AmcBookmarkRepository(
            storage: store,
            tenantId: tenantId ?? envConfig.variables.tenantId,
            userId: userId,
            userType: USER_TYPES.AMC.name)
        .refreshSnapshots(items);
  } catch (error) {
    debugPrint('Unable to refresh bookmark snapshots: $error');
  }
}
