import type { ComponentType } from "react";

export interface NavItem {
  id: string;
  label: string;
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
