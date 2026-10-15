import { translateOr, useTranslate } from "@/shared";
import { Accordion, AccordionContent, AccordionItem } from "@/ui/components/ui/accordion";
import { Button } from "@/ui/components/ui/button";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { ChevronDown } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { useState } from "react";
import { AssetSectionBody } from "./asset-section-body";
import { InstallationImageSectionBody } from "./installation-image-section-body";
import { ReportSectionBody } from "./report-section-body";
import type {
  ActivityDocument,
  AssetSectionMediaPatch,
  ImageChecklistMediaPatch,
  ReportSectionMediaPatch,
  ReviewSectionContent,
  SectionMediaPatch,
} from "./types";

interface ReviewSectionsAccordionProps {
  sections: ReviewSectionContent[];
  /** Raw, unresolved documents per section — resolved into media on expand. */
  sectionDocuments: Partial<Record<string, ActivityDocument[]>>;
  loadSectionMedia: (
    section: ReviewSectionContent,
    documents: ActivityDocument[],
  ) => Promise<SectionMediaPatch>;
  /** Renders a header-row control next to the section's trigger (e.g. ir's
   * "Add rejection reason" button) — omitted entirely for a read-only caller. */
  renderHeaderAction?: (section: ReviewSectionContent) => React.ReactNode;
  /** Renders a block below the header, above the body (e.g. ir's
   * SectionReasonChips) — omitted entirely for a read-only caller. */
  renderReasonChips?: (section: ReviewSectionContent) => React.ReactNode;
}

function mergeSectionMedia(
  section: ReviewSectionContent,
  media: SectionMediaPatch | undefined,
): ReviewSectionContent {
  if (!media) {
    return section;
  }

  if (section.kind === "ASSET") {
    const patch = media as AssetSectionMediaPatch;
    return {
      ...section,
      images: patch.images,
      videos: patch.videos,
      mediaGroups: section.mediaGroups?.map((group) => ({
        ...group,
        images: patch.mediaGroups?.[group.id]?.images ?? group.images,
        videos: patch.mediaGroups?.[group.id]?.videos ?? group.videos,
      })),
    };
  }

  if (section.kind === "REPORT") {
    return { ...section, ...(media as ReportSectionMediaPatch) };
  }

  return { ...section, images: (media as ImageChecklistMediaPatch).images };
}

export function ReviewSectionsAccordion({
  sections,
  sectionDocuments,
  loadSectionMedia,
  renderHeaderAction,
  renderReasonChips,
}: ReviewSectionsAccordionProps) {
  const { t } = useTranslate();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [resolvedMedia, setResolvedMedia] = useState<Partial<Record<string, SectionMediaPatch>>>({});

  function handleExpand(section: ReviewSectionContent) {
    setExpandedIds((prev) => new Set(prev).add(section.id));

    if (resolvedMedia[section.id] || loadingIds.has(section.id)) {
      return;
    }

    setFailedIds((prev) => {
      if (!prev.has(section.id)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(section.id);
      return next;
    });
    setLoadingIds((prev) => new Set(prev).add(section.id));
    loadSectionMedia(section, sectionDocuments[section.id] ?? [])
      .then((media) => {
        setResolvedMedia((prev) => ({ ...prev, [section.id]: media }));
      })
      .catch((error) => {
        console.error(`Failed to load media for section ${section.id}:`, error);
        setFailedIds((prev) => new Set(prev).add(section.id));
      })
      .finally(() => {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(section.id);
          return next;
        });
      });
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const isLoading = loadingIds.has(section.id);
        const hasFailed = failedIds.has(section.id);
        const mergedSection = mergeSectionMedia(section, resolvedMedia[section.id]);
        const headerAction = renderHeaderAction?.(section);
        const reasonChips = renderReasonChips?.(section);

        return (
          <Accordion
            key={section.id}
            type="multiple"
            value={expandedIds.has(section.id) ? [section.id] : []}
            onValueChange={(value) => {
              if (value.includes(section.id)) {
                handleExpand(section);
              } else {
                setExpandedIds((prev) => {
                  const next = new Set(prev);
                  next.delete(section.id);
                  return next;
                });
              }
            }}
            className="livelihood-card px-4"
          >
            <AccordionItem value={section.id}>
              <AccordionPrimitive.Header className="flex items-center justify-between gap-3 py-4">
                <AccordionPrimitive.Trigger className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-ink-950 outline-none [&[data-state=open]>svg]:rotate-180">
                  {"labelKey" in section && section.labelKey
                    ? translateOr(t, section.labelKey, section.label)
                    : section.label}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform" />
                </AccordionPrimitive.Trigger>
                {headerAction}
              </AccordionPrimitive.Header>
              {reasonChips ? <div className="pb-4">{reasonChips}</div> : null}
              <AccordionContent className="space-y-4 pb-4">
                {isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : hasFailed ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                    <span>
                      {translateOr(
                        t,
                        "ES_IR_SECTION_MEDIA_LOAD_ERROR",
                        "Couldn't load media for this section.",
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleExpand(section)}
                    >
                      {translateOr(t, "ES_IR_RETRY", "Retry")}
                    </Button>
                  </div>
                ) : mergedSection.kind === "ASSET" ? (
                  <AssetSectionBody section={mergedSection} />
                ) : mergedSection.kind === "REPORT" ? (
                  <ReportSectionBody section={mergedSection} />
                ) : (
                  <InstallationImageSectionBody section={mergedSection} />
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      })}
    </div>
  );
}
