import 'package:auto_route/auto_route.dart';
import 'package:digit_forms_engine/blocs/forms/forms.dart';
import 'package:digit_scanner/blocs/scanner.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../blocs/amc_otp/amc_otp.dart';
import '../blocs/cache_amc_media_upload/cache_amc_media_upload.dart';
import '../blocs/inbox_type/inbox_type.dart';
import '../blocs/report_type/report_type.dart';
import '../blocs/scheduled_visit/scheduled_visit.dart';
import '../blocs/scheduled_visit_submission/scheduled_visit_submission.dart';
import '../blocs/selected_amc_origin/selected_amc_origin.dart';
import '../blocs/selected_scheduled_visit/selected_scheduled_visit.dart';
import '../widgets/livelihood_app_bar.dart';
import '../widgets/navigation/drawer.dart';

@RoutePage()
class AuthenticatedScreenWrapper extends StatelessWidget {
  const AuthenticatedScreenWrapper({super.key});

  @override
  Widget build(BuildContext context) => MultiBlocProvider(
        providers: [
          BlocProvider<DigitScannerBloc>(
            create: (_) => DigitScannerBloc(const DigitScannerState()),
          ),
          BlocProvider<FormsBloc>(create: (_) => FormsBloc()),
          // AMC blocs (E4H provides these at its app root / authenticated
          // wrapper). Lazily created, so installation screens and widget
          // tests never construct them.
          BlocProvider<ReportTypeBloc>(create: (_) => ReportTypeBloc()),
          BlocProvider<InboxTypeBloc>(create: (_) => InboxTypeBloc()),
          BlocProvider<SelectedScheduledVisitBloc>(
            create: (_) => SelectedScheduledVisitBloc(),
          ),
          BlocProvider<SelectedAmcOriginBloc>(
            create: (_) => SelectedAmcOriginBloc(),
          ),
          BlocProvider<ScheduledVisitBloc>(create: (_) => ScheduledVisitBloc()),
          BlocProvider<ScheduleVisitSubmitBloc>(
            create: (_) => ScheduleVisitSubmitBloc(),
          ),
          BlocProvider<CacheAmcMediaUploadBloc>(
            create: (_) => CacheAmcMediaUploadBloc(),
          ),
          BlocProvider<AmcOtpBloc>(create: (_) => AmcOtpBloc()),
        ],
        child: const Scaffold(
          appBar: LivelihoodAppBar(showMenu: true),
          drawer: CustomDrawer(),
          body: AutoRouter(),
        ),
      );
}
