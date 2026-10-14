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
import { useUpdateFacility } from "../../hooks/use-facility-details";
import type { Facility } from "../../types/facility";
import { FacilityForm } from "./FacilityForm";

interface FacilityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present -> edit this facility; absent -> create a new one. */
  facility?: Facility;
}

export function FacilityFormDialog({ open, onOpenChange, facility }: FacilityFormDialogProps) {
  const { t } = useTranslate();
  const isEditing = Boolean(facility);
  const form = useFacilityForm(facility?.id);
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility(facility?.id ?? "");
  const isPending = createFacility.isPending || updateFacility.isPending;

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) {
      form.reset(facility);
    }
    // Only reset when the dialog opens/closes, not on every form-state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit() {
    if (!form.validate()) {
      return;
    }

    if (isEditing && facility) {
      updateFacility.mutate(form.toUpdatePayload(facility.raw ?? {}, tenantId()), {
        onSuccess: () => {
          toast.success(
            translateOr(t, "END_USER_SITE_UPDATE_SUCCESS", "End user site updated successfully"),
          );
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(
            extractApiErrorMessage(error) ??
              translateOr(t, "END_USER_SITE_UPDATE_FAILED", "Failed to update end user site"),
          );
        },
      });
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
          <DialogTitle>
            {isEditing
              ? translateOr(t, "EDIT_END_USER_SITE", "Edit End User Site")
              : translateOr(t, "ADD_END_USER_SITE", "Add End User Site")}
          </DialogTitle>
        </DialogHeader>

        <FacilityForm form={form} />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </Button>
          <Button type="button" disabled={isPending} onClick={handleSubmit}>
            {translateOr(t, "CORE_COMMON_SAVE", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
