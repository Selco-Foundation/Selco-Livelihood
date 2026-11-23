import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/TextTheme/digit_text_theme.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:open_file/open_file.dart';

import '../../model/amc/amc_schedule.dart';
import '../../repositories/amc/scheduled_visit_repo.dart';
import '../../router/app_router.dart';
import '../../utils/amc/amc_schedule_export.dart';
import '../../utils/extensions.dart';
import '../../utils/i18_key_constants.dart' as i18;
import '../../widgets/amc/amc_back_navigation_help_header.dart';
import '../../widgets/amc/facility_list_controls.dart';

/// View Schedule: the logged-in vendor's AMC visits due in the next
/// 10, 20 or 30 days, and the same list as an Excel file. Read-only: a
/// visit is reported on from New AMC Report.
@RoutePage()
class AmcViewSchedulePage extends StatefulWidget {
  const AmcViewSchedulePage({super.key, this.repository});

  /// For tests; the app uses the default repository.
  final ScheduledVisitRepository? repository;

  @override
  State<AmcViewSchedulePage> createState() => _AmcViewSchedulePageState();
}

class _AmcViewSchedulePageState extends State<AmcViewSchedulePage> {
  late final ScheduledVisitRepository _repository =
      widget.repository ?? ScheduledVisitRepository();

  int _days = amcDefaultSchedulePeriod;
  AmcScheduleResult? _result;
  bool _loading = false;
  bool _failed = false;
  bool _downloading = false;

  /// Drops answers to an older request when the period changes quickly.
  int _request = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  /// Fetches the schedule again from the server, so it always reflects the
  /// current assignments and dates.
  Future<void> _load() async {
    final request = ++_request;
    setState(() {
      _loading = true;
      _failed = false;
    });
    try {
      final result = await _repository.fetchSchedule(days: _days);
      if (!mounted || request != _request) return;
      setState(() {
        _result = result;
        _loading = false;
      });
    } catch (e) {
      debugPrint('AMC schedule could not be loaded: $e');
      if (!mounted || request != _request) return;
      setState(() {
        _result = null;
        _loading = false;
        _failed = true;
      });
    }
  }

  void _selectPeriod(int days) {
    if (days == _days) return;
    setState(() {
      _days = days;
      _result = null;
    });
    _load();
  }

  String _text(String key, [Map<String, Object> values = const {}]) {
    var text = context.translate(key);
    values
        .forEach((name, value) => text = text.replaceAll('{$name}', '$value'));
    return text;
  }

