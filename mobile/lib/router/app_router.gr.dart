// GENERATED CODE - DO NOT MODIFY BY HAND

// **************************************************************************
// AutoRouterGenerator
// **************************************************************************

// ignore_for_file: type=lint
// coverage:ignore-file

part of 'app_router.dart';

abstract class _$AppRouter extends RootStackRouter {
  // ignore: unused_element
  _$AppRouter({super.navigatorKey});

  @override
  final Map<String, PageFactory> pagesMap = {
    AddNewAssetRoute.name: (routeData) {
      final args = routeData.argsAs<AddNewAssetRouteArgs>();
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: AddNewAssetPage(
          key: args.key,
          draft: args.draft,
          assetType: args.assetType,
          pickMedia: args.pickMedia,
          scanSerial: args.scanSerial,
        ),
      );
    },
    ApprovedReportsRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const ApprovedReportsPage(),
      );
    },
    AssetCountRoute.name: (routeData) {
      final args = routeData.argsAs<AssetCountRouteArgs>();
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: AssetCountPage(
          key: args.key,
          sample: args.sample,
          draft: args.draft,
          pickMedia: args.pickMedia,
          scanSerial: args.scanSerial,
        ),
      );
    },
    AssetSummaryRoute.name: (routeData) {
      final args = routeData.argsAs<AssetSummaryRouteArgs>();
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: AssetSummaryPage(
          key: args.key,
          draft: args.draft,
          assetType: args.assetType,
          pickMedia: args.pickMedia,
          readOnly: args.readOnly,
        ),
      );
    },
    AssetTypeDetailRoute.name: (routeData) {
      final args = routeData.argsAs<AssetTypeDetailRouteArgs>();
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: AssetTypeDetailPage(
          key: args.key,
          draft: args.draft,
          assetType: args.assetType,
          pickMedia: args.pickMedia,
          scanSerial: args.scanSerial,
        ),
      );
    },
    AuthenticatedRouteWrapper.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const AuthenticatedScreenWrapper(),
      );
    },
    DataSaveSuccessRoute.name: (routeData) {
      final args = routeData.argsAs<DataSaveSuccessRouteArgs>();
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: DataSaveSuccessPage(
          key: args.key,
          draft: args.draft,
          pickMedia: args.pickMedia,
        ),
      );
    },
    DigitScannerRoute.name: (routeData) {
      final args = routeData.argsAs<DigitScannerRouteArgs>(
          orElse: () => const DigitScannerRouteArgs());
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: DigitScannerPage(
          key: args.key,
          quantity: args.quantity,
          isGS1code: args.isGS1code,
          singleValue: args.singleValue,
          galleryPicker: args.galleryPicker,
        ),
      );
    },
    HomeRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const HomePage(),
      );
    },
    InstallationImagesRoute.name: (routeData) {
      final args = routeData.argsAs<InstallationImagesRouteArgs>();
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: InstallationImagesPage(
          key: args.key,
          draft: args.draft,
          readOnly: args.readOnly,
          pickMedia: args.pickMedia,
        ),
      );
    },
    InstallationReportHomeRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const InstallationReportHomePage(),
      );
    },
    LoginRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const LoginPage(),
      );
    },
    MachineFormRoute.name: (routeData) {
      final args = routeData.argsAs<MachineFormRouteArgs>();
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: MachineFormPage(
          key: args.key,
          sample: args.sample,
          pickMedia: args.pickMedia,
        ),
      );
    },
    MachineReportSuccessRoute.name: (routeData) {
      final args = routeData.argsAs<MachineReportSuccessRouteArgs>();
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: MachineReportSuccessPage(
          key: args.key,
          mode: args.mode,
        ),
      );
    },
    MediaUploadRoute.name: (routeData) {
      final args = routeData.argsAs<MediaUploadRouteArgs>();
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: MediaUploadPage(
          key: args.key,
          draft: args.draft,
          assetType: args.assetType,
          pickMedia: args.pickMedia,
        ),
      );
    },
    NewReportFacilitiesRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const NewReportFacilitiesPage(),
      );
    },
    OverallAssetSummaryRoute.name: (routeData) {
      final args = routeData.argsAs<OverallAssetSummaryRouteArgs>();
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: OverallAssetSummaryPage(
          key: args.key,
          draft: args.draft,
          pickMedia: args.pickMedia,
          pickFiles: args.pickFiles,
        ),
      );
    },
    PendingApprovalRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const PendingApprovalPage(),
      );
    },
    ResubmissionNeededRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const ResubmissionNeededPage(),
      );
    },
    SelectAssetTypeRoute.name: (routeData) {
      final args = routeData.argsAs<SelectAssetTypeRouteArgs>();
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: SelectAssetTypePage(
          key: args.key,
          draft: args.draft,
          pickMedia: args.pickMedia,
          scanSerial: args.scanSerial,
        ),
      );
    },
    SpecificationRoute.name: (routeData) {
      final args = routeData.argsAs<SpecificationRouteArgs>();
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: SpecificationPage(
          key: args.key,
          draft: args.draft,
          assetType: args.assetType,
          pickMedia: args.pickMedia,
          scanSerial: args.scanSerial,
        ),
      );
    },
    SubmittedSaveSuccessRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const SubmittedSaveSuccessPage(),
      );
    },
    UnauthenticatedRouteWrapper.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const UnauthenticatedScreenWrapper(),
      );
    },
    WelcomeRoute.name: (routeData) {
      return AutoRoutePage<dynamic>(
        routeData: routeData,
        child: const WelcomePage(),
      );
    },
  };
}

