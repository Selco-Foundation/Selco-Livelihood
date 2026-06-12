import type { ComponentType } from "react";

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface ModuleDefinition<TRoute = unknown> {
  id: string;
  routes: TRoute[];
  navItems: NavItem[];
}
