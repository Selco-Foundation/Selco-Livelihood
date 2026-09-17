import type { ComponentType } from "react";
import type { ModuleDefinition } from "@/shared";

let registeredModules: ModuleDefinition[] = [];

export function setRegisteredModules(modules: ModuleDefinition[]) {
  registeredModules = modules;
}

export function getRegisteredModules() {
  return registeredModules;
}

export function getModuleNavItems() {
  return [...registeredModules]
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .flatMap((module) => module.navItems ?? []);
}

export interface ModuleOverviewEntry {
  Overview: ComponentType;
  moduleId: string;
}

export function getModuleOverviews(): ModuleOverviewEntry[] {
  return [...registeredModules]
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .filter((module) => module.overview)
    .map((module) => ({ Overview: module.overview!, moduleId: module.id }));
}