/// generated route for
/// [AddNewAssetPage]
class AddNewAssetRoute extends PageRouteInfo<AddNewAssetRouteArgs> {
  AddNewAssetRoute({
    Key? key,
    required SolarInstallationDraft draft,
    required SolarAssetType assetType,
    Future<XFile?> Function(
      SolarFileKind,
      ImageSource,
    )? pickMedia,
    Future<String?> Function(BuildContext)? scanSerial,
    List<PageRouteInfo>? children,
  }) : super(
          AddNewAssetRoute.name,
          args: AddNewAssetRouteArgs(
            key: key,
            draft: draft,
            assetType: assetType,
            pickMedia: pickMedia,
            scanSerial: scanSerial,
          ),
          initialChildren: children,
        );

  static const String name = 'AddNewAssetRoute';

  static const PageInfo<AddNewAssetRouteArgs> page =
      PageInfo<AddNewAssetRouteArgs>(name);
}

class AddNewAssetRouteArgs {
  const AddNewAssetRouteArgs({
    this.key,
    required this.draft,
    required this.assetType,
    this.pickMedia,
    this.scanSerial,
  });

  final Key? key;

  final SolarInstallationDraft draft;

  final SolarAssetType assetType;

  final Future<XFile?> Function(
    SolarFileKind,
    ImageSource,
  )? pickMedia;

  final Future<String?> Function(BuildContext)? scanSerial;

  @override
  String toString() {
    return 'AddNewAssetRouteArgs{key: $key, draft: $draft, assetType: $assetType, pickMedia: $pickMedia, scanSerial: $scanSerial}';
  }
}

/// generated route for
/// [ApprovedReportsPage]
class ApprovedReportsRoute extends PageRouteInfo<void> {
  const ApprovedReportsRoute({List<PageRouteInfo>? children})
      : super(
          ApprovedReportsRoute.name,
          initialChildren: children,
        );

  static const String name = 'ApprovedReportsRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [AssetCountPage]
class AssetCountRoute extends PageRouteInfo<AssetCountRouteArgs> {
  AssetCountRoute({
    Key? key,
    required FacilityReportSample sample,
    SolarInstallationDraft? draft,
    Future<XFile?> Function(
      SolarFileKind,
      ImageSource,
    )? pickMedia,
    Future<String?> Function(BuildContext)? scanSerial,
    List<PageRouteInfo>? children,
  }) : super(
          AssetCountRoute.name,
          args: AssetCountRouteArgs(
            key: key,
            sample: sample,
            draft: draft,
            pickMedia: pickMedia,
            scanSerial: scanSerial,
          ),
          initialChildren: children,
        );

