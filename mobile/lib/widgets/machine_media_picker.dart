import 'dart:io';

import 'package:digit_ui_components/digit_components.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../utils/app_permission_gateway.dart';
import '../model/solar_installation_draft.dart';
import '../pages/media_viewer.dart';

enum MachineMediaKind { image, video }

typedef MachinePickMedia = Future<XFile?> Function(
  MachineMediaKind kind,
  ImageSource source,
);

class MachineMediaPicker extends StatefulWidget {
  const MachineMediaPicker({
    super.key,
    required this.kind,
    required this.selectedFile,
    required this.onChanged,
    required this.pickMedia,
    this.permissionGateway,
  });

  final MachineMediaKind kind;
  final XFile? selectedFile;
  final ValueChanged<XFile?> onChanged;
  final MachinePickMedia pickMedia;
  final AppPermissionGateway? permissionGateway;

  @override
  State<MachineMediaPicker> createState() => _MachineMediaPickerState();
}

class _MachineMediaPickerState extends State<MachineMediaPicker> {
  bool _isPicking = false;
  String _fileError = '';

  bool get _isImage => widget.kind == MachineMediaKind.image;

  Future<void> _select(ImageSource source) async {
    Navigator.of(context).pop();
    if (_isPicking) return;
    setState(() {
      _isPicking = true;
      _fileError = '';
    });

    try {
      if (source == ImageSource.camera && widget.permissionGateway != null) {
        final granted = await ensureCameraPermission(
          context,
          gateway: widget.permissionGateway,
        );
        if (!granted) return;
      }
      final file = await widget.pickMedia(widget.kind, source);
      if (!mounted) return;
      if (file != null) widget.onChanged(file);
    } catch (_) {
      if (!mounted) return;
      setState(() =>
          _fileError = context.translate(i18.machineForm.mediaPickerError));
    } finally {
      if (mounted) setState(() => _isPicking = false);
    }
  }

