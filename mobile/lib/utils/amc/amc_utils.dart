// ignore_for_file: constant_identifier_names, camel_case_types

import 'dart:convert';
import 'dart:io';

import 'package:digit_forms_engine/blocs/forms/forms.dart';
import 'package:digit_forms_engine/models/property_schema/property_schema.dart'
    as digit_property_schema;
import 'package:digit_forms_engine/models/schema_object/schema_object.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:reactive_forms/reactive_forms.dart';

import '../../blocs/auth/authbloc.dart';
import '../../data/network_manager.dart';
import '../../model/amc/scheduled_visit.dart';
import '../../repositories/amc/amc_dynamic_form_repo.dart';
import '../../repositories/amc/amc_remote_data_source.dart';
import '../../router/app_router.dart';
import '../envConfig.dart';
import '../extensions.dart';
import '../i18_key_constants.dart' as i18;
import '../role_login_resolver.dart';
export 'amc_json.dart';

/// AMC helpers ported from E4H `lib/utils/utils.dart` and its small
/// neighbours (`report_date_label.dart`, `facility_list_filter.dart`,
/// `repositories/cache_fallback.dart`). Behaviour is kept identical to E4H.

String formatAmcNumber(
  int? visitNumber,
  int? durationMonths,
  int? visitFrequencyMonths,
) {
  final visit = visitNumber?.toString() ?? '---';
  var total = '---';

  if (durationMonths != null &&
      visitFrequencyMonths != null &&
      visitFrequencyMonths > 0 &&
      durationMonths % visitFrequencyMonths == 0) {
    total = (durationMonths ~/ visitFrequencyMonths).toString();
  }

  return '$visit / $total';
}

enum WORKFLOW_STATUS_AMC_FIELD_STAFF {
  SCHEDULED,
  APPROVED,
  REJECTED,
  PENDING_OTP_APPROVAL,
  PENDING_APPROVAL,
}

enum FormOrigin { overallSummary, inboxSummary, submitForApproval, submitted }

/// E4H uses 1 for every facility list (this app's installation lists use 3).
const int minFacilitySearchQueryLength = 1;

/// The AMC report form, as named in E4H (`AssetForm.AMC_SCHEDULED_MAINTENANCE`
/// MDMS document, first page `AMC_Report`).
const String amcFormSchemaKey = 'AssetForm.AMC_SCHEDULED_MAINTENANCE';
const String amcFormFirstPage = 'AMC_Report';

Future<String> copyFileToLocalDir(File sourceFile) async {
  try {
    final appDocDir = await getApplicationDocumentsDirectory();
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final fileName = '${timestamp}_${sourceFile.uri.pathSegments.last}';
    final dest = File('${appDocDir.path}/$fileName');
    final copied = await sourceFile.copy(dest.path);
    return copied.path;
  } on MissingPluginException {
    return sourceFile.path;
  }
}

class BoundaryCodeLocality {
  final String state;
  final String district;
  final String block;

  const BoundaryCodeLocality({
    this.state = '',
    this.district = '',
    this.block = '',
  });
}

BoundaryCodeLocality parseBoundaryCodeLocality(String? boundaryCode) {
  final raw = (boundaryCode ?? '').trim();
  if (raw.isEmpty) return const BoundaryCodeLocality();

  final parts = raw.split('_').map((e) => e.trim()).where((e) => e.isNotEmpty);
  final values = parts.toList();

  String valueAt(int index) {
    if (index < 0 || index >= values.length) return '';
    final value = values[index];
    if (value.contains('/')) return '';
    return value;
  }

  return BoundaryCodeLocality(
    state: valueAt(1),
    district: valueAt(2),
    block: valueAt(3),
  );
}

String lastPhoneDigits(String phone, {int count = 4}) {
  if (phone.length <= count) return phone;
  return phone.substring(phone.length - count);
}

bool isValidUuid(String value) {
  final uuidRegex = RegExp(
    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  );
  return uuidRegex.hasMatch(value);
}