  static const String name = 'AssetCountRoute';

  static const PageInfo<AssetCountRouteArgs> page =
      PageInfo<AssetCountRouteArgs>(name);
}

class AssetCountRouteArgs {
  const AssetCountRouteArgs({
    this.key,
    required this.sample,
    this.draft,
    this.pickMedia,
    this.scanSerial,
  });

  final Key? key;

  final FacilityReportSample sample;

  final SolarInstallationDraft? draft;

  final Future<XFile?> Function(
    SolarFileKind,
    ImageSource,
  )? pickMedia;

  final Future<String?> Function(BuildContext)? scanSerial;

  @override
  String toString() {
    return 'AssetCountRouteArgs{key: $key, sample: $sample, draft: $draft, pickMedia: $pickMedia, scanSerial: $scanSerial}';
  }
}

/// generated route for
/// [AssetSummaryPage]
class AssetSummaryRoute extends PageRouteInfo<AssetSummaryRouteArgs> {
  AssetSummaryRoute({
    Key? key,
    required SolarInstallationDraft draft,
    required SolarAssetType assetType,
    Future<XFile?> Function(
      SolarFileKind,
      ImageSource,
    )? pickMedia,
    bool readOnly = false,
    List<PageRouteInfo>? children,
  }) : super(
          AssetSummaryRoute.name,
          args: AssetSummaryRouteArgs(
            key: key,
            draft: draft,
            assetType: assetType,
            pickMedia: pickMedia,
            readOnly: readOnly,
          ),
          initialChildren: children,
        );

  static const String name = 'AssetSummaryRoute';

  static const PageInfo<AssetSummaryRouteArgs> page =
      PageInfo<AssetSummaryRouteArgs>(name);
}

class AssetSummaryRouteArgs {
  const AssetSummaryRouteArgs({
    this.key,
    required this.draft,
    required this.assetType,
    this.pickMedia,
    this.readOnly = false,
  });

  final Key? key;

  final SolarInstallationDraft draft;

  final SolarAssetType assetType;

  final Future<XFile?> Function(
    SolarFileKind,
    ImageSource,
  )? pickMedia;

  final bool readOnly;

  @override
  String toString() {
    return 'AssetSummaryRouteArgs{key: $key, draft: $draft, assetType: $assetType, pickMedia: $pickMedia, readOnly: $readOnly}';
  }
}

/// generated route for
/// [AssetTypeDetailPage]
class AssetTypeDetailRoute extends PageRouteInfo<AssetTypeDetailRouteArgs> {
  AssetTypeDetailRoute({
    Key? key,
    required SolarInstallationDraft draft,
    required SolarAssetType assetType,
    Future<XFile?> Function(
      SolarFileKind,
      ImageSource,
    )? pickMedia,
    Future<String?> Function(BuildContext)? scanSerial,
    List<PageRouteInfo>? children,
  }) : super(
          AssetTypeDetailRoute.name,
          args: AssetTypeDetailRouteArgs(
            key: key,
            draft: draft,
            assetType: assetType,
            pickMedia: pickMedia,
            scanSerial: scanSerial,
          ),
          initialChildren: children,
        );

  static const String name = 'AssetTypeDetailRoute';

  static const PageInfo<AssetTypeDetailRouteArgs> page =
      PageInfo<AssetTypeDetailRouteArgs>(name);
}

class AssetTypeDetailRouteArgs {
  const AssetTypeDetailRouteArgs({
    this.key,
    required this.draft,
    required this.assetType,
    this.pickMedia,
    this.scanSerial,
  });

  final Key? key;

  final SolarInstallationDraft draft;

  final SolarAssetType assetType;

  final Future<XFile?> Function(
    SolarFileKind,
    ImageSource,
  )? pickMedia;

