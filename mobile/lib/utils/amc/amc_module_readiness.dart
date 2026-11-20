/// AMC's MDMS readiness. This app's `AppInitialization` only knows the
/// installation masters, so AMC tracks its own flag: set once the AMC form
/// schema has loaded, cleared on role selection and on login/logout so the
/// next AMC home visit loads it again, once per auth session.
class AmcModuleReadiness {
  AmcModuleReadiness._();

  static bool _ready = false;

  static bool get isReady => _ready;

  static void markReady() => _ready = true;

  static void invalidate() => _ready = false;
}
