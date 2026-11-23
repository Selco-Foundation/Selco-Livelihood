import 'package:digit_ui_components/digit_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livelihood/widgets/login_credential_input.dart';

void main() {
  for (final width in [390.0, 800.0, 1280.0]) {
    for (final isPassword in [false, true]) {
      for (final state in ['empty', 'populated', 'error']) {
        testWidgets('login input matches DIGIT: $width $isPassword $state',
            (tester) async {
          tester.view.physicalSize = Size(width, 1000);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final referenceController =
              TextEditingController(text: state == 'empty' ? '' : 'demo.value');
          final actualController =
              TextEditingController(text: referenceController.text);
          addTearDown(referenceController.dispose);
          addTearDown(actualController.dispose);
          final error = state == 'error' ? 'Required field' : null;
          await tester.pumpWidget(MaterialApp(
            theme: DigitTheme.instance.mobileTheme,
            home: Scaffold(
              body: Column(
                children: [
                  if (isPassword)
                    DigitPasswordFormInput(
                      key: const ValueKey('reference'),
                      controller: referenceController,
                      errorMessage: error,
                    )
                  else
                    DigitTextFormInput(
                      key: const ValueKey('reference'),
                      controller: referenceController,
                      errorMessage: error,
                    ),
                  LoginCredentialInput(
                    key: const ValueKey('actual'),
                    controller: actualController,
                    isPassword: isPassword,
                    errorMessage: error,
                    autofillEnabled: true,
                    onChanged: (_) {},
                  ),
                ],
              ),
            ),
          ));

          Finder child(String key, Type type) => find.descendant(
              of: find.byKey(ValueKey(key)), matching: find.byType(type));
          void expectMatchingLayout() {
            expect(tester.getSize(child('actual', TextFormField)),
                tester.getSize(child('reference', TextFormField)));
            expect(tester.getSize(find.byKey(const ValueKey('actual'))),
                tester.getSize(find.byKey(const ValueKey('reference'))));
            final reference =
                tester.widget<TextField>(child('reference', TextField));
            final actual = tester.widget<TextField>(child('actual', TextField));
            expect(actual.style, reference.style);
            expect(actual.decoration!.constraints,
                reference.decoration!.constraints);
            expect(actual.decoration!.contentPadding,
                reference.decoration!.contentPadding);
            expect(actual.decoration!.enabledBorder,
                reference.decoration!.enabledBorder);
            expect(actual.decoration!.focusedBorder,
                reference.decoration!.focusedBorder);
            expect(actual.obscureText, reference.obscureText);
            Offset relativePosition(String key, Type type) =>
                tester.getTopLeft(child(key, type)) -
                tester.getTopLeft(find.byKey(ValueKey(key)));
            expect(relativePosition('actual', EditableText),
                relativePosition('reference', EditableText));
            if (isPassword) {
              final referenceIcon = child('reference', Icon).first;
              final actualIcon = child('actual', Icon).first;
              expect(tester.getSize(actualIcon), tester.getSize(referenceIcon));
              expect(
                tester.getTopLeft(actualIcon) -
                    tester.getTopLeft(find.byKey(const ValueKey('actual'))),
                tester.getTopLeft(referenceIcon) -
                    tester.getTopLeft(find.byKey(const ValueKey('reference'))),
              );
            }
            if (error != null) {
              Finder errorText(String key) => find.descendant(
                    of: find.byKey(ValueKey(key)),
                    matching: find.text(error),
                  );
              expect(tester.widget<Text>(errorText('actual')).style,
                  tester.widget<Text>(errorText('reference')).style);
              expect(
                tester.getTopLeft(errorText('actual')) -
                    tester.getTopLeft(find.byKey(const ValueKey('actual'))),
                tester.getTopLeft(errorText('reference')) -
                    tester.getTopLeft(find.byKey(const ValueKey('reference'))),
              );
            }
          }

          expectMatchingLayout();
          final reference =
              tester.widget<TextField>(child('reference', TextField));
          final actual = tester.widget<TextField>(child('actual', TextField));
          reference.focusNode!.requestFocus();
          await tester.pump();
          final focusedReferenceSize =
              tester.getSize(child('reference', TextFormField));
          actual.focusNode!.requestFocus();
          await tester.pump();
          expect(tester.getSize(child('actual', TextFormField)),
              focusedReferenceSize);

          if (isPassword) {
            await tester.tap(child('reference', InkWell).first);
            await tester.pump();
            await tester.tap(child('actual', InkWell).first);
            await tester.pump();
            expectMatchingLayout();
            expect(actual.focusNode!.hasFocus, isTrue);
          }
        });
      }
    }
  }
}
