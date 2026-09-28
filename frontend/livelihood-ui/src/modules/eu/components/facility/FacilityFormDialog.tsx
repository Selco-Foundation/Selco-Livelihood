import { extractApiErrorMessage, tenantId, translateOr, useTranslate } from "@/shared";
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
import { useCreateFacility } from "../../hooks/use-facilities";
import { useFacilityForm } from "../../hooks/use-facility-form";
import { FacilityForm } from "./FacilityForm";

interface FacilityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FacilityFormDialog({ open, onOpenChange }: FacilityFormDialogProps) {
  const { t } = useTranslate();
  const form = useFacilityForm();
  const createFacility = useCreateFacility();

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) {
      form.reset();
    }
    // Only reset when the dialog opens/closes, not on every form-state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit() {
    if (!form.validate()) {
      return;
    }
    createFacility.mutate(form.toPayload(tenantId()), {
      onSuccess: () => {
        toast.success(
          translateOr(t, "END_USER_SITE_CREATION_SUCCESS", "End user site created successfully"),
        );
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(
          extractApiErrorMessage(error) ??
            translateOr(t, "END_USER_SITE_CREATION_FAILED", "Failed to create end user site"),
        );
      },
    });
  }

  return (
    // `modal={false}`: a modal Dialog's own scroll-lock only knows about its own
    // content subtree, but FormSelectField's Popover list portals to document.body
    // as a sibling — the lock swallowed wheel events over it, making the
    // State/District/Block/Sector lists impossible to scroll with a mouse wheel
    // (scrollbar drag still worked). `modal={false}` drops that lock, but Radix
    // also skips rendering its dim/click-blocking overlay for a non-modal dialog,
    // so `DialogScrim` + `useBodyScrollLock` restore both by hand.
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogScrim open={open} onDismiss={() => onOpenChange(false)} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{translateOr(t, "ADD_END_USER_SITE", "Add End User Site")}</DialogTitle>
        </DialogHeader>

        <FacilityForm form={form} />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </Button>
          <Button type="button" disabled={createFacility.isPending} onClick={handleSubmit}>
            {translateOr(t, "CORE_COMMON_SAVE", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
