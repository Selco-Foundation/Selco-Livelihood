import 'package:digit_forms_engine/blocs/forms/forms.dart';
import 'package:digit_forms_engine/json_forms.dart';
import 'package:digit_forms_engine/models/property_schema/property_schema.dart';
import 'package:digit_forms_engine/models/schema_object/schema_object.dart';
import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/atoms/digit_stepper.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:reactive_forms/reactive_forms.dart';

import '../model/solar_installation_draft.dart';
import '../repositories/asset_mdms_repository.dart';
import '../repositories/installation_draft_repository.dart';
import '../router/app_router.dart';
import '../utils/dynamic_form_schema.dart';
import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../widgets/report_navigation_header.dart';

@RoutePage()
class DynamicBomFormPage extends StatefulWidget {
  const DynamicBomFormPage({
    super.key,
    required this.draft,
    required this.schemaName,
    required this.pageName,
    required this.readOnly,
  });

  final SolarInstallationDraft draft;
  final String schemaName;
  final String pageName;
  final bool readOnly;

  @override
  State<DynamicBomFormPage> createState() => _DynamicBomFormPageState();
}

class _DynamicBomFormPageState extends State<DynamicBomFormPage> {
  SchemaObject? _schema;
  FormGroup? _activeForm;
  String? _error;
  String? _resolvedPageName;
  bool _isPreparing = false;

  String get _schemaKey => '${widget.draft.cacheKey}::${widget.schemaName}';
  String get _pageName => _resolvedPageName ?? widget.pageName;