final Map<String, File> _fileCache = {};

String get fileStoreFileUrl =>
    '${envConfig.variables.baseUrl}filestore/v1/files/file?tenantId=${envConfig.variables.tenantId}&fileStoreId=';

/// E4H `getCachedFile`: a filestore id is downloaded once into app-support
/// `filestore/<scope>/<id>` and reused; a local path is returned as-is.
/// The download goes through [amcRemoteDataSource] (dummy or real).
Future<File?> getCachedFile(String idOrPath) async {
  // DUMMY-BACKEND: `isDummyFileStoreId` lets the dummy filestore's ids be
  // treated like real ones; remove it with the dummy backend.
  final isRemote = isValidUuid(idOrPath) || isDummyFileStoreId(idOrPath);
  final cacheKey = isRemote ? '$fileStoreFileUrl$idOrPath' : idOrPath;
  final cached = _fileCache[cacheKey];
  if (cached != null && await cached.exists()) return cached;
  _fileCache.remove(cacheKey);

  if (isRemote) {
    File? temporary;
    try {
      final dir = await getApplicationSupportDirectory();
      final scope = base64Url.encode(utf8.encode(fileStoreFileUrl));
      final file = File(p.join(dir.path, 'filestore', scope, idOrPath));
      if (await file.exists()) {
        _fileCache[cacheKey] = file;
        return file;
      }
      final bytes = await amcRemoteDataSource.downloadFile(idOrPath);
      if (bytes != null) {
        await file.parent.create(recursive: true);
        temporary = File(
            '${file.path}.${DateTime.now().microsecondsSinceEpoch}.tmp');
        await temporary.writeAsBytes(bytes, flush: true);
        await temporary.rename(file.path);
        _fileCache[cacheKey] = file;
        return file;
      }
    } catch (_) {
      // Missing downloads remain unavailable; other media can still load.
    } finally {
      if (temporary != null && await temporary.exists()) {
        await temporary.delete();
      }
    }
  }

  final file = File(idOrPath);
  if (await file.exists()) {
    _fileCache[cacheKey] = file;
    return file;
  }

  return null;
}

/// E4H `getFilestoreUrl`: uploads a local file and returns its filestore id;
/// an id is returned unchanged.
Future<String> getFilestoreUrl(String idOrPath) async {
  String photoId = idOrPath;
  // DUMMY-BACKEND: see `getCachedFile`.
  if (!isValidUuid(photoId) && !isDummyFileStoreId(photoId)) {
    final file = await getCachedFile(idOrPath);
    if (file != null) {
      photoId = await amcRemoteDataSource.uploadFile(file.path);
    }
  }
  return photoId;
}

