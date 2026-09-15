import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/theme/ComponentTheme/digit_tab_bar_theme.dart';
import 'package:digit_ui_components/widgets/atoms/digit_tab.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../blocs/activity_facility/activity_facility.dart';
import '../blocs/activity_facility_counts/activity_facility_counts.dart';
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
import '../repositories/pending_submission_repository.dart';

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
        child: const _PendingApprovalWorkspace(),
      );
}

class _PendingApprovalWorkspace extends StatefulWidget {
  const _PendingApprovalWorkspace();

  @override
  State<_PendingApprovalWorkspace> createState() =>
      _PendingApprovalWorkspaceState();
}

class _PendingApprovalWorkspaceState extends State<_PendingApprovalWorkspace> {
  int _selectedTab = 0;
  String _query = '';
  List<PendingSubmissionRecord> _local = const [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refresh();
    });
  }

  Future<void> _refresh() async {
    final local = await pendingSubmissionRepository.readAll();
    if (!mounted) return;
    setState(() => _local = local);
    context.read<ActivityFacilityBloc>().add(
          ActivityFacilityEvent.fetchActivityFacilityByWorkflow(
            workflowStatuses:
                FacilityReportMode.pendingApproval.workflowStatuses,
          ),
        );
    _refreshCounts();
  }

  void _refreshCounts() {
    try {
      context
          .read<ActivityFacilityCountsBloc>()
          .add(const ActivityFacilityCountsEvent.fetch(forceRefresh: true));
    } catch (_) {
      // Standalone widget hosts may omit the app-level count provider.
    }
  }

  List<PendingSubmissionRecord> _recordsFor(PendingSubmissionState state) {
    final query = _query.trim().toLowerCase();
    final records = _local.where((record) {
      if (record.state != state) return false;
      if (query.isEmpty) return true;
      return record.workflow.facilityTitle.toLowerCase().contains(query);
    }).toList();
    if (state == PendingSubmissionState.pendingApproval) {
      records.sort((a, b) {
        if (a.canSync != b.canSync) return a.canSync ? -1 : 1;
        return b.updatedAt.compareTo(a.updatedAt);
      });
    }
    return records;
  }

  Future<void> _openLocal(PendingSubmissionRecord record) async {
    final readOnly = record.submissionCompleted;
    if (record.componentType == 'MACHINE') {
      await context.router.push(MachineFormRoute(
        workflow: record.workflow,
        readOnly: readOnly,
      ));
    } else {
      final mode = SolarWorkflowMode.values.firstWhere(
        (value) => value.name == record.workflowMode,
        orElse: () => SolarWorkflowMode.newReport,
      );
      final draft = await installationDraftRepository.loadSolar(
        record.workflow,
        readOnly ? SolarWorkflowMode.pending : mode,
      );
      if (!mounted) return;
      await context.router.push(OverallAssetSummaryRoute(draft: draft));
    }
    await _refresh();
  }

  void _openServer(ActivityFacilityWorkflow workflow) {
    if (workflow.resolvedAssetCategory == FacilityAssetCategory.machine) {
      context.router.push(MachineFormRoute(workflow: workflow, readOnly: true));
    } else {
      context.router.push(OverallAssetSummaryRoute(
        draft: installationDraftRepository.createSolar(
          workflow,
          SolarWorkflowMode.pending,
        ),
      ));
    }
  }

  void _onSearch(String query) {
    setState(() => _query = query);
    if (_selectedTab != 1) return;
    context.read<ActivityFacilityBloc>().add(
          query.trim().length >= minFacilitySearchQueryLength
              ? ActivityFacilityEvent.fetchActivityFacilityBySearch(
                  query: query,
                  workflowStatuses:
                      FacilityReportMode.pendingApproval.workflowStatuses,
                )
              : ActivityFacilityEvent.clearSearch(
                  workflowStatuses:
                      FacilityReportMode.pendingApproval.workflowStatuses,
                ),
        );
  }

  void _startSync() async {
    await context.router.push(const SyncLoadingRoute());
    await _refresh();
    if (mounted) setState(() => _selectedTab = 1);
  }

  bool _onScroll(ScrollNotification notification) {
    if (_selectedTab == 1 &&
        notification.metrics.pixels >=
            notification.metrics.maxScrollExtent - _loadMoreScrollThreshold) {
      context.read<ActivityFacilityBloc>().add(
            ActivityFacilityEvent.loadMoreActivityFacility(
              workflowStatuses:
                  FacilityReportMode.pendingApproval.workflowStatuses,
            ),
          );
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final pendingOtp = _recordsFor(PendingSubmissionState.pendingOtpApproval);
    final localPending = _recordsFor(PendingSubmissionState.pendingApproval);
    final canSync = localPending.any((record) => record.canSync);

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: spacer2),
        child: NotificationListener<ScrollNotification>(
          onNotification: _onScroll,
          child: ScrollableContent(
            key: const ValueKey('pending-approval-workspace'),
            backgroundColor: theme.colorTheme.generic.background,
            header: ReportNavigationHeader(
              onBackPressed: () => context.router.maybePop(),
            ),
            footer: _selectedTab == 1
                ? Padding(
                    padding: const EdgeInsets.all(spacer2),
                    child: DigitButton(
                      key: const ValueKey('sync-pending-submissions-button'),
                      mainAxisSize: MainAxisSize.max,
                      label: context.translate(
                        i18.installationReportHome.sync,
                      ),
                      onPressed: _startSync,
                      isDisabled: !canSync,
                      type: DigitButtonType.primary,
                      size: DigitButtonSize.large,
                    ),
                  )
                : const PoweredByDigit(version: ''),
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: spacer2, vertical: spacer4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.translate(i18.home.pendingApproval),
                      style: textTheme.headingXl.copyWith(
                        color: theme.colorTheme.primary.primary2,
                      ),
                    ),
                    const SizedBox(height: spacer4),
                    DigitTabBar(
                      tabs: [
                        context.translate(
                            i18.installationReportHome.pendingOtpApproval),
                        context.translate(
                            i18.installationReportHome.pendingApprovalTab),
                      ],
                      initialIndex: _selectedTab,
                      onTabSelected: (index) => setState(() {
                        _selectedTab = index;
                        _query = '';
                      }),
                      tabBarThemeData:
                          DigitTabBarThemeData.defaultTheme(context).copyWith(
                        tabWidth:
                            (MediaQuery.sizeOf(context).width - spacer2 * 6) /
                                2,
                        padding: EdgeInsets.zero,
                      ),
                    ),
                    const SizedBox(height: spacer4),
                    FacilitySearchSortCard(
                      onSearchChanged: _onSearch,
                      onSortApplied: (direction) {
                        if (_selectedTab == 1) {
                          context.read<ActivityFacilityBloc>().add(
                                ActivityFacilityEvent
                                    .fetchActivityFacilitySorted(
                                  workflowStatuses: FacilityReportMode
                                      .pendingApproval.workflowStatuses,
                                  sortDirection: direction,
                                ),
                              );
                        }
                      },
                    ),
                    const SizedBox(height: spacer4),
                    if (_selectedTab == 0)
                      _PendingRecordList(
                        records: pendingOtp,
                        status: context.translate(
                            i18.installationReportHome.pendingOtpApproval),
                        onOpen: _openLocal,
                      )
                    else
                      BlocConsumer<ActivityFacilityBloc, ActivityFacilityState>(
                        listener: (context, state) {
                          state.whenOrNull(paginatedLoaded: (
                            items,
                            _,
                            __,
                            ___,
                            ____,
                          ) {
                            final ids = items
                                .map((item) => item.activityFacility.id)
                                .whereType<String>();
                            pendingSubmissionRepository
                                .removeConfirmed(ids)
                                .then((_) =>
                                    pendingSubmissionRepository.readAll())
                                .then((records) {
                              if (mounted) setState(() => _local = records);
                            });
                          });
                        },
                        builder: (context, state) {
                          final server = state.maybeWhen(
                            paginatedLoaded: (items, _, __, ___, ____) => items,
                            orElse: () => const <ActivityFacilityWorkflow>[],
                          );
                          final serverIds = server
                              .map((item) => item.activityFacility.id)
                              .whereType<String>()
                              .toSet();
                          final visibleLocal = localPending
                              .where((record) => !serverIds
                                  .contains(record.activityFacilityId))
                              .toList();
                          if (visibleLocal.isEmpty && server.isEmpty) {
                            final isLoading = state.maybeWhen(
                              loading: () => true,
                              searchLoading: () => true,
                              orElse: () => false,
                            );
                            if (isLoading) {
                              return const _FacilityListLoading();
                            }
                            return const _EmptyPendingList();
                          }
                          return Column(children: [
                            for (final record in visibleLocal) ...[
                              FacilityReportCard(
                                workflow: record.workflow,
                                mode: FacilityReportMode.pendingApproval,
                                statusLabel:
                                    context.translate(i18.home.pendingApproval),
                                actionLabel: record.submissionCompleted
                                    ? context.translate(
                                        i18.installationReportHome.viewSummary)
                                    : context.translate(i18
                                        .installationReportHome
                                        .resumeInstallationReport),
                                onAction: () => _openLocal(record),
                              ),
                              const SizedBox(height: spacer5),
                            ],
                            for (final workflow in server) ...[
                              FacilityReportCard(
                                workflow: workflow,
                                mode: FacilityReportMode.pendingApproval,
                                onAction: () => _openServer(workflow),
                              ),
                              const SizedBox(height: spacer5),
                            ],
                          ]);
                        },
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

class _PendingRecordList extends StatelessWidget {
  const _PendingRecordList({
    required this.records,
    required this.status,
    required this.onOpen,
  });

  final List<PendingSubmissionRecord> records;
  final String status;
  final Future<void> Function(PendingSubmissionRecord) onOpen;

  @override
  Widget build(BuildContext context) {
    if (records.isEmpty) {
      return const _EmptyPendingList();
    }
    return Column(children: [
      for (final record in records) ...[
        FacilityReportCard(
          workflow: record.workflow,
          mode: FacilityReportMode.pendingApproval,
          statusLabel: status,
          actionLabel: context
              .translate(i18.installationReportHome.resumeInstallationReport),
          onAction: () => onOpen(record),
        ),
        const SizedBox(height: spacer5),
      ],
    ]);
  }
}

class _EmptyPendingList extends StatelessWidget {
  const _EmptyPendingList();

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: spacer8),
        child: Center(
          child: Text(
            context.translate(i18.installationReportHome.noDraftsToDisplay),
            style: Theme.of(context).digitTextTheme(context).bodyL,
          ),
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
