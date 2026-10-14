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
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useOrganisationForm } from "../../hooks/use-organisation-form";
import { useCreateOrganisation, useUpdateOrganisation } from "../../hooks/use-organisations";
import type { Organisation, OrgType } from "../../types/organisation";
import { orgDetailPath } from "../../utils/paths";
import { OrganisationForm } from "./OrganisationForm";

interface OrganisationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgType: OrgType;
  /** Present -> edit this organisation; absent -> create a new one. */
  organisation?: Organisation;
}

export function OrganisationFormDialog({ open, onOpenChange, orgType, organisation }: OrganisationFormDialogProps) {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const form = useOrganisationForm(orgType, organisation);
  const createOrganisation = useCreateOrganisation();
  const updateOrganisation = useUpdateOrganisation(organisation);
  const isPending = createOrganisation.isPending || updateOrganisation.isPending;

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) {
      form.reset();
    }
    // Only reset when the dialog opens, not on every form-state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit() {
    if (!form.validate()) {
      return;
    }

    if (organisation) {
      updateOrganisation.mutate(form.toUpdateInput(), {
        onSuccess: () => {
          toast.success(translateOr(t, "ORG_UPDATE_SUCCESS", "Organisation updated successfully"));
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(
            extractApiErrorMessage(error) ?? translateOr(t, "ORG_UPDATE_FAILED", "Failed to update organisation"),
          );
        },
      });
      return;
    }

    createOrganisation.mutate(form.toCreateInput(), {
      onSuccess: (created) => {
        toast.success(translateOr(t, "ORG_CREATE_SUCCESS", "Organisation created successfully"), {
          description: created.code
            ? translateOr(t, "ORG_CREATE_SUCCESS_CODE", "Organisation code: {{code}}").replace(
                "{{code}}",
                created.code,
              )
            : undefined,
        });
        onOpenChange(false);
        if (created.id) {
          void navigate({ to: orgDetailPath(created.id) });
        }
      },
      onError: (error) => {
        toast.error(
          extractApiErrorMessage(error) ?? translateOr(t, "ORG_CREATE_FAILED", "Failed to create organisation"),
        );
      },
    });
  }

  const title = organisation
    ? translateOr(t, "EDIT_ORGANIZATION", "Edit Organisation")
    : orgType === "PLATFORM"
      ? translateOr(t, "ADD_PLATFORM_ORG", "Add Platform Organisation")
      : translateOr(t, "ADD_VENDOR_ORG", "Add Vendor Organisation");

  return (
    // Non-modal + DialogScrim, same as eu's FacilityFormDialog: keeps popover lists scrollable.
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogScrim open={open} onDismiss={() => onOpenChange(false)} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <OrganisationForm orgType={orgType} form={form} />

        <DialogFooter>
          <Button type="button" variant="outline" size="lg" disabled={isPending} onClick={() => onOpenChange(false)}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </Button>
          <Button type="button" size="lg" disabled={isPending} onClick={handleSubmit}>
            {isPending ? translateOr(t, "CORE_COMMON_SAVING", "Saving...") : translateOr(t, "CORE_COMMON_SAVE", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
