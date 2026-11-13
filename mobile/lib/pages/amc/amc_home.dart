import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/theme/digit_theme.dart';
import 'package:digit_ui_components/theme/spacers.dart';
import 'package:digit_ui_components/widgets/powered_by_digit.dart';
import 'package:digit_ui_components/widgets/scrollable_content.dart';
import 'package:flutter/material.dart';

import '../../repositories/amc/amc_form_schema_repo.dart';
import '../../router/app_router.dart';
import '../../utils/amc/amc_system_status_sync.dart';
import '../../utils/extensions.dart';
import '../../utils/i18_key_constants.dart' as i18;
import '../../widgets/amc/amc_back_navigation_help_header.dart';
import '../../widgets/amc/amc_mdms_gate.dart';
import '../../widgets/home_item_card.dart';

/// Ported from E4H `pages/amc_home.dart`: the AMC module's home. Loads the
/// AMC form schema from MDMS behind a blocking gate, then offers
/// "AMC Report" and "Data Sync".
@RoutePage()
class AmcHomePage extends StatefulWidget {
  const AmcHomePage({super.key});

  @override
  State<AmcHomePage> createState() => _AmcHomePageState();
}

class _AmcHomePageState extends State<AmcHomePage> {
  @override
  void initState() {
    super.initState();
    // #247: send any queued "system not functional" updates (e.g. after
    // logging in while already online).
    AmcSystemStatusSync.instance.flush();
  }

  Future<void> _prefetchAmcSchemas() =>
      AmcFormSchemaRepository().prefetchAmcSchemas(isCancelled: () => !mounted);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final screenWidth = context.width;

    final List<Map<String, dynamic>> homeItems = [
      {
        'key': 'amc-home-report',
        'icon': Icons.text_snippet_outlined,
        'label': context.translate(i18.amcHome.amcReport),
        'onPressed': () => context.router.push(const AmcReportHomeRoute())
      },
      {
        'key': 'amc-home-data-sync',
        'icon': Icons.autorenew,
        'label': context.translate(i18.amcHome.dataSync),
        'onPressed': () => context.router.push(const AmcDraftRoute()),
      },
    ];

    return AmcMdmsGate(
      load: _prefetchAmcSchemas,
      child: Scaffold(
        backgroundColor: DigitTheme.instance.colorScheme.surface,
        body: Padding(
          padding: const EdgeInsets.symmetric(horizontal: spacer2),
          child: ScrollableContent(
            backgroundColor: theme.colorTheme.generic.background,
            header: const BackNavigationHelpHeaderWidget(
              showBackNavigation: false,
              showHelp: true,
            ),
            footer: const PoweredByDigit(version: ''),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.only(top: spacer6),
                sliver: SliverGrid(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final item = homeItems[index];
                      return HomeItemCard(
                        key: ValueKey(item['key'] as String),
                        icon: item['icon'] as IconData,
                        label: item['label'] as String,
                        contentColor: theme.colorTheme.primary.primary1,
                        onPressed: item['onPressed'] as VoidCallback,
                      );
                    },
                    childCount: homeItems.length,
                  ),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: spacer4,
                    childAspectRatio:
                        (screenWidth / 2) / (170 * (screenWidth / 375)),
                  ),
                ),
              ),
            ],
            children: const [],
          ),
        ),
      ),
    );
  }
}
