import type { ComponentType } from "react";

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface ModuleDefinition<TRoute = unknown> {
  id: string;
  order?: number;
  routes: TRoute[];
  navItems: NavItem[];
  overview?: ComponentType;
}
