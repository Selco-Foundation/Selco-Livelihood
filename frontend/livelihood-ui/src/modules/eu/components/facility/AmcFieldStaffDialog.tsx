import { amcVendorChangeWarning, translateOr, useTranslate } from "@/shared";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, SearchableSelect } from "@/ui";
import { useState } from "react";
import { useAmcFieldStaffOptions } from "../../hooks/use-amc-field-staff-options";

interface AmcFieldStaffDialogProps {
  open: boolean;
  /** The vendor organisation the asset is being mapped to. */
  organizationId: string;
  /** The AMC's current field staff, kept as the pick when they belong to the new organisation. */
  currentFieldStaffId?: string;
  /** The AMC is active and moves to another organisation: its open visits may restart. */
  warnVendorChange: boolean;
  isPending: boolean;
  onConfirm: (fieldStaffId: string) => void;
  onCancel: () => void;
}

/** Asked when a vendor change touches an asset that has a running AMC: who looks after the AMC from now on. */
export function AmcFieldStaffDialog({
  open,
  organizationId,
  currentFieldStaffId,
  warnVendorChange,
  isPending,
  onConfirm,
  onCancel,
}: Readonly<AmcFieldStaffDialogProps>) {
  const { t } = useTranslate();
  const { data: staff = [], isLoading } = useAmcFieldStaffOptions(organizationId);
  const [picked, setPicked] = useState<string>();
  const fieldStaffId = picked ?? (staff.some((member) => member.code === currentFieldStaffId) ? currentFieldStaffId : "");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translateOr(t, "ASSET_AMC_FIELD_STAFF_TITLE", "Select the AMC field staff")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {translateOr(
            t,
            "ASSET_AMC_FIELD_STAFF_HINT",
            "This asset has a running AMC. Choose who looks after it in the new vendor organization.",
          )}
        </p>
        {warnVendorChange ? (
          <p role="note" className="rounded-lg bg-warning p-3 text-sm text-foreground">
            {amcVendorChangeWarning(t)}
          </p>
        ) : null}
        <SearchableSelect
          label={translateOr(t, "ASSET_AMC_FIELD_STAFF", "AMC field staff")}
          value={fieldStaffId ?? ""}
          options={staff}
          placeholder={translateOr(t, "ASSET_SELECT_AMC_FIELD_STAFF", "Select AMC field staff")}
          onChange={(option) => setPicked(option?.code ?? "")}
          error={
            !isLoading && staff.length === 0
              ? translateOr(t, "ASSET_AMC_FIELD_STAFF_NONE", "No AMC field staff in this organization")
              : undefined
          }
        />
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </Button>
          <Button type="button" size="sm" disabled={!fieldStaffId || isPending} onClick={() => onConfirm(fieldStaffId!)}>
            {translateOr(t, "CORE_COMMON_SAVE", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
