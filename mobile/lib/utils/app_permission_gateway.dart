import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import 'extensions.dart';
import 'i18_key_constants.dart' as i18;

enum AppPermissionStatus { granted, denied, permanentlyDenied }

typedef NativePermissionRequest = Future<PermissionStatus> Function(
  Permission permission,
);

abstract interface class AppPermissionGateway {
  Future<AppPermissionStatus> requestCamera();

  Future<AppPermissionStatus> requestForegroundLocation();

  Future<bool> openSettings();
}

class PermissionHandlerGateway implements AppPermissionGateway {
  PermissionHandlerGateway({
    NativePermissionRequest? requestPermission,
    Future<bool> Function()? openSettings,
  })  : _requestPermission = requestPermission,
        _openSettings = openSettings;

  final NativePermissionRequest? _requestPermission;
  final Future<bool> Function()? _openSettings;

  Future<AppPermissionStatus>? _cameraRequest;
  Future<AppPermissionStatus>? _locationRequest;

  @override
  Future<AppPermissionStatus> requestCamera() {
    return _coalesced(
      current: _cameraRequest,
      assign: (request) => _cameraRequest = request,
      clear: () => _cameraRequest = null,
      permission: Permission.camera,
    );
  }

  @override
  Future<AppPermissionStatus> requestForegroundLocation() {
    return _coalesced(
      current: _locationRequest,
      assign: (request) => _locationRequest = request,
      clear: () => _locationRequest = null,
      permission: Permission.locationWhenInUse,
    );
  }

  Future<AppPermissionStatus> _coalesced({
    required Future<AppPermissionStatus>? current,
    required ValueChanged<Future<AppPermissionStatus>> assign,
    required VoidCallback clear,
    required Permission permission,
  }) async {
    if (current != null) return current;
    final request = _request(permission);
    assign(request);
    try {
      return await request;
    } finally {
      clear();
    }
  }

  Future<AppPermissionStatus> _request(Permission permission) async {
    try {
      final status =
          await (_requestPermission?.call(permission) ?? permission.request());
      if (status.isGranted || status.isLimited) {
        return AppPermissionStatus.granted;
      }
      if (status.isPermanentlyDenied || status.isRestricted) {
        return AppPermissionStatus.permanentlyDenied;
      }
      return AppPermissionStatus.denied;
    } catch (_) {
      return AppPermissionStatus.denied;
    }
  }

  @override
  Future<bool> openSettings() async {
    try {
      return await (_openSettings?.call() ?? openAppSettings());
    } catch (_) {
      return false;
    }
  }
}

final AppPermissionGateway defaultPermissionGateway =
    PermissionHandlerGateway();

Future<bool> ensureCameraPermission(
  BuildContext context, {
  AppPermissionGateway? gateway,
}) async {
  final permissions = gateway ?? defaultPermissionGateway;
  final status = await permissions.requestCamera();
  if (!context.mounted) return false;
  return _handlePermissionResult(
    context,
    status: status,
    deniedMessage: context.translate(i18.machineForm.cameraPermissionRequired),
    gateway: permissions,
  );
}

Future<void> requestAssetWorkflowPermissions(
  BuildContext context, {
  AppPermissionGateway? gateway,
}) async {
  final permissions = gateway ?? defaultPermissionGateway;
  final cameraStatus = await permissions.requestCamera();
  if (!context.mounted) return;
  _handlePermissionResult(
    context,
    status: cameraStatus,
    deniedMessage: context.translate(i18.machineForm.cameraPermissionRequired),
    gateway: permissions,
  );

  final locationStatus = await permissions.requestForegroundLocation();
  if (!context.mounted) return;
  _handlePermissionResult(
    context,
    status: locationStatus,
    deniedMessage:
        context.translate(i18.machineForm.locationPermissionRequired),
    gateway: permissions,
  );
}

bool _handlePermissionResult(
  BuildContext context, {
  required AppPermissionStatus status,
  required String deniedMessage,
  required AppPermissionGateway gateway,
}) {
  if (status == AppPermissionStatus.granted) return true;

  final messenger = ScaffoldMessenger.of(context);
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(deniedMessage),
        action: status == AppPermissionStatus.permanentlyDenied
            ? SnackBarAction(
                label: context.translate(i18.common.settings),
                onPressed: gateway.openSettings,
              )
            : null,
      ),
    );
  return false;
}
