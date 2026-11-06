import type { ProjectDetailsValue } from "../components/steps/ProjectDetailsStep";
import type { GeographyDetails } from "../types/project";

/** What the Create Project wizard holds before the project exists on the backend. */
export interface CreateProjectDraft {
  projectDetails: ProjectDetailsValue;
  geographyDetails: GeographyDetails;
}

const STORAGE_KEY = "livelihood-pm-create-project-draft";

/**
 * The project is only created when the PM leaves step 2, so until then the wizard's values live
 * in component state and a page reload wiped them. They are mirrored to sessionStorage -- per tab,
 * and gone when the tab closes -- so a reload resumes where the PM was. Every access is guarded:
 * storage can be unavailable (private mode, blocked site data) and the wizard must work without it.
 */
/** The draft saved by this tab, or undefined when there is none or it is unreadable. */
export function readCreateProjectDraft(): CreateProjectDraft | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<CreateProjectDraft> | null;
    if (typeof parsed?.projectDetails?.justificationCode !== "string") return undefined;
    return { projectDetails: parsed.projectDetails, geographyDetails: parsed.geographyDetails ?? {} };
  } catch {
    return undefined;
  }
}

/** Saves the draft for this tab; silently skipped when storage is unavailable or full. */
export function writeCreateProjectDraft(draft: CreateProjectDraft): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Quota or unavailable storage: the draft just isn't kept.
  }
}

/** Removes this tab's saved draft. */
export function clearCreateProjectDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
