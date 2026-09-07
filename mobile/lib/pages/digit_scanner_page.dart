import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:digit_scanner/blocs/app_localization.dart';
import 'package:digit_scanner/blocs/scanner.dart';
import 'package:digit_scanner/widgets/vision_detector_views/painters/barcode_detector_painter.dart';
import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/atoms/input_wrapper.dart';
import 'package:digit_ui_components/widgets/atoms/pop_up_card.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:digit_ui_components/widgets/molecules/show_pop_up.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_barcode_scanning/google_mlkit_barcode_scanning.dart';
import 'package:image_picker/image_picker.dart';
import 'package:reactive_forms/reactive_forms.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../router/app_router.dart';
import '../utils/app_permission_gateway.dart';

typedef ScannerGalleryPicker = Future<XFile?> Function();

Future<String?> openDigitScanner(
  BuildContext context, {
  AppPermissionGateway? permissionGateway,
}) async {
  final granted = await ensureCameraPermission(
    context,
    gateway: permissionGateway,
  );
  if (!granted || !context.mounted) return null;

  final scannerBloc = context.read<DigitScannerBloc>();
  scannerBloc.add(
    const DigitScannerEvent.handleScanner(
      qrCode: [],
      barCode: [],
      overwrite: true,
      isGS1: false,
      quantity: 10,
    ),
  );

  final routeResult = await context.router.push<dynamic>(
    DigitScannerRoute(
      quantity: 10,
      isGS1code: false,
      singleValue: true,
    ),
  );
  final selected = routeResult is String ? routeResult : null;

  final fallback = scannerBloc.state.qrCodes.isEmpty
      ? null
      : scannerBloc.state.qrCodes.last.trim();
  scannerBloc.add(
    const DigitScannerEvent.handleScanner(
      qrCode: [],
      barCode: [],
      overwrite: true,
      isGS1: false,
      quantity: 10,
    ),
  );
  return selected?.trim().isNotEmpty == true ? selected!.trim() : fallback;
}

/// In-memory adaptation of E4H's customized scanner page.
@RoutePage()
class DigitScannerPage extends StatefulWidget {
  const DigitScannerPage({
    super.key,
    this.quantity = 10,
    this.isGS1code = false,
    this.singleValue = true,
    this.galleryPicker,
  });

  final int quantity;
  final bool isGS1code;
  final bool singleValue;
  final ScannerGalleryPicker? galleryPicker;

  @override
  State<DigitScannerPage> createState() => _DigitScannerPageState();
}

