import { translateOr, useTranslate } from "@/shared";
import { SectionImageGrid } from "./section-media";
import type { ImageChecklistSectionContent } from "./types";

interface InstallationImageSectionBodyProps {
  section: ImageChecklistSectionContent;
}

/** The section's own accordion header already shows its short title (e.g.
 * "Cable Routing"), so the body shows the long capture instruction the field
 * staff saw, an "Optional photo" note when MDMS made the photo optional, and
 * the image grid. The hint is MDMS free text, so it is shown as-is. */
export function InstallationImageSectionBody({ section }: InstallationImageSectionBodyProps) {
  const { t } = useTranslate();
  const grid = <SectionImageGrid images={section.images} bare />;

  if (!section.hint && !section.optional) {
    return grid;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-[21px] text-ink-600">
        {section.hint}
        {section.hint && section.optional ? " " : null}
        {section.optional ? (
          <span className="font-medium">({translateOr(t, "ES_IR_OPTIONAL_PHOTO", "Optional photo")})</span>
        ) : null}
      </p>
      {grid}
    </div>
  );
}
