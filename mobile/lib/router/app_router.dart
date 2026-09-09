import 'package:auto_route/auto_route.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../model/solar_installation_draft.dart';
import '../pages/asset_flow_pages.dart';
import '../pages/authenticated.dart';
import '../pages/data_save_success.dart';
import '../pages/digit_scanner_page.dart';
import '../pages/home_page.dart';
import '../pages/installation_report_home_page.dart';
import '../pages/installation_report_list_pages.dart';
import '../pages/login_page.dart';
import '../pages/machine_form.dart';
import '../pages/machine_report_success_page.dart';
import '../pages/media_viewer.dart';
import '../pages/dynamic_bom_form.dart';
import '../pages/overall_asset_summary.dart';
import '../pages/submitted_save_success.dart';
import '../pages/sync_loading.dart';
import '../pages/unauthenticated.dart';
import '../pages/welcome_page.dart';
import '../widgets/machine_media_picker.dart';
import 'routes.dart';

export 'package:auto_route/auto_route.dart';

part 'app_router.gr.dart';

@AutoRouterConfig(modules: [])
class AppRouter extends _$AppRouter {
  @override
  RouteType get defaultRouteType => const RouteType.material();

  @override
  List<AutoRoute> get routes => [
        AutoRoute(
          page: UnauthenticatedRouteWrapper.page,
          path: '/',
          initial: true,
          children: [
            AutoRoute(
              page: WelcomeRoute.page,
              path: Routes.welcome,
              initial: true,
            ),
            AutoRoute(page: LoginRoute.page, path: Routes.login),
          ],
        ),
        AutoRoute(
          page: AuthenticatedRouteWrapper.page,
          path: '/app',
          children: [
            AutoRoute(
              page: HomeRoute.page,
              path: Routes.home,
              initial: true,
            ),
            AutoRoute(
              page: InstallationReportHomeRoute.page,
              path: Routes.installationReport,
            ),
            AutoRoute(
                page: NewReportFacilitiesRoute.page, path: Routes.newReports),
            AutoRoute(
                page: PendingApprovalRoute.page, path: Routes.pendingApproval),
            AutoRoute(
                page: ResubmissionNeededRoute.page,
                path: Routes.resubmissionNeeded),
            AutoRoute(
                page: ApprovedReportsRoute.page, path: Routes.approvedReports),
            AutoRoute(page: MachineFormRoute.page, path: Routes.machineForm),
            AutoRoute(
                page: MachineReportSuccessRoute.page,
                path: Routes.machineReportSuccess),
            AutoRoute(page: AssetCountRoute.page, path: Routes.assetCount),
            AutoRoute(
                page: SelectAssetTypeRoute.page, path: Routes.selectAssetType),
            AutoRoute(
                page: SpecificationRoute.page, path: Routes.specification),
            AutoRoute(
                page: AssetTypeDetailRoute.page, path: Routes.assetTypeDetail),
            AutoRoute(page: AddNewAssetRoute.page, path: Routes.addNewAsset),
            AutoRoute(page: MediaUploadRoute.page, path: Routes.mediaUpload),
            AutoRoute(page: AssetSummaryRoute.page, path: Routes.assetSummary),
            AutoRoute(
                page: DataSaveSuccessRoute.page, path: Routes.dataSaveSuccess),
            AutoRoute(
                page: OverallAssetSummaryRoute.page,
                path: Routes.overallAssetSummary),
            AutoRoute(
                page: InstallationImagesRoute.page,
                path: Routes.installationImages),
            AutoRoute(
                page: SubmittedSaveSuccessRoute.page,
                path: Routes.submittedSaveSuccess),
            AutoRoute(page: DigitScannerRoute.page, path: Routes.scanner),
            AutoRoute(
                page: DynamicBomFormRoute.page, path: Routes.dynamicBomForm),
            AutoRoute(page: ImageViewerRoute.page, path: Routes.imageViewer),
            AutoRoute(page: VideoViewerRoute.page, path: Routes.videoViewer),
            AutoRoute(page: PdfViewerRoute.page, path: Routes.pdfViewer),
            AutoRoute(page: SyncLoadingRoute.page, path: Routes.syncLoading),
          ],
        ),
      ];
}
