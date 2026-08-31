import type { ImageChecklistSectionContent } from "../../types/facility-review";
import { SectionImageGrid } from "./SectionMedia";

interface InstallationImageSectionBodyProps {
  section: ImageChecklistSectionContent;
}

/** The section's own accordion header already shows its title (e.g. "Site
 * overview photo"), so the body is just the image grid — no repeated title. */
export function InstallationImageSectionBody({ section }: InstallationImageSectionBodyProps) {
  return <SectionImageGrid images={section.images} bare />;
}
