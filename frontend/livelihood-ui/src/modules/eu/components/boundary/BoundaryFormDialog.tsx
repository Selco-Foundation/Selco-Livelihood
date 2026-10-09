import { extractApiErrorMessage, translateOr, useTranslate } from "@/shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogScrim,
  DialogTitle,
  toast,
  useBodyScrollLock,
} from "@/ui";
import { useEffect } from "react";
import { useBoundaryForm } from "../../hooks/use-boundary-form";
import { useCreateBoundary } from "../../hooks/use-create-boundary";
import { BoundaryForm } from "./BoundaryForm";

interface BoundaryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoundaryFormDialog({ open, onOpenChange }: BoundaryFormDialogProps) {
  const { t } = useTranslate();
  const form = useBoundaryForm();
  const createBoundary = useCreateBoundary();

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) {
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit() {
    if (!form.validate()) {
      return;
    }
    createBoundary.mutate(
      {
        state: form.values.state,
        district: form.values.district,
        block: form.values.block,
        isStateTextMode: form.isStateTextMode,
        isDistrictTextMode: form.isDistrictTextMode,
      },
      {
        onSuccess: () => {
          toast.success(
            translateOr(t, "FA_TOAST_BOUNDARY_CREATION_SUCCESS", "Boundary created successfully"),
          );
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(
            extractApiErrorMessage(error) ??
              translateOr(t, "FA_TOAST_BOUNDARY_CREATION_ERROR", "Failed to create boundary"),
          );
        },
      },
    );
  }

  return (
    // `modal={false}`: a modal Dialog's own scroll-lock only knows about its own
    // content subtree, but FormSelectField's Popover list portals to document.body
    // as a sibling — the lock swallowed wheel events over it, making the
    // State/District list impossible to scroll with a mouse wheel (scrollbar drag
    // still worked). `modal={false}` drops that lock, but Radix also skips
    // rendering its dim/click-blocking overlay for a non-modal dialog, so
    // `DialogScrim` + `useBodyScrollLock` restore both by hand.
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogScrim open={open} onDismiss={() => onOpenChange(false)} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{translateOr(t, "FA_ADD_BOUNDARY", "Add Boundary")}</DialogTitle>
        </DialogHeader>

        <BoundaryForm form={form} />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </Button>
          <Button type="button" disabled={createBoundary.isPending} onClick={handleSubmit}>
            {translateOr(t, "CORE_COMMON_SAVE", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
