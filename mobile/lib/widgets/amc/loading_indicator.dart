import 'package:digit_ui_components/theme/spacers.dart';
import 'package:flutter/material.dart';

/// E4H `loadingIndicator()`.
Widget loadingIndicator() => const Center(
      child: Center(
        child: Padding(
          padding: EdgeInsets.only(top: spacer8),
          child: CircularProgressIndicator(),
        ),
      ),
    );
