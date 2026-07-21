import type { ComponentType } from "react";

export interface NavItem {
  id: string;
  label: string;
  /**
   * Localization code for `label`. Module nav items are built once outside
   * React (at module registration), so `label` is a static English fallback;
   * when set, the app shell re-resolves the translated text via `translateOr`
   * at render time so it reacts to language changes.
   */
  labelKey?: string;
  to: string;
  icon?: ComponentType<{ className?: string }>;
  /**
   * Additional path prefixes (besides `to`) that should also render this nav
   * item as active — e.g. a details page reached only via this section, whose
   * own route lives outside `to`'s own path tree.
   */
  matchPrefixes?: string[];
}

export interface ModuleDefinition<TRoute = unknown> {
  id: string;
  order?: number;
  routes: TRoute[];
  navItems: NavItem[];
  overview?: ComponentType;
}
