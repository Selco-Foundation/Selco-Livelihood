import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { HrmsEmployee } from "../api/hrms";
import type { JurisdictionBoundaries } from "../utils/boundary-util";

interface JurisdictionState {
  boundaries: JurisdictionBoundaries | null;
  currentBoundary: JurisdictionBoundaries | null;
  hrmsUser: HrmsEmployee | null;
  setJurisdictionData: (data: {
    boundaries: JurisdictionBoundaries;
    currentBoundary: JurisdictionBoundaries;
    hrmsUser: HrmsEmployee;
  }) => void;
  setCurrentBoundary: (boundary: JurisdictionBoundaries) => void;
  clearJurisdiction: () => void;
}

export const useJurisdictionStore = create<JurisdictionState>()(
  persist(
    (set) => ({
      boundaries: null,
      currentBoundary: null,
      hrmsUser: null,
      setJurisdictionData: ({ boundaries, currentBoundary, hrmsUser }) =>
        set({ boundaries, currentBoundary, hrmsUser }),
      setCurrentBoundary: (currentBoundary) => set({ currentBoundary }),
      clearJurisdiction: () =>
        set({
          boundaries: null,
          currentBoundary: null,
          hrmsUser: null,
        }),
    }),
    {
      name: "livelihood-jurisdiction",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
