import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:digit_ui_components/digit_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter_pdfview/flutter_pdfview.dart';
import 'package:video_player/video_player.dart';

import '../model/solar_installation_draft.dart';
import '../repositories/installation_cache_repo.dart';
import '../router/app_router.dart';
import '../utils/api_paths.dart';
import '../utils/envConfig.dart';

void openMediaViewer(BuildContext context, SolarFileRef media) {
  switch (media.kind) {
    case SolarFileKind.image:
      context.router.push(ImageViewerRoute(media: media));
      return;
    case SolarFileKind.video:
      context.router.push(VideoViewerRoute(media: media));
      return;
    case SolarFileKind.pdf:
      context.router.push(PdfViewerRoute(media: media));
      return;
  }
}

String mediaRemoteUrl(SolarFileRef media) {
  if (media.path.startsWith('http')) return media.path;
  final id = media.remoteId ?? media.path;
  return '${envConfig.variables.baseUrl}${ApiPaths.fileStoreFile}'
      '?tenantId=${Uri.encodeQueryComponent(envConfig.variables.tenantId)}'
      '&fileStoreId=${Uri.encodeQueryComponent(id)}';
}

class MediaThumbnail extends StatelessWidget {
  const MediaThumbnail({
    super.key,
    required this.media,
    this.width = 96,
    this.height = 96,
    this.fit = BoxFit.cover,
  });

  final SolarFileRef media;
  final double width;
  final double height;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    // Matches E4H's split exactly: images render as a raw thumbnail with no
    // caption at all (`assetImageCard`); videos never get a real thumbnail —
    // just a play icon plus a truncated filename underneath (`videoCard`).
    if (media.kind == SolarFileKind.video) {
      return InkWell(
        onTap: () => openMediaViewer(context, media),
        child: SizedBox(
          width: width,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: width,
                height: height,
                child: const Icon(Icons.play_circle_fill, size: 40),
              ),
              Text(
                media.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11),
              ),
            ],
          ),
        ),
      );
    }

    Widget child;
    final local = media.localPath ?? media.path;
    if (media.kind == SolarFileKind.image &&
        media.isRemote &&
        media.localPath == null) {
      child = CachedNetworkImage(
        imageUrl: mediaRemoteUrl(media),
        fit: fit,
        placeholder: (_, __) =>
            const Center(child: CircularProgressIndicator()),
        errorWidget: (_, __, ___) => const Icon(Icons.broken_image),
      );
    } else if (media.kind == SolarFileKind.image && File(local).existsSync()) {
      child = Image.file(File(local), fit: fit);
    } else {
      child = Icon(
        media.kind == SolarFileKind.pdf ? Icons.picture_as_pdf : Icons.image,
        size: 40,
      );
    }
    return InkWell(
      onTap: () => openMediaViewer(context, media),
      child: SizedBox(width: width, height: height, child: child),
    );
  }
}

class _MediaScaffold extends StatelessWidget {
  const _MediaScaffold({required this.name, required this.child});
  final String name;
  final Widget child;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(name)),
        body: SafeArea(child: child),
      );
}

@RoutePage()
class ImageViewerPage extends StatelessWidget {
  const ImageViewerPage({super.key, required this.media});
  final SolarFileRef media;

  @override
  Widget build(BuildContext context) => _MediaScaffold(
        name: media.name,
        child: FutureBuilder<String>(
          future: installationCacheRepository.resolveMedia(media),
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError || snapshot.data == null) {
              return _MediaError(error: snapshot.error);
            }
            return InteractiveViewer(
              minScale: .5,
              maxScale: 5,
              child: Center(child: Image.file(File(snapshot.data!))),
            );
          },
        ),
      );
}

@RoutePage()
class VideoViewerPage extends StatefulWidget {
  const VideoViewerPage({super.key, required this.media});
  final SolarFileRef media;

  @override
  State<VideoViewerPage> createState() => _VideoViewerPageState();
}

class _VideoViewerPageState extends State<VideoViewerPage> {
  VideoPlayerController? controller;
  Object? error;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      final path = await installationCacheRepository.resolveMedia(widget.media);
      final value = VideoPlayerController.file(File(path));
      await value.initialize();
      await value.setLooping(false);
      if (!mounted) {
        value.dispose();
        return;
      }
      setState(() => controller = value);
    } catch (e) {
      if (mounted) setState(() => error = e);
    }
  }

  @override
  void dispose() {
    controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _MediaScaffold(
        name: widget.media.name,
        child: error != null
            ? _MediaError(error: error, onRetry: _initialize)
            : controller == null
                ? const Center(child: CircularProgressIndicator())
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      AspectRatio(
                        aspectRatio: controller!.value.aspectRatio,
                        child: VideoPlayer(controller!),
                      ),
                      VideoProgressIndicator(
                        controller!,
                        allowScrubbing: true,
                        padding: const EdgeInsets.all(16),
                      ),
                      IconButton(
                        iconSize: 48,
                        icon: Icon(controller!.value.isPlaying
                            ? Icons.pause
                            : Icons.play_arrow),
                        onPressed: () => setState(() {
                          controller!.value.isPlaying
                              ? controller!.pause()
                              : controller!.play();
                        }),
                      ),
                    ],
                  ),
      );
}

@RoutePage()
class PdfViewerPage extends StatelessWidget {
  const PdfViewerPage({super.key, required this.media});
  final SolarFileRef media;

  @override
  Widget build(BuildContext context) => _MediaScaffold(
        name: media.name,
        child: FutureBuilder<String>(
          future: installationCacheRepository.resolveMedia(media),
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError || snapshot.data == null) {
              return _MediaError(error: snapshot.error);
            }
            return PDFView(
              filePath: snapshot.data!,
              enableSwipe: true,
              autoSpacing: true,
              pageFling: true,
              fitPolicy: FitPolicy.WIDTH,
            );
          },
        ),
      );
}

class _MediaError extends StatelessWidget {
  const _MediaError({this.error, this.onRetry});
  final Object? error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: 12),
              const Text('This media could not be opened.',
                  textAlign: TextAlign.center),
              if (onRetry != null) ...[
                const SizedBox(height: 16),
                DigitButton(
                  label: 'Retry',
                  type: DigitButtonType.primary,
                  size: DigitButtonSize.large,
                  onPressed: onRetry!,
                ),
              ],
            ],
          ),
        ),
      );
}
