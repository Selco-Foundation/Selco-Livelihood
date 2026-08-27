import 'dart:io';

import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../app/app_strings.dart';
import '../models/solar_installation_draft.dart';

typedef ImageUploaderPick = Future<XFile?> Function(
  SolarFileKind kind,
  ImageSource source,
);
typedef ImageUploaderPickMultiple = Future<List<XFile>> Function();

/// In-memory adaptation of E4H's shared image uploader.
class ImageUploader extends StatefulWidget {
  const ImageUploader({
    super.key,
    this.onImageSelected,
    this.onImagesSelected,
    this.initialImage,
    this.initialImages,
    this.pickMedia,
    this.pickMultiple,
    this.label,
    this.errorMessage,
    this.allowMultiples = false,
    this.maxImages,
    this.isDisabled = false,
  }) : assert(onImageSelected != null || onImagesSelected != null);

  final SolarFileRef? initialImage;
  final List<SolarFileRef>? initialImages;
  final ValueChanged<SolarFileRef?>? onImageSelected;
  final ValueChanged<List<SolarFileRef>>? onImagesSelected;
  final ImageUploaderPick? pickMedia;
  final ImageUploaderPickMultiple? pickMultiple;
  final String? label;
  final String? errorMessage;
  final bool allowMultiples;
  final int? maxImages;
  final bool isDisabled;

  @override
  State<ImageUploader> createState() => _ImageUploaderState();
}

class _ImageUploaderState extends State<ImageUploader> {
  late List<SolarFileRef> images;
  bool opening = false;
  String? localError;

  @override
  void initState() {
    super.initState();
    images = _incomingImages();
  }

  @override
  void didUpdateWidget(covariant ImageUploader oldWidget) {
    super.didUpdateWidget(oldWidget);
    final incoming = _incomingImages();
    if (_paths(incoming) != _paths(images)) images = incoming;
  }

  List<SolarFileRef> _incomingImages() => widget.allowMultiples
      ? List<SolarFileRef>.of(widget.initialImages ?? const [])
      : [if (widget.initialImage != null) widget.initialImage!];

  String _paths(List<SolarFileRef> value) =>
      value.map((file) => file.path).join('\u0000');

  bool get _atLimit =>
      widget.maxImages != null && images.length >= widget.maxImages!;

  Future<List<XFile>> _pick(ImageSource source) async {
    if (source == ImageSource.gallery && widget.allowMultiples) {
      if (widget.pickMultiple != null) return widget.pickMultiple!();
      if (widget.pickMedia != null) {
        final file = await widget.pickMedia!(SolarFileKind.image, source);
        return [if (file != null) file];
      }
      return ImagePicker().pickMultiImage(
        imageQuality: 60,
        maxWidth: 1280,
        maxHeight: 1280,
        requestFullMetadata: false,
      );
    }
    final file = widget.pickMedia != null
        ? await widget.pickMedia!(SolarFileKind.image, source)
        : await ImagePicker().pickImage(
            source: source,
            imageQuality: 60,
            maxWidth: 1280,
            maxHeight: 1280,
            requestFullMetadata: false,
          );
    return [if (file != null) file];
  }

  Future<void> _choose(ImageSource source) async {
    if (opening || widget.isDisabled || _atLimit) return;
    Navigator.of(context).pop();
    setState(() {
      opening = true;
      localError = null;
    });
    try {
      final selected = await _pick(source);
      if (!mounted || selected.isEmpty) return;
      final available = widget.maxImages == null
          ? selected.length
          : (widget.maxImages! - images.length).clamp(0, selected.length);
      final additions = selected.take(available).map(
            (file) => SolarFileRef(
              name: file.name,
              path: file.path,
              kind: SolarFileKind.image,
            ),
          );
      setState(() {
        if (!widget.allowMultiples) images.clear();
        images.addAll(additions);
      });
      _notify();
    } catch (_) {
      if (mounted) setState(() => localError = AppStrings.mediaPickerError);
    } finally {
      if (mounted) setState(() => opening = false);
    }
  }

  void _notify() {
    widget.onImagesSelected?.call(List<SolarFileRef>.of(images));
    widget.onImageSelected?.call(images.isEmpty ? null : images.first);
  }

