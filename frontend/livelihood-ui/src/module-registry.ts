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

export interface ModuleHomeCardEntry {
  Card: ComponentType;
  moduleId: string;
}

export function getModuleHomeCards(): ModuleHomeCardEntry[] {
  return [...registeredModules]
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .flatMap((module) =>
      (module.homeCards ?? []).map((Card) => ({ Card, moduleId: module.id })),
    );
}