  Map<String, dynamic> get _initialValues => <String, dynamic>{
        ...widget.draft.mergedBom,
        ...?widget.draft.dynamicFormAnswers[widget.schemaName],
      };

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_schema == null && _error == null) _prepareSchema();
  }

  Future<void> _prepareSchema() async {
    if (_isPreparing) return;
    _isPreparing = true;
    final formsBloc = context.read<FormsBloc>();

    try {
      await Future.wait<void>([
        assetMdmsRepository.load(),
        installationDraftRepository.hydrateSolar(widget.draft).catchError((_) {
          // Template and cached in-memory values can still render when a
          // backend snapshot is temporarily unavailable.
        }),
      ]);
      if (!mounted) return;

      var schema = formsBloc.state.cachedSchemas[_schemaKey];
      if (schema == null) {
        final raw = assetMdmsRepository.rawBomSchemaFor(widget.schemaName);
        if (raw == null) throw const FormatException('Missing BOM schema');
        schema = SchemaObject.fromJson(transformBomMdmsRecordToSchema(raw));
        formsBloc.add(FormsUpdateEvent(schema: schema, schemaKey: _schemaKey));
      }

      if (schema.pages.isEmpty) throw const FormatException('Empty BOM schema');
      final requested = widget.pageName.trim();
      final pageName =
          requested.isNotEmpty && schema.pages.containsKey(requested)
              ? requested
              : schema.pages.keys.first;
      setState(() {
        _resolvedPageName = pageName;
        _schema = schema;
      });
    } catch (_) {
      if (mounted) setState(() => _error = widget.schemaName);
    } finally {
      _isPreparing = false;
    }
  }

  Map<String, dynamic> _defaultsFor(PropertySchema page) {
    final keys = page.properties?.keys.toSet() ?? const <String>{};
    return <String, dynamic>{
      for (final entry in _initialValues.entries)
        if (keys.contains(entry.key)) entry.key: entry.value,
    };
  }

  FormGroup _buildForm(PropertySchema page) {
    final form = fb.group(
      JsonForms.getFormControls(page, defaultValues: const {}),
    );
    final defaults = _defaultsFor(page);
    for (final entry in page.properties?.entries ??
        const <MapEntry<String, PropertySchema>>[]) {
      if (!form.contains(entry.key)) continue;
      final control = form.control(entry.key);
      final raw = defaults.containsKey(entry.key)
          ? defaults[entry.key]
          : entry.value.value;
      control.updateValue(
        _coerceForControl(control, raw),
        updateParent: true,
        emitEvent: false,
      );
    }
    _activeForm = form;
    return form;
  }

  SchemaObject _updatedSchema(FormGroup form, PropertySchema page) {
    final schema = _schema!;
    final values = JsonForms.getFormValues(form, page);
    final updatedPage = page.copyWith(
      properties: Map.fromEntries(
        page.properties?.entries.map(
              (entry) => values.containsKey(entry.key)
                  ? MapEntry(
                      entry.key,
                      entry.value.copyWith(value: values[entry.key]),
                    )
                  : entry,
            ) ??
            const [],
      ),
    );
    return schema.copyWith(
      pages: Map.fromEntries(
        schema.pages.entries.map(
          (entry) => MapEntry(
            entry.key,
            entry.key == _pageName ? updatedPage : entry.value,
          ),
        ),
      ),
    );
  }

  SchemaObject _persist(FormGroup form, PropertySchema page) {
    final updated = _updatedSchema(form, page);
    _schema = updated;
    context
        .read<FormsBloc>()
        .add(FormsUpdateEvent(schema: updated, schemaKey: _schemaKey));
    if (!widget.readOnly) {
      final values = JsonForms.getFormValues(form, page);
      widget.draft.dynamicFormAnswers
          .putIfAbsent(widget.schemaName, () => <String, dynamic>{})
          .addAll(values);
      widget.draft.mergedBom.addAll(values);
      installationDraftRepository.saveSolarSoon(widget.draft);
    }
    return updated;
  }

  bool _validate(FormGroup form, PropertySchema page) {
    for (final key in page.properties?.keys ?? const <String>[]) {
      final label = _prettyLabel(page.properties?[key]?.label ?? key);
      if (!form.contains(key)) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$label ${context.translate(i18.common.isRequired)}'),
          ),
        );
        return false;
      }
      final control = form.control(key)
        ..markAsTouched()
        ..updateValueAndValidity();
      if (!control.valid) {
        final errors = control.errors;
        final reason = errors.containsKey(ValidationMessage.required)
            ? context.translate(i18.common.isRequired)
            : errors.containsKey(ValidationMessage.pattern)
                ? context.translate(i18.common.hasInvalidFormat)
                : errors.containsKey(ValidationMessage.number)
                    ? context.translate(i18.common.mustBeNumber)
                    : errors.containsKey(ValidationMessage.min)
                        ? context.translate(i18.common.belowMinimum)
                        : errors.containsKey(ValidationMessage.max)
                            ? context.translate(i18.common.aboveMaximum)
                            : null;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(reason == null
                ? '${context.translate(i18.common.pleaseCorrect)}: $label'
                : '$label $reason'),
          ),
        );
        return false;
      }
    }
    return true;
  }

  Future<void> _continue(FormGroup form, PropertySchema page) async {
    if (!widget.readOnly && !_validate(form, page)) return;
    final updated = _persist(form, page);
    final pageNames = updated.pages.keys.toList();
    final index = pageNames.indexOf(_pageName);
    if (index >= 0 && index < pageNames.length - 1) {
      await context.router.push(
        DynamicBomFormRoute(
          draft: widget.draft,
          schemaName: widget.schemaName,
          pageName: pageNames[index + 1],
          readOnly: widget.readOnly,
        ),
      );
      if (!mounted) return;
      final cached = context.read<FormsBloc>().state.cachedSchemas[_schemaKey];
      if (cached != null) setState(() => _schema = cached);
      return;
    }
    context.router.popUntilRouteWithName(OverallAssetSummaryRoute.name);
  }

  void _back() {
    final schema = _schema;
    final form = _activeForm;
    final page = schema?.pages[_pageName];
    if (form != null && page != null) _persist(form, page);
    context.router.maybePop();
  }

  @override
  Widget build(BuildContext context) {
    final schema = _schema;
    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Text(
            context.translate(i18.common.formSchemaMissing),
            key: const ValueKey('dynamic-form-schema-missing'),
          ),
        ),
      );
    }
    if (schema == null) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(
            key: ValueKey('dynamic-form-loading'),
          ),
        ),
      );
    }

    final page = schema.pages[_pageName]!;
    final pageIndex = schema.pages.keys.toList().indexOf(_pageName);
    final theme = Theme.of(context);
    return PopScope(
      onPopInvoked: (didPop) {
        if (!didPop) return;
        final form = _activeForm;
        if (form != null) _persist(form, page);
      },
      child: Scaffold(
        body: BlocConsumer<FormsBloc, FormsState>(
          listener: (_, __) {},
          builder: (context, state) => ReactiveFormBuilder(
            key: ValueKey('dynamic-form-$_schemaKey-$_pageName'),
            form: () => _buildForm(page),
            builder: (context, form, child) => ScrollableContent(
              enableFixedDigitButton: true,
              header: Padding(
                padding: const EdgeInsets.all(spacer2),
                child: ReportNavigationHeader(onBackPressed: _back),
              ),
              footer: DigitCard(
                margin: const EdgeInsets.only(top: spacer2),
                children: [
                  ReactiveFormConsumer(
                    builder: (context, form, child) => DigitButton(
                      key: const ValueKey('dynamic-form-continue'),
                      label: page.actionLabel ??
                          (pageIndex < schema.pages.length - 1
                              ? context.translate(i18.common.next)
                              : context.translate(i18.common.submit)),
                      onPressed: () => _continue(form, page),
                      type: DigitButtonType.primary,
                      size: DigitButtonSize.large,
                      mainAxisSize: MainAxisSize.max,
                    ),
                  ),
                ],
              ),
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: spacer4),
                  child: SizedBox(
                    height: spacer8,
                    child: DigitStepper(
                      key: const ValueKey('dynamic-form-stepper'),
                      activeIndex: pageIndex,
                      stepperList: List.generate(
                        schema.pages.length,
                        (_) => const StepperData(),
                      ),
                      stepperDirection: Axis.horizontal,
                      inverted: true,
                    ),
                  ),
                ),
                const SizedBox(height: spacer3),
                DigitCard(
                  key: const ValueKey('dynamic-form-card'),
                  margin: const EdgeInsets.symmetric(horizontal: spacer2),
                  children: [
                    if (page.label != null)
                      Text(
                        page.label!,
                        style: theme
                            .digitTextTheme(context)
                            .headingXl
                            .copyWith(color: theme.colorTheme.primary.primary2),
                      ),
                    if (page.description != null)
                      Text(
                        page.description!,
                        style: theme
                            .digitTextTheme(context)
                            .bodyS
                            .copyWith(color: theme.colorTheme.text.secondary),
                      ),
                    JsonForms(
                      currentSchemaKey: _schemaKey,
                      propertySchema: page,
                      pageName: _pageName,
                      childrens: const [],
                      defaultValues: _defaultsFor(page),
                      isView: widget.readOnly,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

dynamic _coerceForControl(AbstractControl<Object?> control, dynamic value) {
  if (value == null) return null;
  if (control is FormControl<String?>) return value.toString();
  if (control is FormControl<DateTime?>) {
    return value is DateTime ? value : DateTime.tryParse(value.toString());
  }
  if (control is FormControl<int?>) {
    return value is num ? value.toInt() : int.tryParse(value.toString());
  }
  if (control is FormControl<double?>) {
    return value is num ? value.toDouble() : double.tryParse(value.toString());
  }
  if (control is FormControl<bool?>) {
    if (value is bool) return value;
    final normalized = value.toString().trim().toLowerCase();
    if (normalized == 'true' || normalized == '1' || normalized == 'yes') {
      return true;
    }
    if (normalized == 'false' || normalized == '0' || normalized == 'no') {
      return false;
    }
    return null;
  }
  return value;
}

String _prettyLabel(String value) {
  final spaced = value.replaceAll(RegExp(r'[_\-]+'), ' ').trim();
  return spaced.replaceAllMapped(
    RegExp(r'\b[a-z]'),
    (match) => match.group(0)!.toUpperCase(),
  );
}