  final Future<String?> Function(BuildContext)? scanSerial;

  @override
  String toString() {
    return 'AssetTypeDetailRouteArgs{key: $key, draft: $draft, assetType: $assetType, pickMedia: $pickMedia, scanSerial: $scanSerial}';
  }
}

/// generated route for
/// [AuthenticatedScreenWrapper]
class AuthenticatedRouteWrapper extends PageRouteInfo<void> {
  const AuthenticatedRouteWrapper({List<PageRouteInfo>? children})
      : super(
          AuthenticatedRouteWrapper.name,
          initialChildren: children,
        );

  static const String name = 'AuthenticatedRouteWrapper';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [DataSaveSuccessPage]
class DataSaveSuccessRoute extends PageRouteInfo<DataSaveSuccessRouteArgs> {
  DataSaveSuccessRoute({
    Key? key,
    required SolarInstallationDraft draft,
    Future<XFile?> Function(
      SolarFileKind,
      ImageSource,
    )? pickMedia,
    List<PageRouteInfo>? children,
  }) : super(
          DataSaveSuccessRoute.name,
          args: DataSaveSuccessRouteArgs(
            key: key,
            draft: draft,
            pickMedia: pickMedia,
          ),
          initialChildren: children,
        );

  static const String name = 'DataSaveSuccessRoute';

  static const PageInfo<DataSaveSuccessRouteArgs> page =
      PageInfo<DataSaveSuccessRouteArgs>(name);
}

class DataSaveSuccessRouteArgs {
  const DataSaveSuccessRouteArgs({
    this.key,
    required this.draft,
    this.pickMedia,
  });

  final Key? key;

  final SolarInstallationDraft draft;

  final Future<XFile?> Function(
    SolarFileKind,
    ImageSource,
  )? pickMedia;

  @override
  String toString() {
    return 'DataSaveSuccessRouteArgs{key: $key, draft: $draft, pickMedia: $pickMedia}';
  }
}

/// generated route for
/// [DigitScannerPage]
class DigitScannerRoute extends PageRouteInfo<DigitScannerRouteArgs> {
  DigitScannerRoute({
    Key? key,
    int quantity = 10,
    bool isGS1code = false,
    bool singleValue = true,
    Future<XFile?> Function()? galleryPicker,
    List<PageRouteInfo>? children,
  }) : super(
          DigitScannerRoute.name,
          args: DigitScannerRouteArgs(
            key: key,
            quantity: quantity,
            isGS1code: isGS1code,
            singleValue: singleValue,
            galleryPicker: galleryPicker,
          ),
          initialChildren: children,
        );

  static const String name = 'DigitScannerRoute';

  static const PageInfo<DigitScannerRouteArgs> page =
      PageInfo<DigitScannerRouteArgs>(name);
}

class DigitScannerRouteArgs {
  const DigitScannerRouteArgs({
    this.key,
    this.quantity = 10,
    this.isGS1code = false,
    this.singleValue = true,
    this.galleryPicker,
  });

  final Key? key;

  final int quantity;

  final bool isGS1code;

  final bool singleValue;

  final Future<XFile?> Function()? galleryPicker;

  @override
  String toString() {
    return 'DigitScannerRouteArgs{key: $key, quantity: $quantity, isGS1code: $isGS1code, singleValue: $singleValue, galleryPicker: $galleryPicker}';
  }
}

/// generated route for
/// [HomePage]
class HomeRoute extends PageRouteInfo<void> {
  const HomeRoute({List<PageRouteInfo>? children})
      : super(
          HomeRoute.name,
          initialChildren: children,
        );

