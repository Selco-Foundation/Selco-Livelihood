import { translateOr, useTranslate } from "@/shared";
import { Accordion, AccordionContent, AccordionItem, Button, Skeleton } from "@/ui";
import { ChevronDown } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { useState } from "react";
import type {
  ActivityDocument,
  AssetSectionMediaPatch,
  ImageChecklistMediaPatch,
  RejectionReasonEntry,
  RejectionReasonOption,
  ReportSectionMediaPatch,
  ReviewSectionContent,
  ReviewSectionId,
  SectionMediaPatch,
  SectionRejectionReasons,
} from "../../types/facility-review";
import { AssetSectionBody } from "./AssetSectionBody";
import { InstallationImageSectionBody } from "./InstallationImageSectionBody";
import { ReportSectionBody } from "./ReportSectionBody";
import { RejectionReasonDialog, type RejectionReasonDraft } from "./RejectionReasonDialog";
import { SectionReasonChips } from "./SectionReasonChips";

interface ReviewSectionsProps {
  sections: ReviewSectionContent[];
  /** Raw, unresolved documents per section — resolved into media on expand. */
  sectionDocuments: Partial<Record<ReviewSectionId, ActivityDocument[]>>;
  loadSectionMedia: (
    section: ReviewSectionContent,
    documents: ActivityDocument[],
  ) => Promise<SectionMediaPatch>;
  reasonOptions: RejectionReasonOption[];
  rejectionReasons: SectionRejectionReasons;
  /** Reasons can only be added/edited/removed while the entry is still
   * pending review — matches e4h hiding "Add rejection reason" once decided. */
  canEditReasons: boolean;
  onAddReason: (sectionId: ReviewSectionId, entry: RejectionReasonDraft) => void;
  onEditReason: (sectionId: ReviewSectionId, reasonId: string, entry: RejectionReasonDraft) => void;
  onRemoveReason: (sectionId: ReviewSectionId, reasonId: string) => void;
}

interface DialogState {
  sectionId: ReviewSectionId;
  editing?: RejectionReasonEntry;
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

export function ReviewSections({
  sections,
  sectionDocuments,
  loadSectionMedia,
  reasonOptions,
  rejectionReasons,
  canEditReasons,
  onAddReason,
  onEditReason,
  onRemoveReason,
}: ReviewSectionsProps) {
  const { t } = useTranslate();
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<ReviewSectionId>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<ReviewSectionId>>(new Set());
  const [resolvedMedia, setResolvedMedia] = useState<Partial<Record<ReviewSectionId, SectionMediaPatch>>>({});

  // A reason already used elsewhere in this section can't be picked again —
  // except the one currently being edited, which must stay selectable as itself.
  const dialogSectionReasons = dialogState ? rejectionReasons[dialogState.sectionId] ?? [] : [];
  const usedReasonCodes = new Set(
    dialogSectionReasons
      .filter((reason) => reason.id !== dialogState?.editing?.id)
      .map((reason) => reason.reasonCode),
  );
  const availableReasonOptions = reasonOptions.filter((option) => !usedReasonCodes.has(option.code));

  function handleExpand(section: ReviewSectionContent) {
    setExpandedIds((prev) => new Set(prev).add(section.id));

    if (resolvedMedia[section.id] || loadingIds.has(section.id)) {
      return;
    }

    setLoadingIds((prev) => new Set(prev).add(section.id));
    loadSectionMedia(section, sectionDocuments[section.id] ?? [])
      .then((media) => {
        setResolvedMedia((prev) => ({ ...prev, [section.id]: media }));
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
    <>
      <div className="space-y-4">
        {sections.map((section) => {
          const reasons = rejectionReasons[section.id] ?? [];
          const isLoading = loadingIds.has(section.id);
          const mergedSection = mergeSectionMedia(section, resolvedMedia[section.id]);

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
                  {canEditReasons ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-destructive text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive active:border-destructive active:bg-destructive/20 active:text-destructive"
                      onClick={() => setDialogState({ sectionId: section.id })}
                    >
                      {translateOr(t, "ES_IR_ADD_REJECTION_REASON", "Add rejection reason")}
                    </Button>
                  ) : null}
                </AccordionPrimitive.Header>
                {reasons.length > 0 ? (
                  <div className="pb-4">
                    <SectionReasonChips
                      reasons={reasons}
                      readOnly={!canEditReasons}
                      onEdit={(reason) => setDialogState({ sectionId: section.id, editing: reason })}
                      onRemove={(reasonId) => onRemoveReason(section.id, reasonId)}
                    />
                  </div>
                ) : null}
                <AccordionContent className="space-y-4 pb-4">
                  {isLoading ? (
                    <Skeleton className="h-24 w-full" />
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

      <RejectionReasonDialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(null);
          }
        }}
        reasonOptions={availableReasonOptions}
        initialValue={dialogState?.editing}
        onSubmit={(entry) => {
          if (!dialogState) {
            return;
          }
          if (dialogState.editing) {
            onEditReason(dialogState.sectionId, dialogState.editing.id, entry);
          } else {
            onAddReason(dialogState.sectionId, entry);
          }
        }}
        onDelete={
          dialogState?.editing
            ? () => onRemoveReason(dialogState.sectionId, dialogState.editing!.id)
            : undefined
        }
      />
    </>
  );
}
