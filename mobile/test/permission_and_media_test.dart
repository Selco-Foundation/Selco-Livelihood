import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:digit_ui_components/digit_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:livelihood/blocs/localization/app_localization.dart';
import 'package:livelihood/data/nosql/localization.dart' as nosql;
import 'package:livelihood/utils/i18_key_constants.dart' as i18;
import 'package:livelihood/pages/digit_scanner_page.dart';
import 'package:livelihood/utils/app_permission_gateway.dart';
import 'package:livelihood/widgets/image_uploader.dart';
import 'package:livelihood/widgets/machine_media_picker.dart';
import 'package:livelihood/widgets/video_uploader.dart';
import 'package:permission_handler/permission_handler.dart';

final Map<String, String> _localizationMessages = {};

String tr(String code) => _localizationMessages[code] ?? code;

class _FakePermissionGateway implements AppPermissionGateway {
  _FakePermissionGateway({
    this.camera = AppPermissionStatus.granted,
    this.location = AppPermissionStatus.granted,
  });

  AppPermissionStatus camera;
  AppPermissionStatus location;
  int cameraRequests = 0;
  int locationRequests = 0;
  int settingsOpens = 0;

  @override
  Future<AppPermissionStatus> requestCamera() async {
    cameraRequests++;
    return camera;
  }

  @override
  Future<AppPermissionStatus> requestForegroundLocation() async {
    locationRequests++;
    return location;
  }

  @override
  Future<bool> openSettings() async {
    settingsOpens++;
    return true;
  }
}