  void _showPickerOptions() {
    if (_isPicking) return;
    setState(() => _fileError = '');
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(spacer2),
          topRight: Radius.circular(spacer2),
        ),
      ),
      constraints: BoxConstraints(
        minWidth: MediaQuery.of(context).size.width,
        minHeight: 120,
        maxHeight: 120,
      ),
      backgroundColor: const DigitColors().light.paperPrimary,
      builder: (_) => _buildBottomSheetContent(),
    );
  }

  Widget _buildBottomSheetContent() {
    final typography = getTypography(context, false);
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _PickerOption(
            key: const ValueKey('machine-picker-camera'),
            icon: _isImage ? Icons.camera_enhance : Icons.videocam,
            label: context.translate(i18.machineForm.camera),
            typography: typography,
            onPressed: () => _select(ImageSource.camera),
          ),
          _PickerOption(
            key: const ValueKey('machine-picker-files'),
            icon: _isImage ? Icons.perm_media : Icons.video_library,
            label: context.translate(i18.machineForm.myFiles),
            typography: typography,
            onPressed: () => _select(ImageSource.gallery),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final typography = getTypography(context, false);
    final file = widget.selectedFile;

    if (file != null) {
      return _isImage
          ? _buildSelectedImage(file)
          : _buildSelectedVideo(file, typography);
    }

    return InkWell(
      key: const ValueKey('machine-media-empty'),
      hoverColor: const DigitColors().transparent,
      highlightColor: const DigitColors().transparent,
      splashColor: const DigitColors().transparent,
      onTap: _showPickerOptions,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            key: const ValueKey('machine-media-upload-control'),
            width: MediaQuery.of(context).size.width,
            height: 120,
            decoration: BoxDecoration(
              border: Border.all(
                color: _fileError.isNotEmpty
                    ? const DigitColors().light.alertError
                    : const DigitColors().light.genericInputBorder,
                width: 1,
              ),
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    _isImage ? Icons.camera_enhance : Icons.videocam,
                    size: spacer10,
                    color: const DigitColors().light.primary1,
                  ),
                  Text(
                    _isImage
                        ? context.translate(i18.machineForm.takePhoto)
                        : context.translate(i18.machineForm.takeVideo),
                    style: TextStyle(
                      color: const DigitColors().light.primary1,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_fileError.isNotEmpty) ...[
            const SizedBox(height: spacer1),
            Row(
              key: const ValueKey('machine-media-error'),
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: spacer1 / 2),
                  child: Icon(
                    Icons.info,
                    color: const DigitColors().light.alertError,
                    size: BaseConstants.errorIconSize,
                  ),
                ),
                const SizedBox(width: spacer1),
                Flexible(
                  child: Text(
                    _fileError,
                    style: typography.bodyS.copyWith(
                      color: const DigitColors().light.alertError,
                    ),
                  ),
                ),
              ],
            ),
          ],
          if (_isPicking)
            Padding(
              key: const ValueKey('machine-media-opening'),
              padding: const EdgeInsets.only(top: spacer1),
              child: Text(
                'Opening camera...',
                style: typography.bodyS.copyWith(
                  color: const DigitColors().light.primary1,
                ),
              ),
            ),
          const SizedBox(height: spacer2),
        ],
      ),
    );
  }

  Widget _buildSelectedImage(XFile file) {
    final thumb = Base.imageSize.toInt() * 2;
    return AspectRatio(
      key: const ValueKey('machine-media-image-preview'),
      aspectRatio: 3 / 2,
      child: ClipRRect(
        borderRadius: Base.radius,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.file(
              File(file.path),
              fit: BoxFit.cover,
              cacheWidth: thumb,
              errorBuilder: (_, __, ___) => Container(
                color: const DigitColors().light.genericDivider,
                child: Icon(
                  Icons.image,
                  size: spacer10,
                  color: const DigitColors().light.primary1,
                ),
              ),
            ),
            Positioned.fill(
              child: InkWell(
                key: const ValueKey('machine-media-open-image'),
                onTap: () => openMediaViewer(
                  context,
                  SolarFileRef(
                    name: file.name,
                    path: file.path,
                    localPath: file.path,
                    kind: SolarFileKind.image,
                  ),
                ),
              ),
            ),
            _RemoveControl(onPressed: () => widget.onChanged(null)),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectedVideo(XFile file, DigitTypography typography) {
    return Stack(
      key: const ValueKey('machine-media-video-tile'),
      children: [
        InkWell(
          onTap: () => openMediaViewer(
            context,
            SolarFileRef(
              name: file.name,
              path: file.path,
              localPath: file.path,
              kind: SolarFileKind.video,
            ),
          ),
          child: Container(
            width: MediaQuery.of(context).size.width,
            constraints: const BoxConstraints(minHeight: Base.imageSize),
            padding: const EdgeInsets.all(spacer3),
            decoration: BoxDecoration(
              borderRadius: Base.radius,
              border: Border.all(
                color: const DigitColors().light.genericDivider,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.video_file,
                  color: const DigitColors().light.primary1,
                  size: spacer8,
                ),
                const SizedBox(height: spacer2),
                Text(
                  file.name,
                  key: const ValueKey('machine-media-file-name'),
                  style: typography.bodyS.copyWith(
                    color: const DigitColors().light.textPrimary,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
        _RemoveControl(onPressed: () => widget.onChanged(null)),
      ],
    );
  }
}

class _PickerOption extends StatelessWidget {
  const _PickerOption({
    super.key,
    required this.icon,
    required this.label,
    required this.typography,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final DigitTypography typography;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(top: spacer8),
        child: InkWell(
          hoverColor: const DigitColors().transparent,
          highlightColor: const DigitColors().transparent,
          splashColor: const DigitColors().transparent,
          onTap: onPressed,
          child: Column(
            children: [
              Icon(
                icon,
                size: spacer10,
                color: const DigitColors().light.primary1,
              ),
              const SizedBox(height: spacer2),
              Text(
                label,
                style: typography.bodyL.copyWith(
                  color: const DigitColors().light.primary1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RemoveControl extends StatelessWidget {
  const _RemoveControl({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      right: 0,
      child: InkWell(
        key: const ValueKey('machine-media-remove'),
        hoverColor: const DigitColors().transparent,
        highlightColor: const DigitColors().transparent,
        splashColor: const DigitColors().transparent,
        onTap: onPressed,
        child: Container(
          width: spacer6,
          height: spacer6,
          color: const DigitColors().light.primary2,
          child: Icon(
            Icons.close,
            size: spacer4,
            color: const DigitColors().light.paperPrimary,
          ),
        ),
      ),
    );
  }
}