  static const String name = 'HomeRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [InstallationImagesPage]
class InstallationImagesRoute
    extends PageRouteInfo<InstallationImagesRouteArgs> {
  InstallationImagesRoute({
    Key? key,
    required SolarInstallationDraft draft,
    required bool readOnly,
    Future<XFile?> Function(
      SolarFileKind,
      ImageSource,
    )? pickMedia,
    List<PageRouteInfo>? children,
  }) : super(
          InstallationImagesRoute.name,
          args: InstallationImagesRouteArgs(
            key: key,
            draft: draft,
            readOnly: readOnly,
            pickMedia: pickMedia,
          ),
          initialChildren: children,
        );

  static const String name = 'InstallationImagesRoute';

  static const PageInfo<InstallationImagesRouteArgs> page =
      PageInfo<InstallationImagesRouteArgs>(name);
}

class InstallationImagesRouteArgs {
  const InstallationImagesRouteArgs({
    this.key,
    required this.draft,
    required this.readOnly,
    this.pickMedia,
  });

  final Key? key;

  final SolarInstallationDraft draft;

  final bool readOnly;

  final Future<XFile?> Function(
    SolarFileKind,
    ImageSource,
  )? pickMedia;

  @override
  String toString() {
    return 'InstallationImagesRouteArgs{key: $key, draft: $draft, readOnly: $readOnly, pickMedia: $pickMedia}';
  }
}

/// generated route for
/// [InstallationReportHomePage]
class InstallationReportHomeRoute extends PageRouteInfo<void> {
  const InstallationReportHomeRoute({List<PageRouteInfo>? children})
      : super(
          InstallationReportHomeRoute.name,
          initialChildren: children,
        );

  static const String name = 'InstallationReportHomeRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [LoginPage]
class LoginRoute extends PageRouteInfo<void> {
  const LoginRoute({List<PageRouteInfo>? children})
      : super(
          LoginRoute.name,
          initialChildren: children,
        );

  static const String name = 'LoginRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [MachineFormPage]
class MachineFormRoute extends PageRouteInfo<MachineFormRouteArgs> {
  MachineFormRoute({
    Key? key,
    required FacilityReportSample sample,
    Future<XFile?> Function(
      MachineMediaKind,
      ImageSource,
    )? pickMedia,
    List<PageRouteInfo>? children,
  }) : super(
          MachineFormRoute.name,
          args: MachineFormRouteArgs(
            key: key,
            sample: sample,
            pickMedia: pickMedia,
          ),
          initialChildren: children,
        );

  static const String name = 'MachineFormRoute';

  static const PageInfo<MachineFormRouteArgs> page =
      PageInfo<MachineFormRouteArgs>(name);
}

class MachineFormRouteArgs {
  const MachineFormRouteArgs({
    this.key,
    required this.sample,
    this.pickMedia,
  });

  final Key? key;

  final FacilityReportSample sample;

  final Future<XFile?> Function(
    MachineMediaKind,
    ImageSource,
  )? pickMedia;

  @override
  String toString() {
    return 'MachineFormRouteArgs{key: $key, sample: $sample, pickMedia: $pickMedia}';
  }
}

/// generated route for
/// [MachineReportSuccessPage]
class MachineReportSuccessRoute
    extends PageRouteInfo<MachineReportSuccessRouteArgs> {
  MachineReportSuccessRoute({
    Key? key,
    required MachineReportSuccessMode mode,
    List<PageRouteInfo>? children,
  }) : super(
          MachineReportSuccessRoute.name,
          args: MachineReportSuccessRouteArgs(
            key: key,
            mode: mode,
          ),
          initialChildren: children,
        );

  static const String name = 'MachineReportSuccessRoute';

  static const PageInfo<MachineReportSuccessRouteArgs> page =
      PageInfo<MachineReportSuccessRouteArgs>(name);
}

class MachineReportSuccessRouteArgs {
  const MachineReportSuccessRouteArgs({
    this.key,
    required this.mode,
  });

  final Key? key;

  final MachineReportSuccessMode mode;

