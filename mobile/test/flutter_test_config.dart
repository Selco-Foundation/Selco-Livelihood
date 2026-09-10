import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// `flutter test` runs the Dart VM directly rather than a real Flutter app
/// bundle, so Isar's native core (bundled inside `isar_flutter_libs` per
/// platform) is never automatically placed next to the test binary the way
/// it would be for a built macOS/Linux/Windows app. Without this, every
/// `Constants().isar` call throws "Failed to load dynamic library" and every
/// repository built on top of it silently falls back to its degraded/no-op
/// path — which is easy to miss since most of those paths are deliberately
/// forgiving, but it means Isar-backed behavior is never actually exercised.
///
/// This copies the prebuilt native library out of the resolved
/// `isar_flutter_libs` package (located via `.dart_tool/package_config.json`,
/// so it isn't tied to one machine's pub-cache layout) into the project
/// root, once, before any test runs.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  await _ensureIsarCoreAvailable();
  await testMain();
}

Future<void> _ensureIsarCoreAvailable() async {
  final libraryName = _isarLibraryNameForCurrentPlatform();
  if (libraryName == null) return; // e.g. running under `flutter test -p chrome`

  final target = File(libraryName);
  if (target.existsSync()) return;

  final packageConfig = File('.dart_tool/package_config.json');
  if (!packageConfig.existsSync()) return;

  final Map<String, dynamic> config =
      jsonDecode(await packageConfig.readAsString());
  final packages = (config['packages'] as List).cast<Map<String, dynamic>>();
  final isarLibs = packages.firstWhere(
    (p) => p['name'] == 'isar_flutter_libs',
    orElse: () => const {},
  );
  final rootUri = isarLibs['rootUri'] as String?;
  if (rootUri == null) return;

  final packageRoot = Directory.fromUri(Uri.parse(rootUri));
  final source = File(
      '${packageRoot.path}/${_isarLibraryPlatformDir()}/$libraryName');
  if (!source.existsSync()) return;

  await source.copy(target.path);
}

String? _isarLibraryNameForCurrentPlatform() {
  if (Platform.isMacOS) return 'libisar.dylib';
  if (Platform.isLinux) return 'libisar.so';
  if (Platform.isWindows) return 'isar.dll';
  return null;
}

String _isarLibraryPlatformDir() {
  if (Platform.isMacOS) return 'macos';
  if (Platform.isLinux) return 'linux';
  return 'windows';
}
