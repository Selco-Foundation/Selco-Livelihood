import { translateOr, useTranslate } from "@/shared";
import { Accordion, AccordionContent, AccordionItem, Button } from "@/ui";
import { ChevronDown } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { useState } from "react";
import type {
  RejectionReasonEntry,
  RejectionReasonOption,
  ReviewSectionContent,
  ReviewSectionId,
  SectionRejectionReasons,
} from "../../types/facility-review";
import { AssetSectionBody } from "./AssetSectionBody";
import { InstallationImageSectionBody } from "./InstallationImageSectionBody";
import { ReportSectionBody } from "./ReportSectionBody";
import { RejectionReasonDialog, type RejectionReasonDraft } from "./RejectionReasonDialog";
import { SectionReasonChips } from "./SectionReasonChips";

interface ReviewSectionsProps {
  sections: ReviewSectionContent[];
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

export function ReviewSections({
  sections,
  reasonOptions,
  rejectionReasons,
  canEditReasons,
  onAddReason,
  onEditReason,
  onRemoveReason,
}: ReviewSectionsProps) {
  const { t } = useTranslate();
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  return (
    <>
      <div className="space-y-4">
        {sections.map((section) => {
          const reasons = rejectionReasons[section.id] ?? [];

          return (
            <Accordion
              key={section.id}
              type="multiple"
              defaultValue={[]}
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
                  {section.kind === "ASSET" ? (
                    <AssetSectionBody section={section} />
                  ) : section.kind === "REPORT" ? (
                    <ReportSectionBody section={section} />
                  ) : (
                    <InstallationImageSectionBody section={section} />
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
        reasonOptions={reasonOptions}
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
