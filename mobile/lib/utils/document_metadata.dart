import 'package:digit_ui_components/services/location_bloc.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../model/solar_installation_draft.dart';

typedef DocumentLocationResolver = Map<String, dynamic>? Function();

/// Test hook only. Production obtains coordinates from the app-wide DIGIT
/// [LocationBloc].
DocumentLocationResolver? documentLocationOverride;

int _lastUidTimestamp = 0;

int _nextUidTimestamp() {
  final now = DateTime.now().millisecondsSinceEpoch;
  _lastUidTimestamp = now > _lastUidTimestamp ? now : _lastUidTimestamp + 1;
  return _lastUidTimestamp;
}

Map<String, dynamic>? currentDocumentLocation(BuildContext context) {
  final override = documentLocationOverride?.call();
  if (override != null) return override;
  try {
    final state = context.read<LocationBloc>().state;
    if (state.latitude == null || state.longitude == null) return null;
    return {
      'latitude': state.latitude.toString(),
      'longitude': state.longitude.toString(),
      'additionalDetails': null,
    };
  } catch (_) {
    return null;
  }
}

Map<String, dynamic>? observeDocumentLocation(BuildContext context) {
  final override = documentLocationOverride?.call();
  if (override != null) return override;
  try {
    final state = context.watch<LocationBloc>().state;
    if (state.latitude == null || state.longitude == null) return null;
    return {
      'latitude': state.latitude.toString(),
      'longitude': state.longitude.toString(),
      'additionalDetails': null,
    };
  } catch (_) {
    return null;
  }
}

SolarFileRef commitDocumentMetadata(
  BuildContext context,
  SolarFileRef file, {
  required String documentType,
  required String uidPrefix,
  int? index,
}) {
  final suffix = [
    _nextUidTimestamp().toString(),
    if (index != null) index.toString(),
  ].join('-');
  return file.copyWith(
    documentType: file.documentType ?? documentType,
    documentUid: file.documentUid ?? '$uidPrefix-$suffix',
    geoLocation: file.geoLocation ?? currentDocumentLocation(context),
  );
}

SolarFileRef refreshDocumentLocation(
  BuildContext context,
  SolarFileRef file,
) =>
    file.hasValidLocation
        ? file
        : file.copyWith(geoLocation: currentDocumentLocation(context));

bool documentsReady(Iterable<SolarFileRef?> files) =>
    files.whereType<SolarFileRef>().every((file) =>
        file.isRemote ||
        (file.hasValidLocation && file.documentUid?.trim().isNotEmpty == true));