Map<String, dynamic> transformSelcoFormMdmsDocToSchema(
    Map<String, dynamic> mdmsDoc) {
  final data = (mdmsDoc['data'] as Map?) ?? const <String, dynamic>{};

  final name = (data['name'] ??
          mdmsDoc['schemaCode'] ??
          mdmsDoc['uniqueIdentifier'] ??
          'Form')
      .toString();
  final version = (data['version'] ?? 1);
  final order = data['order'] ?? 0;
  final summary = data['summary'] ?? false;

  final pagesArr = (data['pages'] as List?) ?? const <dynamic>[];
  final pagesMap = <String, dynamic>{};
  for (final p in pagesArr) {
    if (p is! Map) continue;
    final page = Map<String, dynamic>.from(p);
    final pageKey =
        (page['page'] ?? page['name'] ?? 'page_${pagesMap.length + 1}')
            .toString();

    final propsArr = (page['properties'] as List?) ?? const <dynamic>[];
    final propsMap = <String, dynamic>{};
    for (var i = 0; i < propsArr.length; i++) {
      final raw = propsArr[i];
      if (raw is! Map) continue;
      final prop = Map<String, dynamic>.from(raw);
      final key = (prop['fieldName'] ?? 'field_${i + 1}').toString();

      propsMap[key] = {
        'type': prop['type'],
        'schemaCode': prop['schemaCode'],
        'label': prop['label'],
        'order': prop['order'],
        'value': prop['value'],
        'format': prop['format'],
        'section': prop['section'],
        'sectionDescription': prop['sectionDescription'],
        'hidden': prop['hidden'],
        'readOnly': prop['readOnly'],
        'displayOnly': prop['displayOnly'],
        'deleteFlag': prop['deleteFlag'],
        'isMultiSelect': prop['isMultiSelect'],
        'includeInForm': prop['includeInForm'],
        'includeInSummary': prop['includeInSummary'],
        'systemDate': prop['systemDate'],
        'charCount': prop['charCount'],
        'startDate': prop['startDate'],
        'endDate': prop['endDate'],
        'minValue': prop['minValue'],
        'maxValue': prop['maxValue'],
        'minLength': prop['minLength'],
        'maxLength': prop['maxLength'],
        'tooltip': prop['tooltip'],
        'helpText': prop['helpText'],
        'prefixText': prop['prefixText'],
        'infoText': prop['infoText'],
        'innerLabel': prop['innerLabel'],
        'suffixText': prop['suffixText'],
        'errorMessage': prop['errorMessage'],
        'enums': prop['enums'],
        'validations': prop['validations'],
        'displayBehavior': prop['displayBehavior'],
        'conditions': prop['conditions'],
        'navigateTo': prop['navigateTo'],
        'visibilityCondition': prop['visibilityCondition'],
        'conditionalNavigateTo': prop['conditionalNavigateTo'],
        'autoFillCondition': prop['autoFillCondition'],
        'fieldName': key,
      };
    }

    pagesMap[pageKey] = {
      'page': pageKey,
      'type': page['type'] ?? 'object',
      'label': page['label'],
      'order': page['order'],
      'actionLabel': page['actionLabel'],
      'description': page['description'],
      'navigateTo': page['navigateTo'],
      'visibilityCondition': page['visibilityCondition'],
      'conditionalNavigateTo': page['conditionalNavigateTo'],
      'properties': propsMap,
    };
  }

  return {
    'name': name,
    'version': version,
    'order': order,
    'summary': summary,
    'pages': pagesMap,
  };
}

Map<String, dynamic> injectValuesIntoRawDoc({
  required Map<String, dynamic> rawDoc,
  required Map<String, dynamic> flatValues,
}) {
  final doc = jsonDecode(jsonEncode(rawDoc)) as Map<String, dynamic>;

  final pagesField = doc['pages'];
  if (pagesField is List) {
    for (final p in pagesField) {
      if (p is! Map) continue;
      final propsList = p['properties'];
      if (propsList is List) {
        for (final item in propsList) {
          if (item is Map) {
            final fieldName = item['fieldName']?.toString();
            if (fieldName != null && flatValues.containsKey(fieldName)) {
              item['value'] = flatValues[fieldName];
            }
          }
        }
      }
    }
    doc['pages'] = pagesField;
  } else if (pagesField is Map) {
    final pagesMap = <String, dynamic>{};
    pagesField.forEach((key, pObj) {
      if (pObj is Map) {
        final propsField = pObj['properties'];
        if (propsField is Map) {
          final propsMap = <String, dynamic>{};
          propsField.forEach((fieldKey, propRaw) {
            if (propRaw is Map) {
              final fieldName = propRaw['fieldName']?.toString() ?? fieldKey;
              if (flatValues.containsKey(fieldName)) {
                propRaw['value'] = flatValues[fieldName];
              }
              propsMap[fieldKey] = propRaw;
            } else {
              propsMap[fieldKey] = propRaw;
            }
          });
          pObj['properties'] = propsMap;
        }
      }
      pagesMap[key] = pObj;
    });
    doc['pages'] = pagesMap;
  }

  return doc;
}