class _DigitScannerPageState extends State<DigitScannerPage>
    with WidgetsBindingObserver {
  static const _manualCodeFormKey = 'manualCode';

  final BarcodeScanner _barcodeScanner = BarcodeScanner();
  List<CameraDescription> _cameras = const [];
  CameraController? _cameraController;
  CameraLensDirection _cameraLensDirection = CameraLensDirection.back;
  CustomPaint? _customPaint;
  String? _cameraText;
  bool _cameraLoading = true;
  bool _cameraUnavailable = false;
  bool _busy = false;
  bool _pickingGallery = false;
  bool _manualEntry = false;
  bool _flashEnabled = false;
  int _cameraGeneration = 0;

  static const _orientations = <DeviceOrientation, int>{
    DeviceOrientation.portraitUp: 0,
    DeviceOrientation.landscapeLeft: 90,
    DeviceOrientation.portraitDown: 180,
    DeviceOrientation.landscapeRight: 270,
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    final generation = ++_cameraGeneration;
    final previous = _cameraController;
    _cameraController = null;
    if (previous != null) unawaited(_disposeCamera(previous));

    if (mounted) {
      setState(() {
        _cameraLoading = true;
        _cameraUnavailable = false;
        _flashEnabled = false;
      });
    }

    CameraController? controller;
    try {
      final cameras = await availableCameras();
      if (!mounted || generation != _cameraGeneration) return;
      final index = cameras.indexWhere(
        (camera) => camera.lensDirection == _cameraLensDirection,
      );
      if (index < 0) {
        setState(() {
          _cameraLoading = false;
          _cameraUnavailable = true;
        });
        return;
      }
      final camera = cameras[index];
      controller = CameraController(
        camera,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: Platform.isAndroid
            ? ImageFormatGroup.nv21
            : ImageFormatGroup.bgra8888,
      );
      await controller.initialize();
      if (!mounted || generation != _cameraGeneration) {
        await _disposeCamera(controller);
        return;
      }
      await controller.startImageStream(_processCameraImage);
      if (!mounted || generation != _cameraGeneration) {
        await _disposeCamera(controller);
        return;
      }
      setState(() {
        _cameras = cameras;
        _cameraController = controller;
        _cameraLoading = false;
      });
    } catch (_) {
      if (controller != null) await _disposeCamera(controller);
      if (!mounted || generation != _cameraGeneration) return;
      setState(() {
        _cameraController = null;
        _cameraLoading = false;
        _cameraUnavailable = true;
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cameraGeneration++;
    final controller = _cameraController;
    _cameraController = null;
    if (controller != null) unawaited(_disposeCamera(controller));
    _barcodeScanner.close();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (_cameraController == null && !_manualEntry) _initializeCamera();
      return;
    }
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      _cameraGeneration++;
      final controller = _cameraController;
      _cameraController = null;
      if (controller != null) unawaited(_disposeCamera(controller));
      if (mounted) {
        setState(() {
          _cameraLoading = true;
          _flashEnabled = false;
        });
      }
    }
  }

  Future<void> _disposeCamera(CameraController controller) async {
    try {
      if (controller.value.isStreamingImages) {
        await controller.stopImageStream();
      }
    } catch (_) {
      // The platform may already have released the camera during a lifecycle
      // transition.
    }
    try {
      await controller.dispose();
    } catch (_) {
      // Disposal is best-effort and must never terminate the app.
    }
  }

  void _processCameraImage(CameraImage image) {
    final inputImage = _inputImageFromCameraImage(image);
    if (inputImage != null) _processImage(inputImage);
  }

  InputImage? _inputImageFromCameraImage(CameraImage image) {
    final controller = _cameraController;
    if (controller == null) return null;
    final camera = controller.description;
    final sensorOrientation = camera.sensorOrientation;
    InputImageRotation? rotation;
    if (Platform.isIOS) {
      rotation = InputImageRotationValue.fromRawValue(sensorOrientation);
    } else if (Platform.isAndroid) {
      var compensation = _orientations[controller.value.deviceOrientation];
      if (compensation == null) return null;
      compensation = camera.lensDirection == CameraLensDirection.front
          ? (sensorOrientation + compensation) % 360
          : (sensorOrientation - compensation + 360) % 360;
      rotation = InputImageRotationValue.fromRawValue(compensation);
    }
    if (rotation == null) return null;

    final format = InputImageFormatValue.fromRawValue(image.format.raw);
    if (format == null ||
        (Platform.isAndroid &&
            format != InputImageFormat.nv21 &&
            format != InputImageFormat.yv12 &&
            format != InputImageFormat.yuv_420_888) ||
        (Platform.isIOS &&
            format != InputImageFormat.bgra8888 &&
            format != InputImageFormat.yuv420) ||
        image.planes.isEmpty) {
      return null;
    }

    final bytes = WriteBuffer();
    for (final plane in image.planes) {
      bytes.putUint8List(plane.bytes);
    }
    return InputImage.fromBytes(
      bytes: bytes.done().buffer.asUint8List(),
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: rotation,
        format: format,
        bytesPerRow: image.planes.first.bytesPerRow,
      ),
    );
  }

  Future<void> _toggleFlash() async {
    final controller = _cameraController;
    if (controller == null || !controller.value.isInitialized) return;
    try {
      await controller.setFlashMode(
        _flashEnabled ? FlashMode.off : FlashMode.torch,
      );
      if (mounted) setState(() => _flashEnabled = !_flashEnabled);
    } catch (_) {
      if (!mounted) return;
      Toast.showToast(
        context,
        type: ToastType.error,
        message: context.translate(i18.scanner.scannerUnavailable),
      );
    }
  }

  Future<void> _switchCamera() async {
    if (_cameraLoading || _cameras.length < 2) return;
    final desired = _cameraLensDirection == CameraLensDirection.back
        ? CameraLensDirection.front
        : CameraLensDirection.back;
    if (!_cameras.any((camera) => camera.lensDirection == desired)) return;
    _cameraLensDirection = desired;
    await _initializeCamera();
  }

  void _openManualEntry() {
    _cameraGeneration++;
    final controller = _cameraController;
    _cameraController = null;
    if (controller != null) unawaited(_disposeCamera(controller));
    setState(() {
      _manualEntry = true;
      _cameraLoading = true;
      _flashEnabled = false;
    });
  }

  void _closeManualEntry() {
    setState(() {
      _manualEntry = false;
    });
    _initializeCamera();
  }

  Future<void> _processImage(InputImage inputImage) async {
    if (_busy || !mounted) return;
    final current = context.read<DigitScannerBloc>().state;
    if (widget.singleValue && current.qrCodes.isNotEmpty) return;
    _busy = true;
    try {
      final barcodes = await _barcodeScanner.processImage(inputImage);
      if (!mounted || barcodes.isEmpty) return;
      final code =
          (barcodes.first.displayValue ?? barcodes.first.rawValue)?.trim();
      if (code == null || code.isEmpty) return;
      context.read<DigitScannerBloc>().add(
            DigitScannerEvent.handleScanner(
              qrCode: [code],
              barCode: const [],
              isGS1: widget.isGS1code,
              quantity: widget.quantity,
            ),
          );
      if (inputImage.metadata?.size != null &&
          inputImage.metadata?.rotation != null) {
        setState(() {
          _customPaint = CustomPaint(
            painter: BarcodeDetectorPainter(
              barcodes,
              inputImage.metadata!.size,
              inputImage.metadata!.rotation,
              _cameraLensDirection,
            ),
          );
        });
      } else {
        setState(() => _cameraText = 'Barcodes found: ${barcodes.length}');
      }
    } catch (_) {
      if (mounted) {
        Toast.showToast(
          context,
          type: ToastType.error,
          message: 'Resource scan failed',
        );
      }
    } finally {
      _busy = false;
    }
  }

  Future<void> _pickAndScanFromGallery() async {
    if (_pickingGallery) return;
    setState(() => _pickingGallery = true);
    try {
      final picked = await (widget.galleryPicker?.call() ??
          ImagePicker().pickImage(
            source: ImageSource.gallery,
            requestFullMetadata: false,
          ));
      if (!mounted || picked == null) return;
      final barcodes = await _barcodeScanner.processImage(
        InputImage.fromFilePath(picked.path),
      );
      if (!mounted) return;
      final values = barcodes
          .map((barcode) => barcode.displayValue ?? barcode.rawValue)
          .whereType<String>()
          .map((value) => value.trim())
          .where((value) => value.isNotEmpty)
          .toList();
      if (values.isEmpty) {
        Toast.showToast(
          context,
          type: ToastType.error,
          message: 'No code found in photo',
        );
        return;
      }
      context.read<DigitScannerBloc>().add(
            DigitScannerEvent.handleScanner(
              qrCode: widget.singleValue ? [values.first] : values,
              barCode: const [],
              isGS1: widget.isGS1code,
              quantity: widget.quantity,
            ),
          );
    } catch (_) {
      if (mounted) {
        Toast.showToast(
          context,
          type: ToastType.error,
          message: 'Failed to read photo',
        );
      }
    } finally {
      if (mounted) setState(() => _pickingGallery = false);
    }
  }

  void _removeCode(int index, DigitScannerState state) {
    final updated = List<String>.of(state.qrCodes)..removeAt(index);
    context.read<DigitScannerBloc>().add(
          DigitScannerEvent.handleScanner(
            qrCode: updated,
            barCode: const [],
            overwrite: true,
            isGS1: widget.isGS1code,
            quantity: widget.quantity,
          ),
        );
    setState(() => _customPaint = null);
  }

  void _completeSelection(DigitScannerState state) {
    if (state.qrCodes.isEmpty) return;
    final value = state.qrCodes.last.trim();
    if (value.isEmpty) return;
    Navigator.of(context).pop(value);
  }

  Future<void> _confirmSelection(
    DigitScannerState state, {
    VoidCallback? onKeepScanning,
  }) async {
    final requiredCount = widget.singleValue ? 1 : widget.quantity;
    if (state.qrCodes.length < requiredCount) {
      Toast.showToast(
        context,
        type: ToastType.error,
        message: 'Please scan $requiredCount resource(s).',
      );
      return;
    }
    await showCustomPopup(
      context: context,
      builder: (popupContext) => Popup(
        title: 'Confirm Selection',
        description:
            'You have scanned $requiredCount resource(s). Do you want to submit?',
        type: PopUpType.simple,
        onOutsideTap: () => Navigator.of(popupContext).pop(),
        actions: [
          DigitButton(
            label: context.translate(i18.common.submit),
            type: DigitButtonType.primary,
            size: DigitButtonSize.large,
            onPressed: () {
              Navigator.of(popupContext, rootNavigator: true).pop();
              _completeSelection(state);
            },
          ),
          DigitButton(
            label: 'Keep Scanning',
            type: DigitButtonType.secondary,
            size: DigitButtonSize.large,
            onPressed: () {
              Navigator.of(popupContext, rootNavigator: true).pop();
              onKeepScanning?.call();
            },
          ),
        ],
      ),
    );
  }

  FormGroup _buildManualForm() => fb.group(<String, Object>{
        _manualCodeFormKey: FormControl<String>(),
      });

  void _submitManual(FormGroup form) {
    final value =
        form.control(_manualCodeFormKey).value?.toString().trim() ?? '';
    if (value.isEmpty) {
      Toast.showToast(
        context,
        type: ToastType.error,
        message: context.translate(i18.scanner.enterManualCode),
      );
      return;
    }
    context.read<DigitScannerBloc>().add(
          DigitScannerEvent.handleScanner(
            qrCode: [value],
            barCode: const [],
            overwrite: widget.singleValue,
            isGS1: widget.isGS1code,
            quantity: widget.quantity,
          ),
        );
    _confirmSelection(
      DigitScannerState(
        qrCodes: [value],
        isGS1: widget.isGS1code,
        quantity: widget.quantity,
      ),
      onKeepScanning: _closeManualEntry,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Localizations.override(
      context: context,
      locale: const Locale('en', 'IN'),
      delegates: [
        ScannerLocalization.getDelegate(
          Future.value(_scannerMessages),
          _scannerLanguages,
        ),
      ],
      child: BlocBuilder<DigitScannerBloc, DigitScannerState>(
        builder: (context, state) => Scaffold(
          body: _manualEntry
              ? _manualEntryWidget(context)
              : _scannerWidget(context, state),
        ),
      ),
    );
  }

  Widget _manualEntryWidget(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    return ReactiveFormBuilder(
      form: _buildManualForm,
      builder: (context, form, child) => ScrollableContent(
        key: const ValueKey('scanner-manual-page'),
        backgroundColor: theme.colorScheme.onError,
        header: GestureDetector(
          key: const ValueKey('scanner-manual-close'),
          onTap: _closeManualEntry,
          child: Align(
            alignment: Alignment.topRight,
            child: Icon(Icons.close, color: theme.colorTheme.text.primary),
          ),
        ),
        footer: Padding(
          padding: const EdgeInsets.all(spacer4),
          child: DigitButton(
            key: const ValueKey('scanner-manual-submit'),
            mainAxisSize: MainAxisSize.max,
            label: context.translate(i18.common.submit),
            type: DigitButtonType.primary,
            size: DigitButtonSize.large,
            onPressed: () => _submitManual(form),
          ),
        ),
        children: [
          DigitCard(
            children: [
              Align(
                alignment: Alignment.topLeft,
                child: Text(
                  context.translate(i18.scanner.enterManualCode),
                  style: textTheme.headingL.copyWith(
                    color: theme.colorTheme.text.primary,
                  ),
                ),
              ),
              ReactiveWrapperField<String>(
                formControlName: _manualCodeFormKey,
                builder: (field) => InputField(
                  key: const ValueKey('scanner-manual-input'),
                  label: context.translate(i18.assetFlow.serialNumber),
                  errorMessage: field.errorText,
                  isRequired: true,
                  type: InputType.text,
                  onChange: (value) {
                    form.control(_manualCodeFormKey).value = value;
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _scannerWidget(BuildContext context, DigitScannerState state) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    return Stack(
      key: const ValueKey('scanner-camera-stack'),
      children: [
        Positioned.fill(child: _cameraLayer(theme)),
        Positioned(
          key: const ValueKey('scanner-flash-control'),
          top: spacer1 * 1.5,
          left: spacer1,
          child: InkWell(
            onTap: _cameraController?.value.isInitialized == true
                ? _toggleFlash
                : null,
            child: Row(
              children: [
                Icon(
                  _flashEnabled ? Icons.flashlight_off : Icons.flashlight_on,
                  color: theme.colorScheme.secondary,
                ),
                Text(
                  _flashEnabled ? 'Flash Off' : 'Flash On',
                  style: TextStyle(color: theme.colorScheme.secondary),
                ),
              ],
            ),
          ),
        ),
        Positioned(
          key: const ValueKey('scanner-back-control'),
          top: spacer1 * 1.5,
          right: spacer1,
          child: IconButton(
            onPressed: () => context.router.maybePop(),
            icon: Icon(
              Icons.arrow_back_ios_new,
              color: theme.colorScheme.secondary,
            ),
          ),
        ),
        if (_cameras.length > 1)
          Positioned(
            key: const ValueKey('scanner-switch-camera-control'),
            right: spacer2,
            bottom: spacer2,
            child: IconButton.filled(
              onPressed: _cameraLoading ? null : _switchCamera,
              icon: const Icon(Icons.flip_camera_android),
            ),
          ),
        Padding(
          key: const ValueKey('scanner-top-label'),
          padding: const EdgeInsets.only(top: spacer12),
          child: Align(
            alignment: Alignment.topCenter,
            child: Text(
              'Scanner',
              style: TextStyle(
                color: theme.colorScheme.onError,
                fontSize: 16,
              ),
            ),
          ),
        ),
        Center(child: _manualGalleryOverlay(theme, textTheme)),
        _scannedResourcePanel(theme, textTheme, state),
      ],
    );
  }

  Widget _cameraLayer(ThemeData theme) {
    if (_cameraLoading) {
      return Container(
        color: theme.colorScheme.onSurfaceVariant.withOpacity(.5),
        alignment: Alignment.center,
        child: const CircularProgressIndicator(),
      );
    }
    if (_cameraUnavailable || _cameraController == null) {
      return Container(
        color: theme.colorScheme.onSurfaceVariant.withOpacity(.5),
        alignment: Alignment.center,
        child: Text(
          context.translate(i18.scanner.scannerUnavailable),
          textAlign: TextAlign.center,
          style: TextStyle(color: theme.colorScheme.onError),
        ),
      );
    }
    return CameraPreview(
      _cameraController!,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (_customPaint != null) _customPaint!,
          if (_cameraText != null)
            Align(
              alignment: Alignment.bottomCenter,
              child: Text(
                _cameraText!,
                style: TextStyle(color: theme.colorScheme.onError),
              ),
            ),
        ],
      ),
    );
  }

  Widget _manualGalleryOverlay(ThemeData theme, dynamic textTheme) => Align(
        alignment: Alignment.center,
        widthFactor: 2,
        child: Padding(
          padding: const EdgeInsets.only(top: spacer8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: spacer1),
                child: Text(
                  'Manual Scan',
                  style: textTheme.bodyL.copyWith(
                    color: theme.colorTheme.paper.primary,
                  ),
                ),
              ),
              GestureDetector(
                key: const ValueKey('scanner-manual-link'),
                onTap: _openManualEntry,
                child: Text(
                  context.translate(i18.scanner.enterManualCode),
                  style: textTheme.headingL.copyWith(
                    color: theme.colorTheme.primary.primary1,
                    decoration: TextDecoration.underline,
                    decorationColor: theme.colorTheme.primary.primary1,
                  ),
                ),
              ),
              const SizedBox(height: spacer4),
              InkWell(
                key: const ValueKey('scanner-gallery-link'),
                onTap: _pickAndScanFromGallery,
                child: Text(
                  context.translate(i18.scanner.uploadFromGallery),
                  style: textTheme.headingL.copyWith(
                    color: theme.colorTheme.primary.primary1,
                    decoration: TextDecoration.underline,
                    decorationColor: theme.colorTheme.primary.primary1,
                  ),
                ),
              ),
            ],
          ),
        ),
      );

  Widget _scannedResourcePanel(
    ThemeData theme,
    dynamic textTheme,
    DigitScannerState state,
  ) =>
      Stack(
        children: [
          Positioned(
            bottom: 0,
            width: MediaQuery.sizeOf(context).width,
            child: DigitCard(
              key: const ValueKey('scanner-submit-card'),
              margin: const EdgeInsets.only(top: spacer1),
              padding:
                  const EdgeInsets.fromLTRB(spacer3, spacer1, spacer3, spacer1),
              children: [
                DigitButton(
                  key: const ValueKey('scanner-submit-button'),
                  label: context.translate(i18.common.submit),
                  size: DigitButtonSize.large,
                  mainAxisSize: MainAxisSize.max,
                  type: DigitButtonType.primary,
                  onPressed: () => _confirmSelection(state),
                ),
              ],
            ),
          ),
          Positioned(
            key: const ValueKey('scanner-result-panel'),
            bottom: spacer1 * 10,
            height: state.qrCodes.length < 2
                ? state.qrCodes.isEmpty
                    ? 64
                    : 120
                : MediaQuery.sizeOf(context).height / 4,
            width: MediaQuery.sizeOf(context).width,
            child: Container(
              decoration: BoxDecoration(
                color: theme.colorScheme.onError,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(spacer1 + 4),
                ),
              ),
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(
                      spacer3,
                      spacer2,
                      0,
                      spacer2,
                    ),
                    child: Text(
                      '${state.qrCodes.length} Resources Scanned',
                      style: textTheme.headingM.copyWith(
                        color: theme.colorTheme.text.primary,
                      ),
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      itemCount: state.qrCodes.length,
                      itemBuilder: (_, index) => ListTile(
                        title: Container(
                          margin:
                              const EdgeInsets.symmetric(horizontal: spacer1),
                          height: spacer9,
                          decoration: BoxDecoration(
                            color: DigitTheme.instance.colorScheme.surface,
                            border: Border.all(
                              color: DigitTheme.instance.colorScheme.outline,
                            ),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          padding: const EdgeInsets.all(spacer2),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Flexible(
                                child: Text(
                                  state.qrCodes[index].length > 20
                                      ? '${state.qrCodes[index].substring(0, 20)}...'
                                      : state.qrCodes[index],
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              IconButton(
                                key: ValueKey('scanner-remove-$index'),
                                padding: const EdgeInsets.only(bottom: spacer2),
                                icon: Icon(
                                  Icons.delete,
                                  color: theme.colorScheme.error,
                                  size: 24,
                                ),
                                onPressed: () => _removeCode(index, state),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
}

class _ScannerMessage {
  const _ScannerMessage(this.code, this.message);
  final String locale = 'en_IN';
  final String code;
  final String message;
}

class _ScannerLanguage {
  const _ScannerLanguage(this.value);
  final String value;
}

const _scannerLanguages = <_ScannerLanguage>[_ScannerLanguage('en_IN')];

const _scannerMessages = <_ScannerMessage>[
  _ScannerMessage('BARCODE_SCANNER', 'Barcode Scanner'),
  _ScannerMessage('SCANNER_LABEL', 'Scanner'),
  _ScannerMessage('FLASH_ON', 'Flash On'),
  _ScannerMessage('FLASH_OFF', 'Flash Off'),
  _ScannerMessage('MANUAL_SCAN', 'Manual Scan'),
  _ScannerMessage('ENTER_MANUAL_CODE', 'Enter Manual Code'),
  _ScannerMessage('RESOURCE_CODE', 'Serial Number'),
  _ScannerMessage('RESOURCE_SCANNED', 'Resources Scanned'),
  _ScannerMessage('CORE_COMMON_SUBMIT', 'Submit'),
  _ScannerMessage('CORE_COMMON_CANCEL', 'Cancel'),
  _ScannerMessage('CORE_COMMON_REQUIRED', 'This field is required'),
];
