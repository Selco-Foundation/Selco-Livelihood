import 'package:digit_scanner/blocs/app_localization.dart';
import 'package:digit_scanner/blocs/scanner.dart';
import 'package:digit_scanner/pages/qr_scanner.dart' as scanner_package;
import 'package:digit_ui_components/digit_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_mlkit_barcode_scanning/google_mlkit_barcode_scanning.dart';
import 'package:image_picker/image_picker.dart';

import '../app/app_strings.dart';

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

  final selected = await Navigator.of(context).push<String>(
    MaterialPageRoute<String>(
      builder: (_) => BlocProvider.value(
        value: scannerBloc,
        child: const DigitScannerPage(
          quantity: 10,
          isGS1code: false,
          singleValue: true,
        ),
      ),
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

/// Livelihood's local adaptation of E4H's customized scanner.
///
/// The DIGIT scanner owns camera, overlay, flash, manual entry and result-list
/// presentation. This adapter adds E4H's gallery scan and single-result Submit
/// behavior without introducing an intermediate route.
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
  bool _readingGallery = false;
  bool _localizationsReady = false;
  String? _galleryError;
  late final ScannerLocalization _localizations = ScannerLocalization(
    const Locale('en', 'IN'),
    Future.value(_scannerMessages),
    const [],
  );

  @override
  void initState() {
    super.initState();
    _loadLocalizations();
  }

  Future<void> _loadLocalizations() async {
    await _localizations.load();
    if (mounted) setState(() => _localizationsReady = true);
  }

  Future<void> _scanFromGallery() async {
    if (_readingGallery) return;
    setState(() {
      _readingGallery = true;
      _galleryError = null;
    });
    final barcodeScanner = BarcodeScanner();
    try {
      final image = await (widget.galleryPicker?.call() ??
          ImagePicker().pickImage(
            source: ImageSource.gallery,
            requestFullMetadata: false,
          ));
      if (image == null || !mounted) return;
      final barcodes = await barcodeScanner.processImage(
        InputImage.fromFilePath(image.path),
      );
      final values = barcodes
          .map((barcode) => barcode.rawValue ?? barcode.displayValue)
          .whereType<String>()
          .map((value) => value.trim())
          .where((value) => value.isNotEmpty)
          .toList();
      if (!mounted) return;
      if (values.isEmpty) {
        setState(() => _galleryError = 'No code found in photo');
        return;
      }
      context.read<DigitScannerBloc>().add(
            DigitScannerEvent.handleScanner(
              qrCode: [values.first],
              isGS1: false,
              quantity: widget.quantity,
            ),
          );
    } catch (_) {
      if (mounted) setState(() => _galleryError = 'Failed to read photo');
    } finally {
      await barcodeScanner.close();
      if (mounted) setState(() => _readingGallery = false);
    }
  }

  void _submit(DigitScannerState state) {
    if (state.qrCodes.isEmpty) return;
    Navigator.of(context).pop(state.qrCodes.last.trim());
  }

  @override
  Widget build(BuildContext context) {
    if (!_localizationsReady) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
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
        builder: (context, state) => Stack(
          children: [
            scanner_package.DigitScannerPage(
              appLocalizations: _localizations,
              quantity: widget.quantity,
              isGS1code: widget.isGS1code,
              singleValue: widget.singleValue,
            ),
            Positioned(
              right: spacer4,
              top: MediaQuery.paddingOf(context).top + 72,
              child: Material(
                color: Colors.white,
                borderRadius: BorderRadius.circular(spacer1),
                child: DigitButton(
                  key: const ValueKey('scanner-gallery-button'),
                  label:
                      _readingGallery ? 'Reading Photo...' : 'Scan from Photo',
                  prefixIcon: Icons.photo_library_outlined,
                  type: DigitButtonType.tertiary,
                  size: DigitButtonSize.medium,
                  onPressed: _scanFromGallery,
                ),
              ),
            ),
            if (_galleryError != null)
              Positioned(
                left: spacer4,
                right: spacer4,
                top: MediaQuery.paddingOf(context).top + 128,
                child: Material(
                  color: Colors.white,
                  child: Padding(
                    padding: const EdgeInsets.all(spacer2),
                    child: Row(
                      children: [
                        const Icon(Icons.info, color: Colors.red),
                        const SizedBox(width: spacer2),
                        Expanded(child: Text(_galleryError!)),
                      ],
                    ),
                  ),
                ),
              ),
            if (state.qrCodes.isNotEmpty)
              Positioned(
                left: spacer4,
                right: spacer4,
                bottom: spacer4,
                child: Material(
                  color: Colors.transparent,
                  child: DigitButton(
                    key: const ValueKey('scanner-submit-button'),
                    mainAxisSize: MainAxisSize.max,
                    label: AppStrings.submit,
                    type: DigitButtonType.primary,
                    size: DigitButtonSize.large,
                    onPressed: () => _submit(state),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
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

const _scannerLanguages = <_ScannerLanguage>[
  _ScannerLanguage('en_IN'),
];

const _scannerMessages = <_ScannerMessage>[
  _ScannerMessage('BARCODE_SCANNER', 'Barcode Scanner'),
  _ScannerMessage('SCANNER_LABEL', 'Scanner'),
  _ScannerMessage('FLASH_ON', 'Flash On'),
  _ScannerMessage('FLASH_OFF', 'Flash Off'),
  _ScannerMessage('MANUAL_SCAN', 'Manual Scan'),
  _ScannerMessage('ENTER_MANUAL_CODE', 'Enter Manual Code'),
  _ScannerMessage('MANUAL_CODE_DESC', 'Enter the serial number manually.'),
  _ScannerMessage('RESOURCE_CODE', 'Serial Number'),
  _ScannerMessage('RESOURCE_SCANNED', 'Resources Scanned'),
  _ScannerMessage('RESOURCE_SCAN_FAILED', 'Resource scan failed'),
  _ScannerMessage('RESOURCES_ALREADY_SCANNED', 'Resource already scanned'),
  _ScannerMessage('INVALID_BARCODE', 'Invalid barcode'),
  _ScannerMessage('CORE_COMMON_SUBMIT', 'Submit'),
  _ScannerMessage('CORE_COMMON_CANCEL', 'Cancel'),
  _ScannerMessage('CORE_COMMON_OK', 'OK'),
  _ScannerMessage('CORE_COMMON_REQUIRED', 'This field is required'),
];
