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
  /**
   * Role codes allowed to see this item — shown if the user has at least one.
   * Omit to show the item to every authenticated user (e.g. the Overview item
   * AppShell prepends outside any module).
   */
  roles?: string[];
}

export interface ModuleDefinition<TRoute = unknown> {
  id: string;
  order?: number;
  routes: TRoute[];
  navItems: NavItem[];
  overview?: ComponentType;
}
