import 'mdms/common_masters.dart';
import 'solar_installation_draft.dart';
import '../utils/document_metadata.dart';

class InstallationProgress {
  const InstallationProgress(
      {required this.hasStarted,
      required this.fraction,
      required this.canSubmit});
  final bool hasStarted;
  final double fraction;
  final bool canSubmit;
}

/// Shared by the machine form and the list: optional media can still block
/// submission, while only required fields contribute to the fraction.
InstallationProgress machineInstallationProgress({
  required MachineFormSchema? schema,
  required Map<String, dynamic>? values,
  required Map<String, List<SolarFileRef>> media,
}) {
  final started = values != null;
  if (!started || schema == null || schema.fields.isEmpty) {
    return InstallationProgress(
        hasStarted: started, fraction: 0, canSubmit: false);
  }
  bool satisfied(MachineFormField field) {
    if (field.isMedia) {
      final files = media[field.fieldName] ?? const <SolarFileRef>[];
      return field.mediaCountComplete(files.length) && documentsReady(files);
    }
    if (!field.requiredField) return true;
    final value = values[field.fieldName];
    return field.type == 'boolean'
        ? value is bool
        : value != null && value.toString().trim().isNotEmpty;
  }

  final required = schema.fields.where((field) => field.requiredField).toList();
  final canSubmit = schema.fields.every(satisfied);
  final fraction = required.isEmpty
      ? 1.0
      : required.where(satisfied).length / required.length;
  return InstallationProgress(
      hasStarted: true,
      fraction: canSubmit ? fraction : fraction.clamp(0.0, 0.99),
      canSubmit: canSubmit);
}
