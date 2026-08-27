import 'package:auto_route/auto_route.dart';
import 'package:digit_scanner/blocs/scanner.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

@RoutePage()
class AuthenticatedScreenWrapper extends StatelessWidget {
  const AuthenticatedScreenWrapper({super.key});

  @override
  Widget build(BuildContext context) => BlocProvider<DigitScannerBloc>(
        create: (_) => DigitScannerBloc(const DigitScannerState()),
        child: const AutoRouter(),
      );
}
