import 'dart:convert';

import 'package:flutter/services.dart';

typedef MockAssetReader = Future<String> Function(String path);

/// Temporary adapter that makes the bundled Solar component fixture look
/// exactly like backend `activityFacility.additionalDetails` data.
///
/// No fixture values live in Dart. When the JSON asset is removed this
/// becomes a no-op, while real backend values always remain authoritative.
class ActivityFacilityMockOverlay {
  ActivityFacilityMockOverlay({
    MockAssetReader? readAsset,
    this.assetPath = 'assets/mocks/solar_component_defaults.json',
  }) : _readAsset = readAsset ?? rootBundle.loadString;

  final MockAssetReader _readAsset;
  final String assetPath;
  Future<Map<String, dynamic>>? _cachedDefaults;

  Future<Map<String, dynamic>> loadDefaults() =>
      _cachedDefaults ??= _readDefaults();

  Future<Map<String, dynamic>> _readDefaults() async {
    try {
      final decoded = jsonDecode(await _readAsset(assetPath));
      return decoded is Map
          ? Map<String, dynamic>.from(decoded)
          : const <String, dynamic>{};
    } catch (_) {
      return const <String, dynamic>{};
    }
  }

  Future<Map<String, dynamic>> apply(
    Map<String, dynamic> workflowJson,
  ) async {
    final activityValue = workflowJson['activityFacility'];
    if (activityValue is! Map) return workflowJson;

    final activity = Map<String, dynamic>.from(activityValue);
    final additional = activity['additionalDetails'] is Map
        ? Map<String, dynamic>.from(activity['additionalDetails'] as Map)
        : <String, dynamic>{};
    final componentType =
        additional['componentType']?.toString().trim().toUpperCase();
    if (componentType == 'MACHINE') return workflowJson;

    final defaults = await loadDefaults();
    if (defaults.isEmpty) return workflowJson;

    var changed = false;
    for (final component in const ['battery', 'inverter', 'panel']) {
      final defaultValue = defaults[component];
      if (defaultValue is! Map) continue;
      final backendValue = additional[component];
      final merged = Map<String, dynamic>.from(defaultValue);
      if (backendValue is Map) {
        for (final entry in backendValue.entries) {
          if (_hasValue(entry.value)) {
            merged[entry.key.toString()] = entry.value;
          }
        }
      }
      additional[component] = merged;
      changed = true;
    }
    if (!changed) return workflowJson;

    activity['additionalDetails'] = additional;
    return <String, dynamic>{
      ...workflowJson,
      'activityFacility': activity,
    };
  }
}

bool _hasValue(dynamic value) =>
    value != null && (value is! String || value.trim().isNotEmpty);

final activityFacilityMockOverlay = ActivityFacilityMockOverlay();
