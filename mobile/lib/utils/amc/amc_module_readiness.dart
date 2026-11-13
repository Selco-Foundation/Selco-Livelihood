/// Stand-in for E4H's per-module MDMS readiness
/// (`AppInitialization.isModuleReady/markModuleReady/invalidateModule` for
/// `MdmsModule.amc`). This app's `AppInitialization` only knows the
/// installation masters, so AMC tracks its own flag: set once the AMC form
/// schema has loaded, cleared on role selection and on login/logout so the
/// next AMC home visit loads it again, as E4H does per auth session.
class AmcModuleReadiness {
  AmcModuleReadiness._();

  static bool _ready = false;

  static bool get isReady => _ready;

  static void markReady() => _ready = true;

  static void invalidate() => _ready = false;
}
