import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../model/solar_installation_draft.dart';
import '../pages/media_viewer.dart';
import '../utils/app_permission_gateway.dart';
import 'solar_workflow_widgets.dart';

/// In-memory adaptation of E4H's shared VideoUploader.
class VideoUploader extends StatefulWidget {
  const VideoUploader({
    super.key,
    required this.onVideosSelected,
    this.initialVideos = const [],
    this.pickMedia,
    this.label,
    this.errorMessage,
    this.allowMultiples = false,
    this.isDisabled = false,
    this.permissionGateway,
  });

  final List<SolarFileRef> initialVideos;
  final ValueChanged<List<SolarFileRef>> onVideosSelected;
  final SolarPickMedia? pickMedia;
  final String? label;
  final String? errorMessage;
  final bool allowMultiples;
  final bool isDisabled;
  final AppPermissionGateway? permissionGateway;

  @override
  State<VideoUploader> createState() => _VideoUploaderState();
}

class _VideoUploaderState extends State<VideoUploader> {
  late List<SolarFileRef> videos = List.of(widget.initialVideos);
  bool opening = false;
  String? localError;

  @override
  void didUpdateWidget(covariant VideoUploader oldWidget) {
    super.didUpdateWidget(oldWidget);
    final incoming = widget.initialVideos.map((e) => e.path).join('\u0000');
    final current = videos.map((e) => e.path).join('\u0000');
    if (incoming != current) videos = List.of(widget.initialVideos);
  }

  Future<void> _choose(ImageSource source) async {
    if (opening || widget.isDisabled) return;
    Navigator.of(context).pop();
    setState(() {
      opening = true;
      localError = null;
    });
    try {
      if (source == ImageSource.camera &&
          (widget.permissionGateway != null || widget.pickMedia == null)) {
        final granted = await ensureCameraPermission(
          context,
          gateway: widget.permissionGateway,
        );
        if (!granted) return;
      }
      final selected = widget.pickMedia != null
          ? await widget.pickMedia!(SolarFileKind.video, source)
          : await ImagePicker().pickVideo(source: source);
      if (!mounted || selected == null) return;
      setState(() {
        if (!widget.allowMultiples) videos.clear();
        videos.add(SolarFileRef(
          name: selected.name,
          path: selected.path,
          kind: SolarFileKind.video,
        ));
      });
      widget.onVideosSelected(List.of(videos));
    } catch (_) {
      if (mounted) {
        setState(() =>
            localError = context.translate(i18.machineForm.mediaPickerError));
      }
    } finally {
      if (mounted) setState(() => opening = false);
    }
  }

  void _openPicker() {
    if (opening || widget.isDisabled) return;
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
          _VideoChoice(
            key: const ValueKey('video-uploader-camera'),
            icon: Icons.videocam,
            label: context.translate(i18.machineForm.camera),
            onTap: () => _choose(ImageSource.camera),
          ),
          _VideoChoice(
            key: const ValueKey('video-uploader-files'),
            icon: Icons.video_library,
            label: context.translate(i18.machineForm.myFiles),
            onTap: () => _choose(ImageSource.gallery),
          ),
        ],
      ),
    );
  }

  void _remove(int index) {
    setState(() => videos.removeAt(index));
    widget.onVideosSelected(List.of(videos));
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).digitTextTheme(context);
    final error = localError ?? widget.errorMessage;
    final showUpload =
        !widget.isDisabled && (widget.allowMultiples || videos.isEmpty);
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
              key: const ValueKey('video-uploader-empty'),
              width: MediaQuery.sizeOf(context).width,
              height: 120,
              decoration: BoxDecoration(
                border: Border.all(
                  color: error == null
                      ? const DigitColors().light.genericInputBorder
                      : const DigitColors().light.alertError,
                ),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.videocam,
                        size: spacer10, color: Color(0xFFD4351C)),
                    Text(
                      widget.label ?? 'Click to add video',
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
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.info, color: Color(0xFFD4351C), size: spacer4),
                const SizedBox(width: spacer1),
                Expanded(
                  child: Text(error,
                      style: textTheme.bodyS.copyWith(
                        color: const DigitColors().light.alertError,
                      )),
                ),
              ],
            ),
          ],
          if (opening)
            Padding(
              padding: const EdgeInsets.only(top: spacer1),
              child: Text('Opening camera...',
                  style: textTheme.bodyS.copyWith(
                    color: const DigitColors().light.primary1,
                  )),
            ),
          if (showUpload) const SizedBox(height: spacer2),
          Wrap(
            spacing: spacer2,
            runSpacing: spacer2,
            children: [
              for (var index = 0; index < videos.length; index++)
                Stack(
                  key: ValueKey('video-uploader-preview-$index'),
                  children: [
                    InkWell(
                      onTap: () => openMediaViewer(context, videos[index]),
                      child: Container(
                        width: widget.allowMultiples
                            ? Base.imageSize
                            : MediaQuery.sizeOf(context).width,
                        constraints:
                            const BoxConstraints(minHeight: Base.imageSize),
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
                            const Icon(Icons.video_file,
                                color: Color(0xFFD4351C), size: spacer8),
                            const SizedBox(height: spacer2),
                            Text(videos[index].name,
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                                style: textTheme.bodyS),
                          ],
                        ),
                      ),
                    ),
                    if (!widget.isDisabled)
                      Positioned(
                        top: 0,
                        right: 0,
                        child: InkWell(
                          key: const ValueKey('video-uploader-remove'),
                          onTap: () => _remove(index),
                          child: Container(
                            width: spacer6,
                            height: spacer6,
                            color: const DigitColors().light.primary2,
                            child: Icon(Icons.close,
                                size: spacer4,
                                color: const DigitColors().light.paperPrimary),
                          ),
                        ),
                      ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _VideoChoice extends StatelessWidget {
  const _VideoChoice({
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
                Text(label,
                    style: Theme.of(context)
                        .digitTextTheme(context)
                        .bodyL
                        .copyWith(color: const DigitColors().light.primary1)),
              ],
            ),
          ),
        ),
      );
}