  void _showMessage(String message, {SnackBarAction? action}) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message), action: action));
  }

  Future<void> _download() async {
    final visits = _result?.visits ?? const [];
    if (_downloading || visits.isEmpty) return;
    setState(() => _downloading = true);
    try {
      final bytes = buildAmcScheduleWorkbook(
        entries: [
          for (final visit in visits)
            AmcScheduleEntry.fromVisit(visit,
                machineNotInstalled:
                    _text(i18.amcSchedule.machineNotInstalled)),
        ],
        headers: [
          _text(i18.amcSchedule.endUserName),
          _text(i18.amcSchedule.phone),
          _text(i18.amcCommon.state),
          _text(i18.amcCommon.district),
          _text(i18.amcCommon.block),
          _text(i18.amcSchedule.scheduledDate),
          _text(i18.amcSchedule.machines),
        ],
      );
      final file = await saveAmcScheduleFile(bytes, amcScheduleFileName(_days));
      if (!mounted) return;
      _showMessage(
        _text(i18.amcSchedule.downloaded, {'path': file.path}),
        action: SnackBarAction(
          label: _text(i18.amcSchedule.open),
          onPressed: () async {
            final opened = await OpenFile.open(file.path);
            if (mounted && opened.type != ResultType.done) {
              _showMessage(
                  _text(i18.amcSchedule.noAppToOpen, {'path': file.path}));
            }
          },
        ),
      );
    } catch (e) {
      debugPrint('AMC schedule could not be downloaded: $e');
      if (mounted) _showMessage(_text(i18.amcSchedule.downloadFailed));
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final visits = _result?.visits ?? const [];

    return Scaffold(
      body: RefreshableFacilityList(
        onRefresh: _load,
        child: ScrollableContent(
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
                key: const ValueKey('amc-schedule-download'),
                label: _downloading
                    ? _text(i18.amcCommon.loading)
                    : _text(i18.amcSchedule.download),
                prefixIcon: Icons.download,
                type: DigitButtonType.primary,
                size: DigitButtonSize.large,
                mainAxisSize: MainAxisSize.max,
                isDisabled: _downloading || _loading || visits.isEmpty,
                onPressed: _download,
              ),
            ],
          ),
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: spacer4, vertical: spacer2),
              // Full width, like the visit cards below.
              child: SizedBox(
                width: double.infinity,
                child: _buildPeriodCard(textTheme, theme, visits.length),
              ),
            ),
            _buildBody(textTheme, theme, visits),
          ],
        ),
      ),
    );
  }

  Widget _buildPeriodCard(
      DigitTextTheme textTheme, ThemeData theme, int count) {
    return DigitCard(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _text(i18.amcSchedule.title),
              style: textTheme.headingXl
                  .copyWith(color: theme.colorTheme.primary.primary2),
            ),
            const SizedBox(height: spacer2),
            Text(
              _text(i18.amcSchedule.periodPrompt),
              style: textTheme.bodyL
                  .copyWith(color: theme.colorTheme.text.primary),
            ),
            const SizedBox(height: spacer2),
            Wrap(
              spacing: spacer2,
              runSpacing: spacer2,
              children: [
                for (final days in amcSchedulePeriods)
                  _PeriodChip(
                    key: ValueKey('amc-schedule-period-$days'),
                    label: _text(i18.amcSchedule.periodDays, {'days': days}),
                    selected: days == _days,
                    onTap: () => _selectPeriod(days),
                  ),
              ],
            ),
            if (_result != null && !_loading) ...[
              const SizedBox(height: spacer2),
              Text(
                _text(i18.amcSchedule.count, {'count': count, 'days': _days}),
                key: const ValueKey('amc-schedule-count'),
                style: textTheme.bodyS
                    .copyWith(color: theme.colorTheme.text.secondary),
              ),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildBody(DigitTextTheme textTheme, ThemeData theme, List visits) {
    Widget message(String text, {Color? color, Widget? action}) => Padding(
          padding: const EdgeInsets.all(spacer4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(text,
                  style: textTheme.bodyS.copyWith(
                      color: color ?? theme.colorTheme.text.secondary)),
              if (action != null) ...[
                const SizedBox(height: spacer2),
                action,
              ],
            ],
          ),
        );

    if (_failed) {
      return message(
        _text(i18.amcSchedule.loadFailed),
        color: theme.colorTheme.alert.error,
        action: DigitButton(
          key: const ValueKey('amc-schedule-retry'),
          label: _text(i18.amcCommon.retry),
          type: DigitButtonType.secondary,
          size: DigitButtonSize.medium,
          onPressed: _load,
        ),
      );
    }
    final result = _result;
    if (result == null) {
      return const Padding(
        padding: EdgeInsets.only(top: spacer8),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: spacer4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (result.fromCache)
            Padding(
              padding: const EdgeInsets.only(bottom: spacer2),
              child: Text(
                _text(i18.amcSchedule.offline),
                key: const ValueKey('amc-schedule-offline'),
                style: textTheme.bodyS
                    .copyWith(color: theme.colorTheme.alert.warning),
              ),
            ),
          if (result.visits.isEmpty)
            Text(
              _text(i18.amcSchedule.empty, {'days': _days}),
              key: const ValueKey('amc-schedule-empty'),
              style: textTheme.bodyS
                  .copyWith(color: theme.colorTheme.text.secondary),
            ),
          for (final visit in result.visits)
            Padding(
              padding: const EdgeInsets.only(bottom: spacer2),
              child: _ScheduleCard(
                key: ValueKey('amc-schedule-${visit.id}'),
                entry: AmcScheduleEntry.fromVisit(visit,
                    machineNotInstalled:
                        _text(i18.amcSchedule.machineNotInstalled)),
                text: _text,
              ),
            ),
        ],
      ),
    );
  }
}

class _PeriodChip extends StatelessWidget {
  const _PeriodChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final accent = theme.colorTheme.primary.primary1;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? accent : theme.colorTheme.paper.primary,
        shape: StadiumBorder(
          side: BorderSide(
              color: selected ? accent : theme.colorTheme.generic.inputBorder,
              width: 2),
        ),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(
                horizontal: spacer6, vertical: spacer3),
            child: Text(
              label,
              style: textTheme.headingS.copyWith(
                color: selected
                    ? theme.colorTheme.paper.primary
                    : theme.colorTheme.text.primary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ScheduleCard extends StatelessWidget {
  const _ScheduleCard({super.key, required this.entry, required this.text});

  final AmcScheduleEntry entry;
  final String Function(String key, [Map<String, Object> values]) text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final accent = theme.colorTheme.primary.primary1;

    Widget field(String label, String value) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: textTheme.bodyS
                    .copyWith(color: theme.colorTheme.text.secondary)),
            const SizedBox(height: spacer1),
            Text(value.isEmpty ? '---' : value,
                style: textTheme.headingS
                    .copyWith(color: theme.colorTheme.text.primary)),
          ],
        );

    Widget pair(Widget left, Widget right) => Padding(
          padding: const EdgeInsets.only(top: spacer3),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: left),
              const SizedBox(width: spacer4),
              Expanded(child: right),
            ],
          ),
        );

    return DigitCard(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    entry.endUserName.isEmpty ? '---' : entry.endUserName,
                    style: textTheme.headingM
                        .copyWith(color: theme.colorTheme.primary.primary2),
                  ),
                ),
                const SizedBox(width: spacer2),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: spacer3, vertical: spacer1),
                  decoration: BoxDecoration(
                    color: accent.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(spacer6),
                  ),
                  child: Text(
                    text(i18.amcSchedule.due, {
                      'date': DateFormat('d MMM').format(entry.scheduledDate)
                    }),
                    style: textTheme.headingXS.copyWith(color: accent),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(top: spacer3),
              child: field(text(i18.amcSchedule.phone), entry.phone),
            ),
            pair(field(text(i18.amcCommon.state), entry.state),
                field(text(i18.amcCommon.district), entry.district)),
            pair(
              field(text(i18.amcCommon.block), entry.block),
              field(text(i18.amcSchedule.scheduledDate),
                  DateFormat('d MMM yyyy').format(entry.scheduledDate)),
            ),
          ],
        ),
      ],
    );
  }
}