Map<String, dynamic> subsetForPage(
  SchemaObject schema,
  String pageName,
  Map<String, dynamic> kv,
) {
  final page = schema.pages[pageName];
  if (page == null || page.properties == null) return const {};
  final allowed = page.properties!.keys.toSet();
  final out = <String, dynamic>{};
  for (final entry in kv.entries) {
    if (allowed.contains(entry.key)) {
      out[entry.key] = entry.value;
    }
  }
  return out;
}

Map<String, dynamic> extractKVFromRawDoc(Map<String, dynamic> raw) {
  final acc = <String, dynamic>{};
  dynamic root = raw;
  if (root is Map && root['data'] is Map) {
    root = root['data'];
    if (root is Map && root['data'] is Map) {
      root = root['data'];
    }
  }

  void visit(dynamic node) {
    if (node is Map) {
      final fn = node['fieldName'];
      if (fn is String && fn.isNotEmpty && node.containsKey('value')) {
        acc[fn] = node['value'];
      }
      for (final v in node.values) {
        visit(v);
      }
    } else if (node is List) {
      for (final v in node) {
        visit(v);
      }
    }
  }

  visit(root);
  return acc;
}

String prettyLabel(String s) {
  if (s.trim().isEmpty) return s;
  final spaced = s.replaceAll(RegExp(r'[_\-]+'), ' ').trim();
  return spaced.replaceAllMapped(
      RegExp(r'\b[a-z]'), (m) => m.group(0)!.toUpperCase());
}

String labelForKey(
    digit_property_schema.PropertySchema pageSchema, String key) {
  final raw = pageSchema.properties?[key]?.label ?? key;
  return prettyLabel(raw);
}

dynamic coerceForControl(AbstractControl<Object?> control, dynamic v) {
  if (v == null) return null;

  if (control is FormControl<String?>) {
    return v.toString();
  }

  if (control is FormControl<DateTime?>) {
    if (v is DateTime) return v;
    if (v is String) return DateTime.tryParse(v);
    return null;
  }

  if (control is FormControl<int?>) {
    if (v is int) return v;
    if (v is double) return v.toInt();
    if (v is String) return int.tryParse(v);
    return null;
  }

  if (control is FormControl<double?>) {
    if (v is double) return v;
    if (v is int) return v.toDouble();
    if (v is String) return double.tryParse(v);
    return null;
  }

  if (control is FormControl<bool?>) {
    if (v is bool) return v;
    if (v is String) {
      final s = v.toLowerCase().trim();
      if (s == 'true' || s == '1' || s == 'yes') return true;
      if (s == 'false' || s == '0' || s == 'no') return false;
    }
    if (v is num) return v != 0;
    return null;
  }

  return v;
}

String? currentSchemaKey({
  required FormsState state,
  required String pageName,
  String? schemaName,
  String? uniqueIdentifier,
}) {
  final requested = schemaName ?? uniqueIdentifier;
  if (requested != null && state.cachedSchemas.containsKey(requested)) {
    return requested;
  }
  final active = state.activeSchemaKey;
  if (active != null && state.cachedSchemas.containsKey(active)) {
    return active;
  }
  for (final e in state.cachedSchemas.entries) {
    if (e.value.pages.containsKey(pageName)) return e.key;
  }
  return state.cachedSchemas.isEmpty ? null : state.cachedSchemas.keys.first;
}

bool isLastPage({required SchemaObject schema, required String pageName}) {
  final lastKey = schema.pages.keys.isEmpty ? null : schema.pages.keys.last;
  return lastKey == pageName;
}

/// E4H: local saved answers first, then the server's submitted responses,
/// otherwise `{"faults_observed": "YES"}`.
Future<Map<String, dynamic>> buildInitialAmcValues({
  required BuildContext context,
  required ScheduledVisit scheduledVisit,
  required FormOrigin origin,
}) async {
  final userType = USER_TYPES.AMC.name;

  final formRepo = AmcDynamicFormRepository();
  final initialValues = await formRepo.getInitialFormValues(
    scheduledVisitId: scheduledVisit.id!,
    responsesFromModel: scheduledVisit.visitReport?.responses,
    userType: userType,
  );

  return initialValues ?? {"faults_observed": "YES"};
}

