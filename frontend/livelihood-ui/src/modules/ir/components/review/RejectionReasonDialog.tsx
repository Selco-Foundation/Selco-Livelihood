import { translateOr, useTranslate } from "@/shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui";
import { useEffect, useState } from "react";
import type { RejectionReasonOption } from "../../types/facility-review";

export interface RejectionReasonDraft {
  reasonCode: string;
  reasonLabel: string;
  comment: string;
}

interface RejectionReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reasonOptions: RejectionReasonOption[];
  /** Pre-filled when editing an existing reason; absent when adding a new one. */
  initialValue?: RejectionReasonDraft;
  onSubmit: (entry: RejectionReasonDraft) => void;
  /** Only present in edit mode. */
  onDelete?: () => void;
}

export function RejectionReasonDialog({
  open,
  onOpenChange,
  reasonOptions,
  initialValue,
  onSubmit,
  onDelete,
}: RejectionReasonDialogProps) {
  const { t } = useTranslate();
  const isEditing = Boolean(initialValue);
  const [reasonCode, setReasonCode] = useState(initialValue?.reasonCode ?? "");
  const [comment, setComment] = useState(initialValue?.comment ?? "");

  // Dialog content is mounted once and reused across opens (Radix keeps it in
  // the tree for the close animation), so the draft needs to reset whenever a
  // *different* reason is opened for editing — not just on close.
  useEffect(() => {
    if (open) {
      setReasonCode(initialValue?.reasonCode ?? "");
      setComment(initialValue?.comment ?? "");
    }
  }, [open, initialValue]);

  function handleSubmit() {
    const selected = reasonOptions.find((option) => option.code === reasonCode);
    if (!selected) {
      return;
    }
    onSubmit({ reasonCode: selected.code, reasonLabel: selected.name, comment: comment.trim() });
    onOpenChange(false);
  }

  function handleDelete() {
    onDelete?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? translateOr(t, "ES_IR_EDIT_REJECTION_REASON", "Edit rejection reason")
              : translateOr(t, "ES_IR_ADD_REJECTION_REASON", "Add rejection reason")}
          </DialogTitle>
          <DialogDescription>
            {translateOr(
              t,
              "ES_IR_ADD_REJECTION_REASON_DESCRIPTION",
              "Pick a reason and add an optional comment for this section.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-950">
              {translateOr(t, "ES_IR_REJECTION_REASON", "Reason")}
            </label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={translateOr(t, "ES_IR_SELECT_REASON", "Select a reason")} />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-950">
              {translateOr(t, "ES_IR_REJECTION_COMMENT", "Comment")}
            </label>
            <textarea
              className="min-h-[80px] w-full rounded border border-ink-300 bg-card px-3 py-2 text-sm placeholder:text-ink-300"
              placeholder={translateOr(t, "ES_IR_REJECTION_COMMENT_PLACEHOLDER", "Add details for this reason")}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          {isEditing ? (
            <Button variant="destructive" onClick={handleDelete} className="sm:mr-auto">
              {translateOr(t, "ES_COMMON_DELETE", "Delete")}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </Button>
          <Button disabled={!reasonCode} onClick={handleSubmit}>
            {isEditing
              ? translateOr(t, "ES_COMMON_SAVE", "Save")
              : translateOr(t, "ES_COMMON_ADD", "Add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
