import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDefaultLanguage } from "../i18n/locale-utils";

interface LocaleState {
  locale: string;
  loadedModules: string[];
  setLocale: (locale: string) => void;
  markModulesLoaded: (modules: string[]) => void;
  removeModule: (module: string) => void;
  getUnloadedModules: (modules: string[]) => string[];
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: getDefaultLanguage(),
      loadedModules: [],
      setLocale: (locale) => set({ locale }),
      markModulesLoaded: (modules) =>
        set((state) => ({
          loadedModules: [...new Set([...state.loadedModules, ...modules])],
        })),
      removeModule: (module) =>
        set((state) => ({
          loadedModules: state.loadedModules.filter((m) => m !== module),
        })),
      getUnloadedModules: (modules) => {
        const loaded = new Set(get().loadedModules);
        return modules.filter((module) => !loaded.has(module));
      },
    }),
    {
      name: "livelihood-locale",
      partialize: (state) => ({
        locale: state.locale,
        loadedModules: state.loadedModules,
      }),
    },
  ),
);
