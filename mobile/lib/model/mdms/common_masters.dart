class BomFormSchema {
  const BomFormSchema({required this.name, required this.pages});

  final String name;
  final List<BomFormPage> pages;

  factory BomFormSchema.fromJson(Map<String, dynamic> json) {
    final data = _data(json);
    return BomFormSchema(
      name: (data['name'] ?? json['uniqueIdentifier'] ?? '').toString(),
      pages: _maps(data['pages']).map(BomFormPage.fromJson).toList()
        ..sort((a, b) => a.order.compareTo(b.order)),
    );
  }
}

class MachineFormSchema {
  const MachineFormSchema({
    required this.name,
    required this.title,
    required this.fields,
  });

  final String name;
  final String title;
  final List<MachineFormField> fields;

  factory MachineFormSchema.fromJson(Map<String, dynamic> json) {
    final data = _data(json);
    return MachineFormSchema(
      name: (data['name'] ?? json['uniqueIdentifier'] ?? '').toString(),
      title: (data['title'] ?? 'Machine Report').toString(),
      fields: _maps(data['fields'])
          .map(MachineFormField.fromJson)
          .where((field) => field.active && field.fieldName.isNotEmpty)
          .toList()
        ..sort((a, b) => a.order.compareTo(b.order)),
    );
  }
}

class MachineFormField {
  const MachineFormField({
    required this.title,
    required this.fieldName,
    required this.type,
    required this.order,
    required this.requiredField,
    required this.active,
    this.requiredCount = 1,
    this.defaultValue,
  });

  final String title;
  final String fieldName;
  final String type;
  final int order;
  final bool requiredField;
  final bool active;
  final int requiredCount;
  final dynamic defaultValue;

  bool get isMedia => type == 'image' || type == 'video';
  bool get allowMultiples => isMedia && requiredCount > 1;

  bool mediaCountComplete(int count) => requiredField
      ? count >= requiredCount
      : count == 0 || count >= requiredCount;

  String get requiredLabel {
    final noun = type == 'video' ? 'video' : 'image';
    return requiredCount == 1
        ? 'Required: 1 $noun'
        : 'Required: $requiredCount ${noun}s';
  }

  factory MachineFormField.fromJson(Map<String, dynamic> json) {
    final type = (json['type'] ?? 'text').toString().trim().toLowerCase();
    return MachineFormField(
      title: (json['title'] ?? json['fieldName'] ?? '').toString(),
      fieldName: (json['fieldName'] ?? '').toString(),
      type: type,
      order: _integer(json['order']),
      requiredField: json['required'] == true,
      active: json['active'] != false && json['isActive'] != false,
      requiredCount: type == 'image' || type == 'video'
          ? _integer(json['requiredCount']).clamp(1, 100)
          : 1,
      defaultValue: json['defaultValue'],
    );
  }
}

class BomFormPage {
  const BomFormPage({
    required this.code,
    required this.label,
    required this.order,
    required this.actionLabel,
    required this.properties,
  });

  final String code;
  final String label;
  final int order;
  final String actionLabel;
  final List<BomFormProperty> properties;

  factory BomFormPage.fromJson(Map<String, dynamic> json) => BomFormPage(
        code: (json['page'] ?? '').toString(),
        label: (json['label'] ?? json['page'] ?? '').toString(),
        order: _integer(json['order']),
        actionLabel: (json['actionLabel'] ?? 'Next').toString(),
        properties:
            _maps(json['properties']).map(BomFormProperty.fromJson).toList()
              ..sort((a, b) => a.order.compareTo(b.order)),
      );
}

class BomFormProperty {
  const BomFormProperty({
    required this.fieldName,
    required this.label,
    required this.type,
    required this.format,
    required this.order,
    required this.value,
    required this.hidden,
    required this.readOnly,
    required this.includeInForm,
    required this.requiredField,
    required this.enums,
    required this.multiSelect,
    this.section,
    this.helpText,
  });

  final String fieldName;
  final String label;
  final String type;
  final String format;
  final int order;
  final dynamic value;
  final bool hidden;
  final bool readOnly;
  final bool includeInForm;
  final bool requiredField;
  final List<MdmsOption> enums;
  final bool multiSelect;
  final String? section;
  final String? helpText;