void main() {
  setUpAll(() {
    // See test/app_test.dart for why: renders real production-like text
    // under `flutter test` instead of the raw SCREAMING_SNAKE_CASE fallback.
    final localizationFile =
        File('assets/localization/rainmaker-common_en_IN.json');
    final entries = jsonDecode(localizationFile.readAsStringSync()) as List;
    for (final entry in entries) {
      final map = entry as Map<String, dynamic>;
      _localizationMessages[map['code'] as String] = map['message'] as String;
    }
    AppLocalizations.debugSeedLocalizations(
      entries.map((entry) {
        final map = entry as Map<String, dynamic>;
        return nosql.Localization()
          ..code = map['code'] as String
          ..message = map['message'] as String
          ..module = map['module'] as String
          ..locale = map['locale'] as String;
      }).toList(),
    );
    addTearDown(() => AppLocalizations.debugSeedLocalizations(const []));
  });

  test('permission gateway coalesces repeated camera requests', () async {
    final nativeResult = Completer<PermissionStatus>();
    var nativeCalls = 0;
    final gateway = PermissionHandlerGateway(
      requestPermission: (_) {
        nativeCalls++;
        return nativeResult.future;
      },
    );

    final first = gateway.requestCamera();
    final second = gateway.requestCamera();
    expect(nativeCalls, 1);

    nativeResult.complete(PermissionStatus.granted);
    expect(await first, AppPermissionStatus.granted);
    expect(await second, AppPermissionStatus.granted);
  });

  test('permission gateway maps denied and permanently denied states',
      () async {
    final statuses = <PermissionStatus>[
      PermissionStatus.denied,
      PermissionStatus.permanentlyDenied,
    ];
    final gateway = PermissionHandlerGateway(
      requestPermission: (_) async => statuses.removeAt(0),
    );

    expect(await gateway.requestCamera(), AppPermissionStatus.denied);
    expect(
      await gateway.requestForegroundLocation(),
      AppPermissionStatus.permanentlyDenied,
    );
  });

  testWidgets('permanently denied permission offers app settings',
      (tester) async {
    final gateway = _FakePermissionGateway(
      camera: AppPermissionStatus.permanentlyDenied,
    );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => ensureCameraPermission(
                context,
                gateway: gateway,
              ),
              child: const Text('Request camera'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Request camera'));
    await tester.pumpAndSettle();
    expect(find.text(tr(i18.machineForm.cameraPermissionRequired)),
        findsOneWidget);
    expect(find.text(tr(i18.common.settings)), findsOneWidget);

    await tester.tap(find.text(tr(i18.common.settings)));
    await tester.pump();
    expect(gateway.settingsOpens, 1);
  });

  testWidgets('asset workflow requests camera and foreground location',
      (tester) async {
    final gateway = _FakePermissionGateway(
      location: AppPermissionStatus.denied,
    );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => requestAssetWorkflowPermissions(
                context,
                gateway: gateway,
              ),
              child: const Text('Request workflow permissions'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Request workflow permissions'));
    await tester.pumpAndSettle();
    expect(gateway.cameraRequests, 1);
    expect(gateway.locationRequests, 1);
    expect(find.text(tr(i18.machineForm.locationPermissionRequired)),
        findsOneWidget);
  });

  testWidgets('scanner does not navigate when camera permission is denied',
      (tester) async {
    final gateway = _FakePermissionGateway(
      camera: AppPermissionStatus.denied,
    );
    String? result = 'not-called';
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                result = await openDigitScanner(
                  context,
                  permissionGateway: gateway,
                );
              },
              child: const Text('Scan'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Scan'));
    await tester.pumpAndSettle();
    expect(result, isNull);
    expect(gateway.cameraRequests, 1);
    expect(find.text(tr(i18.machineForm.cameraPermissionRequired)),
        findsOneWidget);
  });

  testWidgets('image camera picker is not invoked after denial',
      (tester) async {
    final gateway = _FakePermissionGateway(
      camera: AppPermissionStatus.denied,
    );
    var pickerCalls = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: ImageUploader(
            permissionGateway: gateway,
            pickMedia: (_, __) async {
              pickerCalls++;
              return XFile('/tmp/image.jpg');
            },
            onImageSelected: (_) {},
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('image-uploader-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('image-uploader-camera')));
    await tester.pumpAndSettle();

    expect(gateway.cameraRequests, 1);
    expect(pickerCalls, 0);
    expect(find.text(tr(i18.machineForm.cameraPermissionRequired)),
        findsOneWidget);
  });

  testWidgets('gallery picker remains available without camera permission',
      (tester) async {
    final gateway = _FakePermissionGateway(
      camera: AppPermissionStatus.denied,
    );
    var pickerCalls = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: ImageUploader(
            permissionGateway: gateway,
            pickMedia: (_, source) async {
              pickerCalls++;
              expect(source, ImageSource.gallery);
              return XFile('/tmp/gallery.jpg');
            },
            onImageSelected: (_) {},
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('image-uploader-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('image-uploader-files')));
    await tester.pumpAndSettle();

    expect(gateway.cameraRequests, 0);
    expect(pickerCalls, 1);
    expect(
        find.byKey(const ValueKey('image-uploader-preview')), findsOneWidget);
  });

  testWidgets('video camera picker proceeds after permission is granted',
      (tester) async {
    final gateway = _FakePermissionGateway();
    var pickerCalls = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: VideoUploader(
            permissionGateway: gateway,
            pickMedia: (_, __) async {
              pickerCalls++;
              return XFile('/tmp/video.mp4', name: 'video.mp4');
            },
            onVideosSelected: (_) {},
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('video-uploader-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('video-uploader-camera')));
    await tester.pumpAndSettle();

    expect(gateway.cameraRequests, 1);
    expect(pickerCalls, 1);
    expect(find.text('video.mp4'), findsOneWidget);
  });

  testWidgets('machine camera picker is not invoked after denial',
      (tester) async {
    final gateway = _FakePermissionGateway(
      camera: AppPermissionStatus.denied,
    );
    var pickerCalls = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: DigitTheme.instance.mobileTheme,
        home: Scaffold(
          body: MachineMediaPicker(
            kind: MachineMediaKind.image,
            selectedFile: null,
            permissionGateway: gateway,
            pickMedia: (_, __) async {
              pickerCalls++;
              return XFile('/tmp/image.jpg');
            },
            onChanged: (_) {},
          ),
        ),
      ),
    );

    await tester.tap(find.byKey(const ValueKey('machine-media-empty')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('machine-picker-camera')));
    await tester.pumpAndSettle();

    expect(gateway.cameraRequests, 1);
    expect(pickerCalls, 0);
    expect(find.text(tr(i18.machineForm.cameraPermissionRequired)),
        findsOneWidget);
  });
}
