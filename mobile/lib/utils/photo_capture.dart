import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../router/app_router.dart';

/// Keeps Android photo capture inside the report's Flutter activity.
Future<XFile?> pickPhoto(
  BuildContext context,
  ImageSource source, {
  int? imageQuality,
  double? maxWidth,
  double? maxHeight,
  bool requestFullMetadata = true,
}) async {
  if (!kIsWeb &&
      defaultTargetPlatform == TargetPlatform.android &&
      source == ImageSource.camera) {
    // Generated pages in this app use dynamic results; narrow at this boundary.
    final photo = await context.router.push(const AndroidCameraCaptureRoute());
    return photo as XFile?;
  }
  return ImagePicker().pickImage(
    source: source,
    imageQuality: imageQuality,
    maxWidth: maxWidth,
    maxHeight: maxHeight,
    requestFullMetadata: requestFullMetadata,
  );
}
