import 'dart:convert';

import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../blocs/selected_amc_origin/selected_amc_origin.dart';
import '../../blocs/selected_scheduled_visit/selected_scheduled_visit.dart';
import '../../model/amc/scheduled_visit.dart';
import '../../router/app_router.dart';
import '../../utils/amc/amc_utils.dart';
import '../../utils/extensions.dart';
import '../../utils/i18_key_constants.dart' as i18;
import '../../widgets/amc/amc_back_navigation_help_header.dart';
import '../../widgets/amc/rejection_reasons_list.dart';
import '../../widgets/footer_button.dart';

/// Ported from E4H `pages/amc_rejection_reasons.dart` (class name typo
/// "Rejction" kept from E4H): shows the reviewer's rejection reasons, read
/// from the latest workflow comment, then reopens the form to resubmit.
@RoutePage()
class AmcRejctionReasonsPage extends StatefulWidget {
  const AmcRejctionReasonsPage({super.key});

  @override
  State<AmcRejctionReasonsPage> createState() => _AmcRejctionReasonsPageState();
}

class _AmcRejctionReasonsPageState extends State<AmcRejctionReasonsPage> {
  ScheduledVisit? scheduledVisit;

  List<AmcComment> _extractRejectionComments(ScheduledVisit? visit) {
    if (visit == null || visit.processInstances.isEmpty) {
      return const <AmcComment>[];
    }

    final candidates = <String>[];

    void addFromRawJson(String? rawJson) {
      if (rawJson == null || rawJson.trim().isEmpty) return;
      try {
        final decoded = jsonDecode(rawJson);

        if (decoded is Map<String, dynamic>) {
          final commentField = decoded['comment'];
          if (commentField is String && commentField.trim().isNotEmpty) {
            candidates.add(commentField);
          }
          if (commentField is List) {
            candidates.add(jsonEncode(commentField));
          }
        }
      } catch (_) {}
    }

    addFromRawJson(visit.processInstances.first.rawJson);
    if (candidates.isEmpty) return const <AmcComment>[];
    final rawCommentJson = candidates.last;
    try {
      final decodedList = jsonDecode(rawCommentJson);

      if (decodedList is List) {
        return decodedList.whereType<Map<String, dynamic>>().map((m) {
          final reason = m['reason']?.toString();
          final detail = m['comment']?.toString();
          final jsonForComment = <String, dynamic>{};
          if (reason != null) jsonForComment['reason'] = reason;
          if (detail != null) jsonForComment['comment'] = detail;

          return AmcComment(commentMessage: jsonEncode(jsonForComment));
        }).toList();
      }
    } catch (_) {}
    return const <AmcComment>[];
  }

  @override
  void initState() {
    super.initState();

    context.read<SelectedScheduledVisitBloc>().state.whenOrNull(
        selected: (visit) {
      scheduledVisit = visit;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    return ScrollableContent(
      enableFixedDigitButton: true,
      backgroundColor: theme.colorTheme.generic.background,
      header: const BackNavigationHelpHeaderWidget(
        showBackNavigation: true,
        showHelp: false,
      ),
      footer: FooterButton(
        key: const ValueKey('amc-rejection-next'),
        isDisabled: false,
        showSuffixIcon: false,
        text: context.translate(i18.amcCommon.coreCommonNext),
        onPressed: () {
          context.read<SelectedAmcOriginBloc>().add(
              const SelectedAmcOriginEvent.select(
                  FormOrigin.submitForApproval));
          // #247: status questions first, then the report form.
          context.router.push(
            AmcSystemStatusRoute(
              scheduledVisit: scheduledVisit!,
              origin: FormOrigin.submitForApproval,
            ),
          );
        },
      ),
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(
              vertical: spacer2, horizontal: spacer2),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: spacer4),
              Padding(
                padding: const EdgeInsets.only(left: spacer1),
                child: Text(
                  'Rejection Reasons',
                  style: textTheme.headingXl
                      .copyWith(color: theme.colorTheme.primary.primary2),
                ),
              ),
              DigitCard(
                margin: const EdgeInsets.symmetric(vertical: spacer4),
                children: [
                  SizedBox(width: context.width),
                  RejectionReasonsList(
                    comments: _extractRejectionComments(scheduledVisit),
                    excludeStandardTypes: false,
                  ),
                ],
              ),
            ],
          ),
        )
      ],
    );
  }
}
