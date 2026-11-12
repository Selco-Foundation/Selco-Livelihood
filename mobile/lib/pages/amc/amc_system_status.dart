import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/models/RadioButtonModel.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';

import '../../model/amc/scheduled_visit.dart';
import '../../repositories/amc/amc_system_status_repo.dart';
import '../../router/app_router.dart';
import '../../utils/amc/amc_utils.dart';
import '../../utils/extensions.dart';
import '../../utils/i18_key_constants.dart' as i18;
import '../../widgets/amc/amc_back_navigation_help_header.dart';

/// Pre-report status check (#247), shown after an AMC card is selected and
/// before the report form:
///   1. "Is the end user using the system?"  Yes / No
///   2. "Is the system functional?"          Yes / No (solar system only)
///
/// Both are mandatory. "Next" saves them on the device; if the system is not
/// functional, it also sends the status to the backend once per activity so
/// the Program POC is emailed. A failed send (e.g. offline) does not block
/// the report: the vendor is told, and saving again retries. Read-only when
/// opened from the inbox / submitted lists, like the form.
@RoutePage()
class AmcSystemStatusPage extends StatefulWidget {
  const AmcSystemStatusPage({
    super.key,
    required this.scheduledVisit,
    required this.origin,
  });

  final ScheduledVisit scheduledVisit;
  final FormOrigin origin;

  @override
  State<AmcSystemStatusPage> createState() => _AmcSystemStatusPageState();
}

class _AmcSystemStatusPageState extends State<AmcSystemStatusPage> {
  static const String _yes = 'YES';
  static const String _no = 'NO';

  final _repository = AmcSystemStatusRepository();

  bool? _inUse;
  bool? _functional;
  bool _loading = true;
  bool _saving = false;
  bool _showErrors = false;

  bool get _readOnly =>
      widget.origin == FormOrigin.inboxSummary ||
      widget.origin == FormOrigin.submitted;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final saved = await _repository.load(widget.scheduledVisit);
    if (!mounted) return;
    setState(() {
      _inUse = saved?.isSystemInUse;
      _functional = saved?.isSystemFunctional;
      _loading = false;
    });
  }

  Future<void> _openForm() => context.router.push(AmcDynamicFormRoute(
        pageName: amcFormFirstPage,
        uniqueIdentifier: amcFormSchemaKey,
        schemaName: amcFormSchemaKey,
        scheduledVisit: widget.scheduledVisit,
        origin: widget.origin,
      ));

  Future<void> _onNext() async {
    if (_loading || _saving) return;
    if (_readOnly) {
      await _openForm();
      return;
    }
    final inUse = _inUse;
    final functional = _functional;
    if (inUse == null || functional == null) {
      setState(() => _showErrors = true);
      return;
    }

    setState(() => _saving = true);
    final AmcSystemStatusSaveResult result;
    try {
      result = await _repository.save(
        visit: widget.scheduledVisit,
        isSystemInUse: inUse,
        isSystemFunctional: functional,
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
    if (!mounted) return;

    final messageKey = switch (result) {
      AmcSystemStatusSaveResult.notified => i18.amcSystemStatus.pocNotified,
      AmcSystemStatusSaveResult.notifyFailed =>
        i18.amcSystemStatus.pocNotifyFailed,
      AmcSystemStatusSaveResult.saved => null,
    };
    if (messageKey != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(context.translate(messageKey))));
    }
    // A "No" for functional status never blocks the report.
    await _openForm();
  }

  String _groupValue(bool? value) => value == null ? '' : (value ? _yes : _no);

  Widget _question({
    required Key key,
    required String questionKey,
    String? hintKey,
    required bool? value,
    required ValueChanged<bool> onChanged,
  }) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${context.translate(questionKey)} *',
          style:
              textTheme.headingS.copyWith(color: theme.colorTheme.text.primary),
        ),
        if (hintKey != null)
          Padding(
            padding: const EdgeInsets.only(top: spacer1),
            child: Text(
              context.translate(hintKey),
              style: textTheme.bodyS
                  .copyWith(color: theme.colorTheme.text.secondary),
            ),
          ),
        RadioList(
          key: key,
          groupValue: _groupValue(value),
          readOnly: _readOnly,
          isDisabled: _readOnly,
          containerPadding:
              const EdgeInsets.symmetric(horizontal: 0, vertical: spacer2),
          errorMessage: _showErrors && value == null
              ? context.translate(i18.amcCommon.isRequired)
              : null,
          radioDigitButtons: [
            RadioButtonModel(
                code: _yes, name: context.translate(i18.common.yes)),
            RadioButtonModel(code: _no, name: context.translate(i18.common.no)),
          ],
          onChanged: (option) => setState(() => onChanged(option.code == _yes)),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    return Scaffold(
      body: ScrollableContent(
        enableFixedDigitButton: true,
        backgroundColor: theme.colorTheme.generic.background,
        header: const BackNavigationHelpHeaderWidget(
          showBackNavigation: true,
          showHelp: false,
        ),
        footer: DigitCard(
          margin: const EdgeInsets.only(top: spacer2),
          children: [
            DigitButton(
              key: const ValueKey('amc-system-status-next'),
              label: _saving
                  ? context.translate(i18.amcDynamicForm.loading)
                  : context.translate(i18.amcCommon.coreCommonNext),
              isDisabled: _loading || _saving,
              onPressed: _onNext,
              type: DigitButtonType.primary,
              size: DigitButtonSize.large,
              mainAxisSize: MainAxisSize.max,
            ),
          ],
        ),
        children: [
          DigitCard(
            margin: const EdgeInsets.all(spacer2),
            children: [
              Text(
                context.translate(i18.amcSystemStatus.title),
                style: textTheme.headingXl
                    .copyWith(color: theme.colorTheme.primary.primary2),
              ),
              Text(
                context.translate(i18.amcSystemStatus.description),
                style: textTheme.bodyS
                    .copyWith(color: theme.colorTheme.text.secondary),
              ),
              if (_loading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(spacer4),
                    child: CircularProgressIndicator(),
                  ),
                )
              else ...[
                const SizedBox(height: spacer2),
                _question(
                  key: const ValueKey('amc-system-status-in-use'),
                  questionKey: i18.amcSystemStatus.inUseQuestion,
                  value: _inUse,
                  onChanged: (v) => _inUse = v,
                ),
                _question(
                  key: const ValueKey('amc-system-status-functional'),
                  questionKey: i18.amcSystemStatus.functionalQuestion,
                  hintKey: i18.amcSystemStatus.functionalSolarOnly,
                  value: _functional,
                  onChanged: (v) => _functional = v,
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
