import 'package:auto_route/auto_route.dart';
import 'package:digit_forms_engine/blocs/forms/forms.dart';
import 'package:digit_scanner/blocs/scanner.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

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
        ],
        child: const Scaffold(
          appBar: LivelihoodAppBar(showMenu: true),
          drawer: CustomDrawer(),
          body: AutoRouter(),
        ),
      );
}
