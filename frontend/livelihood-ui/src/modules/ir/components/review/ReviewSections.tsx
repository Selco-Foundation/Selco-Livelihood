import { translateOr, useTranslate, type RejectionReasonOption } from "@/shared";
import {
  Button,
  ReviewSectionsAccordion,
  type ActivityDocument,
  type ReviewSectionContent,
  type SectionMediaPatch,
} from "@/ui";
import { useState } from "react";
import type {
  RejectionReasonEntry,
  ReviewSectionId,
  SectionRejectionReasons,
} from "../../types/activity-review";
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

/** The review-specific layer on top of the shared `ReviewSectionsAccordion`:
 * the "Add rejection reason" control, the reason chips, and the dialog that
 * adds/edits/removes them. `eu`'s read-only Activity Report page renders
 * `ReviewSectionsAccordion` directly, with neither render prop. */
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

  // A reason already used elsewhere in this section can't be picked again —
  // except the one currently being edited, which must stay selectable as itself.
  const dialogSectionReasons = dialogState ? rejectionReasons[dialogState.sectionId] ?? [] : [];
  const usedReasonCodes = new Set(
    dialogSectionReasons
      .filter((reason) => reason.id !== dialogState?.editing?.id)
      .map((reason) => reason.reasonCode),
  );
  const availableReasonOptions = reasonOptions.filter((option) => !usedReasonCodes.has(option.code));

  return (
    <>
      <ReviewSectionsAccordion
        sections={sections}
        sectionDocuments={sectionDocuments}
        loadSectionMedia={loadSectionMedia}
        renderHeaderAction={(section) =>
          canEditReasons ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive active:border-destructive active:bg-destructive/20 active:text-destructive"
              onClick={() => setDialogState({ sectionId: section.id })}
            >
              {translateOr(t, "ES_IR_ADD_REJECTION_REASON", "Add rejection reason")}
            </Button>
          ) : null
        }
        renderReasonChips={(section) => {
          const reasons = rejectionReasons[section.id] ?? [];
          if (reasons.length === 0) {
            return null;
          }
          return (
            <SectionReasonChips
              reasons={reasons}
              readOnly={!canEditReasons}
              onEdit={(reason) => setDialogState({ sectionId: section.id, editing: reason })}
              onRemove={(reasonId) => onRemoveReason(section.id, reasonId)}
            />
          );
        }}
      />

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