  @override
  String toString() {
    return 'MachineReportSuccessRouteArgs{key: $key, mode: $mode}';
  }
}

/// generated route for
/// [MediaUploadPage]
class MediaUploadRoute extends PageRouteInfo<MediaUploadRouteArgs> {
  MediaUploadRoute({
    Key? key,
    required SolarInstallationDraft draft,
    required SolarAssetType assetType,
    Future<XFile?> Function(
      SolarFileKind,
      ImageSource,
    )? pickMedia,
    List<PageRouteInfo>? children,
  }) : super(
          MediaUploadRoute.name,
          args: MediaUploadRouteArgs(
            key: key,
            draft: draft,
            assetType: assetType,
            pickMedia: pickMedia,
          ),
          initialChildren: children,
        );

  static const String name = 'MediaUploadRoute';

  static const PageInfo<MediaUploadRouteArgs> page =
      PageInfo<MediaUploadRouteArgs>(name);
}

class MediaUploadRouteArgs {
  const MediaUploadRouteArgs({
    this.key,
    required this.draft,
    required this.assetType,
    this.pickMedia,
  });

  final Key? key;

  final SolarInstallationDraft draft;

  final SolarAssetType assetType;

  final Future<XFile?> Function(
    SolarFileKind,
    ImageSource,
  )? pickMedia;

  @override
  String toString() {
    return 'MediaUploadRouteArgs{key: $key, draft: $draft, assetType: $assetType, pickMedia: $pickMedia}';
  }
}

/// generated route for
/// [NewReportFacilitiesPage]
class NewReportFacilitiesRoute extends PageRouteInfo<void> {
  const NewReportFacilitiesRoute({List<PageRouteInfo>? children})
      : super(
          NewReportFacilitiesRoute.name,
          initialChildren: children,
        );

  static const String name = 'NewReportFacilitiesRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [OverallAssetSummaryPage]
class OverallAssetSummaryRoute
    extends PageRouteInfo<OverallAssetSummaryRouteArgs> {
  OverallAssetSummaryRoute({
    Key? key,
    required SolarInstallationDraft draft,
    Future<XFile?> Function(
      SolarFileKind,
      ImageSource,
    )? pickMedia,
    Future<List<PlatformFile>> Function()? pickFiles,
    List<PageRouteInfo>? children,
  }) : super(
          OverallAssetSummaryRoute.name,
          args: OverallAssetSummaryRouteArgs(
            key: key,
            draft: draft,
            pickMedia: pickMedia,
            pickFiles: pickFiles,
          ),
          initialChildren: children,
        );

  static const String name = 'OverallAssetSummaryRoute';

  static const PageInfo<OverallAssetSummaryRouteArgs> page =
      PageInfo<OverallAssetSummaryRouteArgs>(name);
}

class OverallAssetSummaryRouteArgs {
  const OverallAssetSummaryRouteArgs({
    this.key,
    required this.draft,
    this.pickMedia,
    this.pickFiles,
  });

  final Key? key;

  final SolarInstallationDraft draft;

  final Future<XFile?> Function(
    SolarFileKind,
    ImageSource,
  )? pickMedia;

  final Future<List<PlatformFile>> Function()? pickFiles;

  @override
  String toString() {
    return 'OverallAssetSummaryRouteArgs{key: $key, draft: $draft, pickMedia: $pickMedia, pickFiles: $pickFiles}';
  }
}

/// generated route for
/// [PendingApprovalPage]
class PendingApprovalRoute extends PageRouteInfo<void> {
  const PendingApprovalRoute({List<PageRouteInfo>? children})
      : super(
          PendingApprovalRoute.name,
          initialChildren: children,
        );

  static const String name = 'PendingApprovalRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [ResubmissionNeededPage]
class ResubmissionNeededRoute extends PageRouteInfo<void> {
  const ResubmissionNeededRoute({List<PageRouteInfo>? children})
      : super(
          ResubmissionNeededRoute.name,
          initialChildren: children,
        );

