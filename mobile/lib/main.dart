import 'package:digit_ui_components/digit_components.dart';
import 'package:flutter/material.dart';

import 'router/app_router.dart';

void main() {
  runApp(const LivelihoodApp());
}

class LivelihoodApp extends StatefulWidget {
  const LivelihoodApp({super.key, this.router});

  final AppRouter? router;

  @override
  State<LivelihoodApp> createState() => _LivelihoodAppState();
}

class _LivelihoodAppState extends State<LivelihoodApp> {
  late final AppRouter _router = widget.router ?? AppRouter();

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Livelihood',
      debugShowCheckedModeBanner: false,
      theme: DigitTheme.instance.mobileTheme,
      routerConfig: _router.config(),
    );
  }
}
