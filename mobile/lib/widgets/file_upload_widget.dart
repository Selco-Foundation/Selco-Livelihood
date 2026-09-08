import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../model/solar_installation_draft.dart';
import '../pages/media_viewer.dart';

typedef FileUploadPick = Future<List<PlatformFile>> Function();

/// In-memory adaptation of E4H's shared FileUploadWidget.
class FileUploadWidget extends StatefulWidget {
  const FileUploadWidget({
    super.key,
    required this.label,
    required this.onFilesSelected,
    this.initialFiles = const [],
    this.pickFiles,
    this.allowedExtensions = const ['xlsx', 'xls', 'pdf', 'jpg', 'jpeg', 'png'],
    this.allowMultiples = false,
    this.showPreview = false,
    this.errorMessage,
    this.noFileSelectedText = 'No File Selected',
    this.uploadText = 'Upload',
    this.reUploadText = 'Re-Upload',
    this.isDisabled = false,
    this.maxFiles,
  });

  final String label;
  final List<SolarFileRef> initialFiles;
  final ValueChanged<List<SolarFileRef>> onFilesSelected;
  final FileUploadPick? pickFiles;
  final List<String> allowedExtensions;
  final bool allowMultiples;
  final bool showPreview;
  final String? errorMessage;
  final String noFileSelectedText;
  final String uploadText;
  final String reUploadText;
  final bool isDisabled;
  final int? maxFiles;

  @override
  State<FileUploadWidget> createState() => _FileUploadWidgetState();
}

class _FileUploadWidgetState extends State<FileUploadWidget> {
  late List<SolarFileRef> files = List.of(widget.initialFiles);
  String? localError;
  bool opening = false;

  bool get _atLimit =>
      widget.maxFiles != null && files.length >= widget.maxFiles!;

  @override
  void didUpdateWidget(covariant FileUploadWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    final incoming = widget.initialFiles.map((e) => e.path).join('\u0000');
    final current = files.map((e) => e.path).join('\u0000');
    if (incoming != current) files = List.of(widget.initialFiles);
  }

  Future<void> _pick() async {
    if (opening || widget.isDisabled || _atLimit) return;
    setState(() {
      opening = true;
      localError = null;
    });
    try {
      final selected = widget.pickFiles != null
          ? await widget.pickFiles!()
          : (await FilePicker.platform.pickFiles(
                allowMultiple: widget.allowMultiples,
                type: FileType.custom,
                allowedExtensions: widget.allowedExtensions,
              ))
                  ?.files ??
              const <PlatformFile>[];
      if (!mounted || selected.isEmpty) return;
      final available = widget.maxFiles == null
          ? selected.length
          : (widget.maxFiles! - files.length).clamp(0, selected.length);
      final additions =
          selected.where((file) => file.path != null).take(available).map(
                (file) => SolarFileRef(
                  name: file.name,
                  path: file.path!,
                  kind: file.extension?.toLowerCase() == 'pdf'
                      ? SolarFileKind.pdf
                      : SolarFileKind.image,
                ),
              );
      setState(() {
        if (!widget.allowMultiples) files.clear();
        files.addAll(additions);
      });
      widget.onFilesSelected(List.of(files));
    } catch (_) {
      if (mounted) {
        setState(() => localError =
            context.translate(i18.installationReport.filePickerError));
      }
    } finally {
      if (mounted) setState(() => opening = false);
    }
  }

  void _remove(int index) {
    setState(() => files.removeAt(index));
    widget.onFilesSelected(List.of(files));
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).digitTextTheme(context);
    final error = localError ?? widget.errorMessage;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (!widget.isDisabled)
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Container(
                  key: const ValueKey('file-uploader-input'),
                  height: spacer10,
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: error == null
                          ? const DigitColors().light.textPrimary
                          : const DigitColors().light.alertError,
                      width: error == null ? 1 : 2,
                    ),
                  ),
                  padding: const EdgeInsets.only(top: spacer2, left: spacer2),
                  child: Text(
                    files.isEmpty
                        ? widget.noFileSelectedText
                        : '${files.length} Selected',
                    style: textTheme.bodyS.copyWith(
                      color: files.isEmpty
                          ? const DigitColors().light.textDisabled
                          : const DigitColors().light.textPrimary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: spacer3),
              DigitButton(
                key: const ValueKey('file-uploader-button'),
                label: opening
                    ? 'Opening...'
                    : !widget.allowMultiples && files.isNotEmpty
                        ? widget.reUploadText
                        : widget.uploadText,
                prefixIcon: Icons.file_upload,
                type: DigitButtonType.secondary,
                size: DigitButtonSize.large,
                isDisabled: widget.isDisabled || opening || _atLimit,
                onPressed: _pick,
              ),
            ],
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
        const SizedBox(height: spacer3),
        if (widget.showPreview)
          Wrap(
            spacing: spacer3,
            runSpacing: spacer3,
            children: [
              for (var index = 0; index < files.length; index++)
                _FilePreview(
                  key: ValueKey('file-uploader-preview-$index'),
                  file: files[index],
                  removable: !widget.isDisabled,
                  onRemove: () => _remove(index),
                ),
            ],
          ),
      ],
    );
  }
}

class _FilePreview extends StatelessWidget {
  const _FilePreview({
    super.key,
    required this.file,
    required this.removable,
    required this.onRemove,
  });

  final SolarFileRef file;
  final bool removable;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: Base.imageSize,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
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
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      MediaThumbnail(
                        media: file,
                        width: Base.imageSize,
                        height: Base.imageSize,
                      ),
                      Container(
                        color: const DigitColors().background.withOpacity(.7),
                      ),
                    ],
                  ),
                ),
              ),
              if (removable)
                Positioned(
                  top: 0,
                  right: 0,
                  child: InkWell(
                    key: const ValueKey('file-uploader-remove'),
                    onTap: onRemove,
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
          const SizedBox(height: spacer1),
          Text(file.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).digitTextTheme(context).bodyXS),
        ],
      ),
    );
  }
}