bool isSessionExpiredMessage(String? message) {
  final msg = (message ?? '').toLowerCase();
  return msg.contains('session_expired');
}

String normalizeFriendlyNetworkErrorMessage(
  String? message, {
  String fallback = 'Failed.',
}) {
  if (isSessionExpiredMessage(message)) return 'SESSION_EXPIRED';

  final cleaned =
      (message ?? '').trim().replaceFirst(RegExp(r'^(Exception:\s*)+'), '');
  if (cleaned.isEmpty) return fallback;

  final lower = cleaned.toLowerCase();

  if (lower.contains('no network connection')) {
    return 'No network connection. Connect to Wi-Fi or mobile data and try again.';
  }

  if (lower.contains('no internet access')) {
    return "You're offline. Please reconnect to the internet and try again.";
  }

  if (lower.contains('failed host lookup') ||
      lower.contains('socketexception') ||
      lower.contains('software caused connection abort') ||
      lower.contains('connection error') ||
      lower.contains('connection reset') ||
      lower.contains('network is unreachable')) {
    return 'We could not submit because the internet connection was interrupted. Please try again.';
  }

  return cleaned;
}

/// E4H `handleSessionExpired`, routed through this app's unauthenticated
/// wrapper.
void handleSessionExpired(BuildContext context) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(context.translate(i18.common.sessionExpired))),
  );
  context.read<AuthBloc>().add(const AuthEvent.logout());
  context.router.root.replaceAll(
    const [
      UnauthenticatedRouteWrapper(children: [WelcomeRoute()])
    ],
  );
}

/// E4H `repositories/cache_fallback.dart`. This app's
/// `NetworkErrorNormalizerInterceptor` rewrites `DioException.message`, so
/// the status-code checks are what actually match here.
bool isAuthenticationFailure(Object error) =>
    error is DioException &&
    (error.response?.statusCode == 401 ||
        error.response?.statusCode == 403 ||
        error.message == 'SESSION_EXPIRED');

bool matchesFacilityName(String? name, String? query) {
  final search = query?.trim().toLowerCase() ?? '';
  return search.isEmpty || (name ?? '').toLowerCase().contains(search);
}

/// E4H `utils/facility_list_filter.dart`.
List<T> filterFacilityList<T>(
  Iterable<T> records, {
  required String query,
  required String? filter,
  required String Function(T) id,
  required String? Function(T) name,
  required DateTime Function(T) date,
  List<String> bookmarkedIds = const [],
}) {
  final ranks = {
    for (var i = 0; i < bookmarkedIds.length; i++) bookmarkedIds[i]: i
  };
  final result = records
      .where((record) =>
          matchesFacilityName(name(record), query) &&
          (filter != 'BOOKMARKED' || ranks.containsKey(id(record))))
      .toList();
  if (filter == 'BOOKMARKED') {
    result.sort((a, b) => ranks[id(a)]!.compareTo(ranks[id(b)]!));
  } else if (filter == 'ASC' || filter == 'DESC') {
    result.sort((a, b) {
      final order = date(a).compareTo(date(b));
      if (order == 0) return id(a).compareTo(id(b));
      return filter == 'ASC' ? order : -order;
    });
  }
  return result;
}

/// E4H `utils/report_date_label.dart`: fallbacks for the newer workflow date
/// labels until server translations exist.
String reportDateLabel(String key, String Function(String) translate) {
  final translated = translate(key);
  if (translated != key) return translated;
  if (key == i18.amcCommon.approvedDate) return 'Approved Date';
  if (key == i18.amcCommon.rejectedDate) return 'Rejected Date';
  return translated;
}

/// E4H checks connectivity before saving a bookmark.
Future<void> ensureOnlineOrThrow() => NetworkService().ensureOnlineOrThrow();