  static const String name = 'ResubmissionNeededRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [SelectAssetTypePage]
class SelectAssetTypeRoute extends PageRouteInfo<SelectAssetTypeRouteArgs> {
  SelectAssetTypeRoute({
    Key? key,
    required SolarInstallationDraft draft,
    Future<XFile?> Function(
      SolarFileKind,
      ImageSource,
    )? pickMedia,
    Future<String?> Function(BuildContext)? scanSerial,
    List<PageRouteInfo>? children,
  }) : super(
          SelectAssetTypeRoute.name,
          args: SelectAssetTypeRouteArgs(
            key: key,
            draft: draft,
            pickMedia: pickMedia,
            scanSerial: scanSerial,
          ),
          initialChildren: children,
        );

  static const String name = 'SelectAssetTypeRoute';

  static const PageInfo<SelectAssetTypeRouteArgs> page =
      PageInfo<SelectAssetTypeRouteArgs>(name);
}

class SelectAssetTypeRouteArgs {
  const SelectAssetTypeRouteArgs({
    this.key,
    required this.draft,
    this.pickMedia,
    this.scanSerial,
  });

  final Key? key;

  final SolarInstallationDraft draft;

  final Future<XFile?> Function(
    SolarFileKind,
    ImageSource,
  )? pickMedia;

  final Future<String?> Function(BuildContext)? scanSerial;

  @override
  String toString() {
    return 'SelectAssetTypeRouteArgs{key: $key, draft: $draft, pickMedia: $pickMedia, scanSerial: $scanSerial}';
  }
}

/// generated route for
/// [SpecificationPage]
class SpecificationRoute extends PageRouteInfo<SpecificationRouteArgs> {
  SpecificationRoute({
    Key? key,
    required SolarInstallationDraft draft,
    required SolarAssetType assetType,
    Future<XFile?> Function(
      SolarFileKind,
      ImageSource,
    )? pickMedia,
    Future<String?> Function(BuildContext)? scanSerial,
    List<PageRouteInfo>? children,
  }) : super(
          SpecificationRoute.name,
          args: SpecificationRouteArgs(
            key: key,
            draft: draft,
            assetType: assetType,
            pickMedia: pickMedia,
            scanSerial: scanSerial,
          ),
          initialChildren: children,
        );

  static const String name = 'SpecificationRoute';

  static const PageInfo<SpecificationRouteArgs> page =
      PageInfo<SpecificationRouteArgs>(name);
}

class SpecificationRouteArgs {
  const SpecificationRouteArgs({
    this.key,
    required this.draft,
    required this.assetType,
    this.pickMedia,
    this.scanSerial,
  });

  final Key? key;

  final SolarInstallationDraft draft;

  final SolarAssetType assetType;

  final Future<XFile?> Function(
    SolarFileKind,
    ImageSource,
  )? pickMedia;

  final Future<String?> Function(BuildContext)? scanSerial;

  @override
  String toString() {
    return 'SpecificationRouteArgs{key: $key, draft: $draft, assetType: $assetType, pickMedia: $pickMedia, scanSerial: $scanSerial}';
  }
}

/// generated route for
/// [SubmittedSaveSuccessPage]
class SubmittedSaveSuccessRoute extends PageRouteInfo<void> {
  const SubmittedSaveSuccessRoute({List<PageRouteInfo>? children})
      : super(
          SubmittedSaveSuccessRoute.name,
          initialChildren: children,
        );

  static const String name = 'SubmittedSaveSuccessRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [UnauthenticatedScreenWrapper]
class UnauthenticatedRouteWrapper extends PageRouteInfo<void> {
  const UnauthenticatedRouteWrapper({List<PageRouteInfo>? children})
      : super(
          UnauthenticatedRouteWrapper.name,
          initialChildren: children,
        );

  static const String name = 'UnauthenticatedRouteWrapper';

  static const PageInfo<void> page = PageInfo<void>(name);
}

/// generated route for
/// [WelcomePage]
class WelcomeRoute extends PageRouteInfo<void> {
  const WelcomeRoute({List<PageRouteInfo>? children})
      : super(
          WelcomeRoute.name,
          initialChildren: children,
        );

  static const String name = 'WelcomeRoute';

  static const PageInfo<void> page = PageInfo<void>(name);
}
