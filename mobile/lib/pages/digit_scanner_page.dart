import 'dart:io';

import 'package:camera/camera.dart';
import 'package:digit_scanner/blocs/app_localization.dart';
import 'package:digit_scanner/blocs/scanner.dart';
import 'package:digit_scanner/widgets/vision_detector_views/detector_view.dart';
import 'package:digit_scanner/widgets/vision_detector_views/painters/barcode_detector_painter.dart';
import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/atoms/pop_up_card.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:digit_ui_components/widgets/molecules/show_pop_up.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_mlkit_barcode_scanning/google_mlkit_barcode_scanning.dart';
import 'package:image_picker/image_picker.dart';

import '../app/app_strings.dart';
import '../router/app_router.dart';

typedef ScannerGalleryPicker = Future<XFile?> Function();

Future<String?> openDigitScanner(BuildContext context) async {
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

  final selected = await context.router.push<String>(
    DigitScannerRoute(
      quantity: 10,
      isGS1code: false,
      singleValue: true,
    ),
  );

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

class _DigitScannerPageState extends State<DigitScannerPage> {
  final BarcodeScanner _barcodeScanner = BarcodeScanner();
  final TextEditingController _manualController = TextEditingController();
  final GlobalKey _manualControlKey =
      GlobalKey(debugLabel: 'scanner-manual-control');
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
  bool _manualError = false;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    try {
      final cameras = await availableCameras();
      if (!mounted) return;
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
      setState(() {
        _cameras = cameras;
        _cameraController = CameraController(
          camera,
          ResolutionPreset.high,
          enableAudio: false,
          imageFormatGroup: Platform.isAndroid
              ? ImageFormatGroup.nv21
              : ImageFormatGroup.bgra8888,
        );
        _cameraLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _cameraLoading = false;
        _cameraUnavailable = true;
      });
    }
  }

  @override
  void dispose() {
    _manualController.dispose();
    _cameraController?.dispose();
    _barcodeScanner.close();
    super.dispose();
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
    context.router.maybePop(state.qrCodes.last.trim());
  }

  Future<void> _confirmSelection(DigitScannerState state) async {
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
            label: AppStrings.submit,
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
            onPressed: () =>
                Navigator.of(popupContext, rootNavigator: true).pop(),
          ),
        ],
      ),
    );
  }

  void _submitManual() {
    final value = _manualController.text.trim();
    if (value.isEmpty) {
      setState(() => _manualError = true);
      Toast.showToast(
        context,
        type: ToastType.error,
        message: AppStrings.enterManualCode,
      );
      return;
    }
    setState(() => _manualError = false);
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
    return ScrollableContent(
      key: const ValueKey('scanner-manual-page'),
      backgroundColor: theme.colorScheme.onError,
      header: GestureDetector(
        key: const ValueKey('scanner-manual-close'),
        onTap: () => setState(() {
          _manualEntry = false;
          _manualError = false;
        }),
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
          label: AppStrings.submit,
          type: DigitButtonType.primary,
          size: DigitButtonSize.large,
          onPressed: _submitManual,
        ),
      ),
      children: [
        DigitCard(
          children: [
            Align(
              alignment: Alignment.topLeft,
              child: Text(
                AppStrings.enterManualCode,
                style: textTheme.headingL.copyWith(
                  color: theme.colorTheme.text.primary,
                ),
              ),
            ),
            LabeledField(
              label: AppStrings.serialNumber,
              capitalizedFirstLetter: false,
              child: DigitTextFormInput(
                key: _manualControlKey,
                controller: _manualController,
                isRequired: true,
                errorMessage: _manualError ? AppStrings.requiredMessage : null,
                onChange: (_) {
                  if (_manualError) setState(() => _manualError = false);
                },
              ),
            ),
          ],
        ),
      ],
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
            onTap: _cameraController == null
                ? null
                : () async {
                    await _cameraController?.setFlashMode(
                      _flashEnabled ? FlashMode.off : FlashMode.torch,
                    );
                    if (mounted) {
                      setState(() => _flashEnabled = !_flashEnabled);
                    }
                  },
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
          AppStrings.scannerUnavailable,
          textAlign: TextAlign.center,
          style: TextStyle(color: theme.colorScheme.onError),
        ),
      );
    }
    return DetectorView(
      cameraController: _cameraController,
      cameras: _cameras,
      title: AppStrings.scannerTitle,
      customPaint: _customPaint,
      text: _cameraText,
      onImage: _processImage,
      initialCameraLensDirection: _cameraLensDirection,
      onCameraLensDirectionChanged: (value) => _cameraLensDirection = value,
      onBackButtonPressed: () => context.router.maybePop(),
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
                onTap: () => setState(() => _manualEntry = true),
                child: Text(
                  AppStrings.enterManualCode,
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
                  AppStrings.uploadFromGallery,
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
                  label: AppStrings.submit,
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