  factory BomFormProperty.fromJson(Map<String, dynamic> json) {
    final validations = _maps(json['validations']);
    return BomFormProperty(
      fieldName: (json['fieldName'] ?? '').toString(),
      label: (json['label'] ?? json['fieldName'] ?? '').toString(),
      type: (json['type'] ?? 'string').toString(),
      format: (json['format'] ?? 'text').toString(),
      order: _integer(json['order']),
      value: json['value'],
      hidden: json['hidden'] == true,
      readOnly: json['readOnly'] == true,
      includeInForm: json['includeInForm'] != false,
      requiredField: validations
          .any((item) => item['type'] == 'required' && item['value'] != false),
      enums: _maps(json['enums']).map(MdmsOption.fromJson).toList(),
      multiSelect: json['isMultiSelect'] == true,
      section: json['section']?.toString(),
      helpText: json['helpText']?.toString(),
    );
  }
}

class MdmsOption {
  const MdmsOption({required this.code, required this.name});
  final String code;
  final String name;

  factory MdmsOption.fromJson(Map<String, dynamic> json) => MdmsOption(
        code: (json['code'] ?? json['name'] ?? '').toString(),
        name: (json['name'] ?? json['code'] ?? '').toString(),
      );
}

class SolutionDesignBomForms {
  const SolutionDesignBomForms(
      {required this.solutionCode, required this.forms});
  final String solutionCode;
  final List<String> forms;

  factory SolutionDesignBomForms.fromJson(Map<String, dynamic> json) {
    final data = _data(json);
    return SolutionDesignBomForms(
      solutionCode:
          (data['solutionCode'] ?? json['uniqueIdentifier'] ?? '').toString(),
      forms: _maps(data['bomForms'])
          .map((item) => (item['name'] ?? '').toString())
          .where((name) => name.isNotEmpty)
          .toList(),
    );
  }
}

class InstallationImageSystemType {
  const InstallationImageSystemType({
    required this.code,
    required this.order,
  });

  final String code;
  final num order;

  factory InstallationImageSystemType.fromJson(Map<String, dynamic> json) =>
      InstallationImageSystemType(
        code: (json['code'] ?? '').toString().trim(),
        order: json['order'] is num
            ? json['order'] as num
            : num.tryParse('${json['order']}') ?? 0,
      );
}

class InstallationImageRequirement {
  const InstallationImageRequirement({
    required this.code,
    required this.description,
    required this.requiredCount,
    this.active = true,
    this.shortTitle,
    this.systemTypes = const [],
  });

  final String code;
  final String description;
  final int requiredCount;
  final bool active;
  final String? shortTitle;
  final List<InstallationImageSystemType> systemTypes;

  factory InstallationImageRequirement.fromJson(Map<String, dynamic> json) =>
      InstallationImageRequirement(
        code: (json['code'] ?? '').toString(),
        description: (json['description'] ?? '').toString(),
        requiredCount: _integer(json['required_count']).clamp(1, 100),
        active: json['active'] != false && json['isActive'] != false,
        shortTitle: json['short_title']?.toString(),
        systemTypes: _maps(json['system_types'])
            .map(InstallationImageSystemType.fromJson)
            .where((value) => value.code.isNotEmpty)
            .toList(),
      );

  bool get allowMultiples => requiredCount > 1;

  String get requiredLabel => requiredCount == 1
      ? 'Required: 1 image'
      : 'Required: $requiredCount images';

  InstallationImageSystemType? systemTypeEntry(String systemCode) {
    final normalized = systemCode.trim().toUpperCase();
    for (final entry in systemTypes) {
      if (entry.code.trim().toUpperCase() == normalized) return entry;
    }
    return null;
  }

  String? orderLabel(String systemCode) {
    final order = systemTypeEntry(systemCode)?.order;
    if (order == null) return null;
    return order == order.truncateToDouble()
        ? order.truncate().toString()
        : order.toString();
  }
}

Map<String, dynamic> _data(Map<String, dynamic> json) =>
    json['data'] is Map<String, dynamic>
        ? json['data'] as Map<String, dynamic>
        : json;

List<Map<String, dynamic>> _maps(dynamic value) =>
    (value as List<dynamic>? ?? const [])
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();

int _integer(dynamic value) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? 0;
