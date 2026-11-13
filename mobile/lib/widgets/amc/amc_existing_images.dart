import 'dart:io';

import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/theme/spacers.dart';
import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;

import '../../model/solar_installation_draft.dart';
import '../../router/app_router.dart';

/// Read-only photo row of the AMC media screen: the image half of E4H's
/// `ExistingFilesOrLoader` (AMC only ever shows images, already resolved to
/// local files). Tapping opens this app's image viewer.
class AmcExistingImages extends StatelessWidget {
  const AmcExistingImages({super.key, required this.paths});

  final List<String> paths;

  @override
  Widget build(BuildContext context) {
    if (paths.isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);
    const previewSize = spacer12 * 2;
    final decodeSize =
        (previewSize * MediaQuery.of(context).devicePixelRatio).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final path in paths)
                Padding(
                  padding: const EdgeInsets.only(right: spacer2),
                  child: GestureDetector(
                    key: ValueKey('amc-existing-image-$path'),
                    onTap: () => context.router.push(
                      ImageViewerRoute(
                        media: SolarFileRef(
                          name: p.basename(path),
                          path: path,
                          localPath: path,
                          kind: SolarFileKind.image,
                        ),
                      ),
                    ),
                    child: SizedBox(
                      width: previewSize,
                      height: previewSize,
                      child: Image.file(
                        File(path),
                        width: previewSize,
                        height: previewSize,
                        fit: BoxFit.cover,
                        cacheWidth: decodeSize,
                        cacheHeight: decodeSize,
                        errorBuilder: (_, __, ___) => Container(
                          color: theme.colorTheme.generic.background,
                          child: Icon(
                            Icons.broken_image_outlined,
                            color: theme.colorTheme.text.secondary,
                            size: spacer6,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: spacer3),
      ],
    );
  }
}
