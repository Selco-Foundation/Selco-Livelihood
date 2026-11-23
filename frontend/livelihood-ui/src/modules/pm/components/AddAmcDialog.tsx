import { translateOr, useTranslate } from "@/shared";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, SearchableSelect, toast } from "@/ui";
import { useMemo, useState } from "react";
import { useAmcOptions } from "../hooks/use-amc-options";
import { useCreatePlanAmcs } from "../hooks/use-create-plan-amcs";
import { usePlanAmcBySite } from "../hooks/use-plan-amc-by-site";
import { useVendorAssignmentSearch } from "../hooks/use-vendor-assignment-search";
import { amcErrorText } from "../utils/amc-errors";
import { AmcFieldStaffSelect } from "./AmcFieldStaffSelect";

interface AddAmcDialogProps {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Turns AMC on for one end user of a published plan that has none yet. */
export function AddAmcDialog({ planId, open, onOpenChange }: Readonly<AddAmcDialogProps>) {
  const { t } = useTranslate();
  const { data: assignment } = useVendorAssignmentSearch(planId);
  const { data: amcBySite = {} } = usePlanAmcBySite(planId);
  const { frequencyOptions, yearsOptions, defaultFrequencyMonths, defaultYears } = useAmcOptions();
  const createAmcs = useCreatePlanAmcs(planId);
  const [facilityId, setFacilityId] = useState("");
  const [fieldStaffId, setFieldStaffId] = useState("");
  const [frequencyMonths, setFrequencyMonths] = useState<number>();
  const [years, setYears] = useState<number>();

  // Solar sites with no running AMC, each with the organisation its solar asset is assigned to.
  const sites = useMemo(
    () =>
      (assignment?.sites ?? []).flatMap((site) => {
        const vendorOrgId = site.assets.find((asset) => asset.componentType === "SOLAR")?.vendorOrgId;
        return vendorOrgId && !amcBySite[site.facilityId]
          ? [{ code: site.facilityId, name: site.siteName ?? site.facilityId, vendorOrgId }]
          : [];
      }),
    [assignment, amcBySite],
  );
  const site = sites.find((option) => option.code === facilityId);
  const options = (list: readonly { labelKey: string; fallback: string }[], codes: number[]) =>
    list.map((option, index) => ({ code: String(codes[index]), name: translateOr(t, option.labelKey, option.fallback) }));

  function handleSave() {
    if (!site) return;
    createAmcs.mutate([{ facilityId: site.code, vendorOrgId: site.vendorOrgId, fieldStaffId, frequencyMonths, years }], {
      onSuccess: () => {
        toast.success(translateOr(t, "ES_PM_AMC_CREATED", "AMC created"));
        setFacilityId("");
        setFieldStaffId("");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(translateOr(t, "ES_PM_AMC_CREATE_FAILED", "Could not create the AMC"), {
          description:
            amcErrorText(error, t, () => site.name) ??
            translateOr(t, "ES_SOMETHING_WRONG", "Something went wrong. Please try again."),
        });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translateOr(t, "ES_PM_ADD_AMC", "Add AMC")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <SearchableSelect
            label={translateOr(t, "ES_PM_END_USER", "End user")}
            value={facilityId}
            options={sites}
            placeholder={translateOr(t, "ES_PM_SELECT_END_USER", "Select end user")}
            onChange={(option) => {
              setFacilityId(option?.code ?? "");
              setFieldStaffId("");
            }}
          />
          <SearchableSelect
            label={translateOr(t, "ES_PM_AMC_FREQUENCY", "AMC frequency")}
            value={String(frequencyMonths ?? defaultFrequencyMonths ?? "")}
            options={options(frequencyOptions, frequencyOptions.map((option) => option.months))}
            onChange={(option) => setFrequencyMonths(option ? Number(option.code) : undefined)}
          />
          <SearchableSelect
            label={translateOr(t, "ES_PM_AMC_YEARS", "Number of years")}
            value={String(years ?? defaultYears ?? "")}
            options={options(yearsOptions, yearsOptions.map((option) => option.years))}
            onChange={(option) => setYears(option ? Number(option.code) : undefined)}
          />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">{translateOr(t, "ES_PM_AMC_FIELD_STAFF", "AMC field staff")}</p>
            <AmcFieldStaffSelect
              rowLabel={site?.name ?? ""}
              organizationId={site?.vendorOrgId}
              value={fieldStaffId}
              onChange={setFieldStaffId}
              disabled={false}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={!site || !fieldStaffId || createAmcs.isPending}>
            {translateOr(t, "CORE_COMMON_SAVE", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
