import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../blocs/activity_facility/activity_facility.dart';
import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../utils/workflow_status.dart';
import '../model/facility_report.dart';
import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../model/solar_installation_draft.dart';
import '../router/app_router.dart';
import '../widgets/facility_report_card.dart';
import '../widgets/facility_search_sort_card.dart';
import '../widgets/report_navigation_header.dart';
import '../repositories/installation_draft_repository.dart';

const double _loadMoreScrollThreshold = 200.0;

@RoutePage()
class NewReportFacilitiesPage extends StatelessWidget {
  const NewReportFacilitiesPage({super.key});

  @override
  Widget build(BuildContext context) => BlocProvider(
        create: (_) => ActivityFacilityBloc(),
        child: _FacilityListPage(
          title: context.translate(i18.installationReportHome.newReport),
          mode: FacilityReportMode.newReport,
          showSearch: true,
        ),
      );
}

@RoutePage()
class PendingApprovalPage extends StatelessWidget {
  const PendingApprovalPage({super.key});

  @override
  Widget build(BuildContext context) => BlocProvider(
        create: (_) => ActivityFacilityBloc(),
        child: _FacilityListPage(
          title: context.translate(i18.home.pendingApproval),
          mode: FacilityReportMode.pendingApproval,
          showSearch: false,
        ),
      );
}

@RoutePage()
class ResubmissionNeededPage extends StatelessWidget {
  const ResubmissionNeededPage({super.key});

  @override
  Widget build(BuildContext context) => BlocProvider(
        create: (_) => ActivityFacilityBloc(),
        child: _FacilityListPage(
          title: context.translate(
              i18.installationReportHome.resubmissionNeededSingleLine),
          mode: FacilityReportMode.resubmissionNeeded,
          showSearch: true,
        ),
      );
}

@RoutePage()
class ApprovedReportsPage extends StatelessWidget {
  const ApprovedReportsPage({super.key});

  @override
  Widget build(BuildContext context) => BlocProvider(
        create: (_) => ActivityFacilityBloc(),
        child: _FacilityListPage(
          title: context.translate(i18.home.approved),
          mode: FacilityReportMode.approved,
          showSearch: true,
        ),
      );
}

class _FacilityListPage extends StatefulWidget {
  const _FacilityListPage({
    required this.title,
    required this.mode,
    required this.showSearch,
  });

  final String title;
  final FacilityReportMode mode;
  final bool showSearch;

  @override
  State<_FacilityListPage> createState() => _FacilityListPageState();
}

class _FacilityListPageState extends State<_FacilityListPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<ActivityFacilityBloc>().add(
            ActivityFacilityEvent.fetchActivityFacilityByWorkflow(
              workflowStatuses: widget.mode.workflowStatuses,
            ),
          );
    });
  }

  void _handleFacilityAction(
      BuildContext context, ActivityFacilityWorkflow workflow) {
    final mode = widget.mode;
    final category = workflow.resolvedAssetCategory;

    if (category == FacilityAssetCategory.machine) {
      context.router.push(MachineFormRoute(
        workflow: workflow,
        readOnly: mode == FacilityReportMode.pendingApproval ||
            mode == FacilityReportMode.approved,
      ));
      return;
    }
    final solarMode = switch (mode) {
      FacilityReportMode.pendingApproval => SolarWorkflowMode.pending,
      FacilityReportMode.resubmissionNeeded => SolarWorkflowMode.resubmission,
      FacilityReportMode.approved => SolarWorkflowMode.approved,
      FacilityReportMode.newReport => SolarWorkflowMode.newReport,
    };
    context.router.push(OverallAssetSummaryRoute(
      draft: installationDraftRepository.createSolar(workflow, solarMode),
    ));
  }

  bool _onScrollNotification(ScrollNotification notification) {
    final metrics = notification.metrics;
    if (metrics.pixels >= metrics.maxScrollExtent - _loadMoreScrollThreshold) {
      context.read<ActivityFacilityBloc>().add(
            ActivityFacilityEvent.loadMoreActivityFacility(
              workflowStatuses: widget.mode.workflowStatuses,
            ),
          );
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final mode = widget.mode;

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: spacer2),
        child: NotificationListener<ScrollNotification>(
          onNotification: _onScrollNotification,
          child: ScrollableContent(
            key: ValueKey('facility-list-${mode.name}'),
            backgroundColor: theme.colorTheme.generic.background,
            header: ReportNavigationHeader(
              onBackPressed: () => context.router.maybePop(),
            ),
            footer: const PoweredByDigit(version: ''),
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: spacer2,
                  vertical: spacer4,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.title,
                      style: textTheme.headingXl.copyWith(
                        color: theme.colorTheme.primary.primary2,
                      ),
                    ),
                    const SizedBox(height: spacer4),
                    if (widget.showSearch) ...[
                      FacilitySearchSortCard(
                        onSearchChanged: (query) => context
                            .read<ActivityFacilityBloc>()
                            .add(
                              query.trim().isEmpty
                                  ? ActivityFacilityEvent.clearSearch(
                                      workflowStatuses: mode.workflowStatuses,
                                    )
                                  : ActivityFacilityEvent
                                      .fetchActivityFacilityBySearch(
                                      query: query,
                                      workflowStatuses: mode.workflowStatuses,
                                    ),
                            ),
                        onSortApplied: (direction) => context
                            .read<ActivityFacilityBloc>()
                            .add(
                              ActivityFacilityEvent.fetchActivityFacilitySorted(
                                workflowStatuses: mode.workflowStatuses,
                                sortDirection: direction,
                              ),
                            ),
                      ),
                      const SizedBox(height: spacer4),
                    ],
                    BlocBuilder<ActivityFacilityBloc, ActivityFacilityState>(
                      builder: (context, state) => state.maybeWhen(
                        loading: () => const _FacilityListLoading(),
                        searchLoading: () => const _FacilityListLoading(),
                        paginatedLoaded: (
                          items,
                          hasMore,
                          totalCount,
                          fromCache,
                          isLoadingMore,
                        ) {
                          if (items.isEmpty) {
                            return Padding(
                              padding: const EdgeInsets.symmetric(
                                vertical: spacer8,
                              ),
                              child: Center(
                                child: Text(
                                  context.translate(i18
                                      .installationReportHome.noReportsFound),
                                  style: textTheme.bodyL,
                                ),
                              ),
                            );
                          }
                          return Column(
                            children: [
                              for (final workflow in items) ...[
                                Builder(builder: (context) {
                                  return FacilityReportCard(
                                    workflow: workflow,
                                    mode: mode,
                                    onAction: () => _handleFacilityAction(
                                        context, workflow),
                                  );
                                }),
                                const SizedBox(height: spacer5),
                              ],
                              if (isLoadingMore) const _FacilityListLoading(),
                            ],
                          );
                        },
                        orElse: () => const SizedBox.shrink(),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FacilityListLoading extends StatelessWidget {
  const _FacilityListLoading();

  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.symmetric(vertical: spacer6),
        child: Center(child: CircularProgressIndicator()),
      );
}
