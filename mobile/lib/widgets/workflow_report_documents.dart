import 'dart:io';

import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';

import '../model/solar_installation_draft.dart';
import '../pages/media_viewer.dart';

const installationCompletionReport = 'INSTALLATION_COMPLETION_REPORT';
const installationReportBom = 'INSTALLATION_REPORT_BOM';

bool isWorkflowReportType(String? value) {
  final type = value?.trim().toUpperCase();
  return type == installationCompletionReport || type == installationReportBom;
}

/// Converts only the two report document types displayed below installation
/// forms. Machine form media remains sourced from Asset Registry documents.
List<SolarFileRef> workflowReportMedia(
  Iterable<Map<String, dynamic>> documents,
) {
  final files = <SolarFileRef>[];
  for (final document in documents) {
    final documentType = (document['documentType'] ?? document['type'] ?? '')
        .toString()
        .trim()
        .toUpperCase();
    if (!isWorkflowReportType(documentType)) continue;

    final fileStore = (document['fileStoreId'] ?? document['fileStore'] ?? '')
        .toString()
        .trim();
    if (fileStore.isEmpty) continue;

    final documentUid = document['documentUid']?.toString();
    final fileName = (document['fileName'] ?? document['name'] ?? documentUid)
        ?.toString()
        .trim();
    final kind = _reportKind(
      documentType: documentType,
      documentUid: documentUid,
      mimeType: document['mimeType']?.toString(),
      fileName: fileName,
    );

    final title = documentType == installationReportBom
        ? 'Installation Report BOM'
        : 'Installation Completion Report';
    files.add(SolarFileRef(
      name: fileName?.isNotEmpty == true
          ? fileName!
          : kind == SolarFileKind.pdf
              ? '$title.pdf'
              : title,
      path: fileStore,
      remoteId: fileStore,
      kind: kind,
      displayTitle: title,
      mimeType: document['mimeType']?.toString(),
      documentType: documentType,
      id: document['id']?.toString(),
      documentUid: documentUid,
      status: document['status']?.toString() ?? 'ACTIVE',
      additionalDetails: document['additionalDetails'] is Map
          ? Map<String, dynamic>.from(document['additionalDetails'] as Map)
          : null,
      geoLocation: document['geoLocation'] is Map
          ? Map<String, dynamic>.from(document['geoLocation'] as Map)
          : null,
    ));
  }
  return files;
}

SolarFileKind _reportKind({
  required String documentType,
  String? documentUid,
  String? mimeType,
  String? fileName,
}) {
  if (documentType == installationReportBom) return SolarFileKind.pdf;
  final value =
      '${documentUid ?? ''} ${mimeType ?? ''} ${fileName ?? ''}'.toLowerCase();
  if (value.contains('-pdf-') ||
      value.contains('application/pdf') ||
      value.endsWith('.pdf')) {
    return SolarFileKind.pdf;
  }
  return SolarFileKind.image;
}

class WorkflowReportDocuments extends StatelessWidget {
  const WorkflowReportDocuments({
    super.key,
    required this.documents,
  });

  final Iterable<Map<String, dynamic>> documents;

  @override
  Widget build(BuildContext context) => ReportDocumentGallery(
        files: workflowReportMedia(documents),
        keyPrefix: 'workflow-report',
      );
}

/// E4H-style report presentation: image thumbnails first, then PDF cards.
class ReportDocumentGallery extends StatelessWidget {
  const ReportDocumentGallery({
    super.key,
    required this.files,
    this.onRemove,
    this.keyPrefix = 'report-document',
  });

  final List<SolarFileRef> files;
  final ValueChanged<SolarFileRef>? onRemove;
  final String keyPrefix;

  @override
  Widget build(BuildContext context) {
    final indexed = files.indexed.toList();
    final images =
        indexed.where((entry) => entry.$2.kind == SolarFileKind.image).toList();
    final pdfs =
        indexed.where((entry) => entry.$2.kind == SolarFileKind.pdf).toList();
    if (images.isEmpty && pdfs.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (images.isNotEmpty) ...[
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final entry in images)
                  Padding(
                    padding: const EdgeInsets.only(right: spacer2),
                    child: _ImageReportTile(
                      key: ValueKey('$keyPrefix-preview-${entry.$1}'),
                      file: entry.$2,
                      onRemove:
                          onRemove == null ? null : () => onRemove!(entry.$2),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: spacer3),
        ],
        for (final entry in pdfs)
          Padding(
            padding: const EdgeInsets.only(bottom: spacer2),
            child: _PdfReportTile(
              key: ValueKey('$keyPrefix-preview-${entry.$1}'),
              file: entry.$2,
              onRemove: onRemove == null ? null : () => onRemove!(entry.$2),
            ),
          ),
      ],
    );
  }
}

class _ImageReportTile extends StatelessWidget {
  const _ImageReportTile({
    super.key,
    required this.file,
    this.onRemove,
  });

  final SolarFileRef file;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) => Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: Base.imageSize,
            height: Base.imageSize,
            decoration: BoxDecoration(
              border: Border.all(
                color: const DigitColors().light.genericDivider,
              ),
            ),
            child: ClipRRect(
              borderRadius: Base.radius,
              child: MediaThumbnail(
                media: file,
                width: Base.imageSize,
                height: Base.imageSize,
              ),
            ),
          ),
          if (onRemove != null) _RemoveButton(onPressed: onRemove!),
        ],
      );
}

class _PdfReportTile extends StatelessWidget {
  const _PdfReportTile({
    super.key,
    required this.file,
    this.onRemove,
  });

  final SolarFileRef file;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final localPath = file.localPath ?? file.path;
    final localFile = File(localPath);
    final size = !file.isRemote && localFile.existsSync()
        ? _fileSize(localFile.lengthSync())
        : '';
    final title = file.viewerTitle.toLowerCase().endsWith('.pdf')
        ? file.viewerTitle
        : '${file.viewerTitle}.pdf';

    return Stack(
      clipBehavior: Clip.none,
      children: [
        InkWell(
          onTap: () => openMediaViewer(context, file),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(spacer4),
            decoration: BoxDecoration(
              color: theme.colorTheme.generic.background,
              border: Border.all(color: theme.colorTheme.generic.divider),
              borderRadius: BorderRadius.circular(spacer1),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.picture_as_pdf,
                  color: theme.colorTheme.primary.primary1,
                  size: spacer9,
                ),
                const SizedBox(width: spacer3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title.replaceAll('_', ' '),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.headingM.copyWith(fontSize: spacer4),
                      ),
                      if (size.isNotEmpty) ...[
                        const SizedBox(height: spacer1),
                        Text(size, style: textTheme.bodyS),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        if (onRemove != null) _RemoveButton(onPressed: onRemove!),
      ],
    );
  }
}

class _RemoveButton extends StatelessWidget {
  const _RemoveButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Positioned(
        right: 0,
        top: 0,
        child: InkWell(
          key: const ValueKey('file-uploader-remove'),
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

String _fileSize(int bytes) {
  if (bytes < 1024) return '$bytes B';
  final kilobytes = bytes / 1024;
  if (kilobytes < 1024) return '${kilobytes.toStringAsFixed(1)} KB';
  return '${(kilobytes / 1024).toStringAsFixed(1)} MB';
}