  void _openPicker() {
    if (opening || widget.isDisabled || _atLimit) return;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(spacer2)),
      ),
      constraints: BoxConstraints(
        minWidth: MediaQuery.sizeOf(context).width,
        minHeight: 120,
        maxHeight: 120,
      ),
      backgroundColor: const DigitColors().light.paperPrimary,
      builder: (_) => Row(
        children: [
          _UploaderChoice(
            key: const ValueKey('image-uploader-camera'),
            icon: Icons.camera_enhance,
            label: AppStrings.camera,
            onTap: () => _choose(ImageSource.camera),
          ),
          _UploaderChoice(
            key: const ValueKey('image-uploader-files'),
            icon: Icons.perm_media,
            label: AppStrings.myFiles,
            onTap: () => _choose(ImageSource.gallery),
          ),
        ],
      ),
    );
  }

  void _remove(int index) {
    if (widget.isDisabled) return;
    setState(() {
      images.removeAt(index);
      localError = null;
    });
    _notify();
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).digitTextTheme(context);
    final error = localError ?? widget.errorMessage;
    final showUpload = !widget.isDisabled &&
        !_atLimit &&
        (widget.allowMultiples || images.isEmpty);
    return InkWell(
      hoverColor: const DigitColors().transparent,
      highlightColor: const DigitColors().transparent,
      splashColor: const DigitColors().transparent,
      onTap: showUpload ? _openPicker : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showUpload)
            Container(
              key: const ValueKey('image-uploader-empty'),
              width: MediaQuery.sizeOf(context).width,
              height: 120,
              decoration: BoxDecoration(
                border: Border.all(
                  color: error == null
                      ? const DigitColors().light.genericInputBorder
                      : const DigitColors().light.alertError,
                  width: 1,
                ),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.camera_enhance,
                      size: spacer10,
                      color: Color(0xFFD4351C),
                    ),
                    Text(
                      widget.label ?? 'Click to add photo',
                      style: textTheme.bodyL.copyWith(
                        color: const DigitColors().light.primary1,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (error != null) ...[
            const SizedBox(height: spacer1),
            _UploaderError(message: error),
          ],
          if (opening)
            Padding(
              padding: const EdgeInsets.only(top: spacer1),
              child: Text(
                'Opening camera...',
                style: textTheme.bodyS.copyWith(
                  color: const DigitColors().light.primary1,
                ),
              ),
            ),
          if (showUpload) const SizedBox(height: spacer2),
          Wrap(
            spacing: spacer2,
            runSpacing: spacer2,
            children: [
              for (var index = 0; index < images.length; index++)
                _ImagePreview(
                  key: ValueKey('image-uploader-preview-$index'),
                  file: images[index],
                  multiple: widget.allowMultiples,
                  removable: !widget.isDisabled,
                  onRemove: () => _remove(index),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ImagePreview extends StatelessWidget {
  const _ImagePreview({
    super.key,
    required this.file,
    required this.multiple,
    required this.removable,
    required this.onRemove,
  });

  final SolarFileRef file;
  final bool multiple;
  final bool removable;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final preview = Stack(
      fit: StackFit.expand,
      children: [
        Image.file(
          File(file.path),
          fit: BoxFit.cover,
          cacheWidth: Base.imageSize.toInt(),
          cacheHeight: Base.imageSize.toInt(),
          errorBuilder: (_, __, ___) => Container(
            color: const DigitColors().background.withOpacity(.5),
            alignment: Alignment.center,
            child: const Icon(Icons.image_not_supported, size: spacer10),
          ),
        ),
        if (removable)
          Positioned(
            top: 0,
            right: 0,
            child: InkWell(
              key: const ValueKey('image-uploader-remove'),
              hoverColor: const DigitColors().transparent,
              highlightColor: const DigitColors().transparent,
              splashColor: const DigitColors().transparent,
              onTap: onRemove,
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
          ),
      ],
    );
    if (multiple) {
      return SizedBox(
        width: Base.imageSize,
        height: Base.imageSize,
        child: ClipRRect(borderRadius: Base.radius, child: preview),
      );
    }
    return SizedBox(
      key: const ValueKey('image-uploader-preview'),
      width: MediaQuery.sizeOf(context).width,
      child: AspectRatio(
        aspectRatio: 3 / 2,
        child: ClipRRect(borderRadius: Base.radius, child: preview),
      ),
    );
  }
}

class _UploaderChoice extends StatelessWidget {
  const _UploaderChoice({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Padding(
          padding: const EdgeInsets.only(top: spacer8),
          child: InkWell(
            hoverColor: const DigitColors().transparent,
            highlightColor: const DigitColors().transparent,
            splashColor: const DigitColors().transparent,
            onTap: onTap,
            child: Column(
              children: [
                Icon(icon,
                    size: spacer10, color: const DigitColors().light.primary1),
                const SizedBox(height: spacer2),
                Text(
                  label,
                  style: Theme.of(context)
                      .digitTextTheme(context)
                      .bodyL
                      .copyWith(color: const DigitColors().light.primary1),
                ),
              ],
            ),
          ),
        ),
      );
}

class _UploaderError extends StatelessWidget {
  const _UploaderError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info, color: Color(0xFFD4351C), size: spacer4),
          const SizedBox(width: spacer1),
          Expanded(
            child: Text(
              message.length > 256
                  ? '${message.substring(0, 256)}...'
                  : message,
              style: Theme.of(context).digitTextTheme(context).bodyS.copyWith(
                    color: const DigitColors().light.alertError,
                  ),
            ),
          ),
        ],
      );
}
