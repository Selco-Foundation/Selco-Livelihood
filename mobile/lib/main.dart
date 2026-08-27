import 'package:digit_scanner/blocs/scanner.dart';
import 'package:digit_ui_components/digit_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'pages/welcome_page.dart';

void main() {
  runApp(const LivelihoodApp());
}

class LivelihoodApp extends StatelessWidget {
  const LivelihoodApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<DigitScannerBloc>(
      create: (_) => DigitScannerBloc(const DigitScannerState()),
      child: MaterialApp(
        title: 'Livelihood',
        debugShowCheckedModeBanner: false,
        theme: DigitTheme.instance.mobileTheme,
        home: const WelcomePage(),
      ),
    );
  }
}
