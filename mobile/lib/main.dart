import 'package:digit_ui_components/digit_components.dart';
import 'package:flutter/material.dart';

import 'pages/welcome_page.dart';

void main() {
  runApp(const LivelihoodApp());
}

class LivelihoodApp extends StatelessWidget {
  const LivelihoodApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Livelihood',
      debugShowCheckedModeBanner: false,
      theme: DigitTheme.instance.mobileTheme,
      home: const WelcomePage(),
    );
  }
}
