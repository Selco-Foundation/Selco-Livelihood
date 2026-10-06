import { translateOr, useBoundaryHierarchy, useTranslate } from "@/shared";
import { Button, cn } from "@/ui";
import { Info, MapPin, Plus, Trash2, Undo2 } from "lucide-react";
import type { useOrgUserForm } from "../../hooks/use-org-user-form";
import {
  JURISDICTION_LEVELS,
  boundaryDisplayName,
  boundaryTypeLabel,
  optionsForLevel,
  type JurisdictionLevel,
} from "../../utils/boundary";
import { FormSelectField } from "../form/FormSelectField";

interface JurisdictionSectionProps {
  jurisdictions: ReturnType<typeof useOrgUserForm>["jurisdictions"];
}

const LEVEL_LABELS: Record<JurisdictionLevel, { key: string; fallback: string }> = {
  country: { key: "CS_COUNTRY", fallback: "Country" },
  state: { key: "CS_STATE", fallback: "State" },
  district: { key: "CS_DISTRICT", fallback: "District" },
  block: { key: "CS_BLOCK", fallback: "Block" },
  facility: { key: "CS_FACILITY", fallback: "Facility" },
};

/**
 * The user's jurisdictions (HRMS jurisdictions), as in the E4H Management Hub:
 * the current ones (removable / restorable) plus new cascading picks from
 * Country down to Facility. The deepest level picked on a card is what's saved.
 */
export function JurisdictionSection({ jurisdictions }: JurisdictionSectionProps) {
  const { t } = useTranslate();
  const { data: hierarchy, isLoading } = useBoundaryHierarchy();
  const { existing, removedIds, drafts, draftErrors, addDraft, updateDraft, removeDraft, toggleExisting } =
    jurisdictions;

  return (
    <section className="flex flex-col gap-4 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold text-foreground">
            {translateOr(t, "ORG_JURISDICTION", "Jurisdictions")}
          </h3>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={isLoading} onClick={addDraft}>
          <Plus className="size-4" />
          {translateOr(t, "ORG_ADD_JURISDICTION", "Add Jurisdictions")}
        </Button>
      </div>

      {existing.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {existing.map((item) => {
            const removed = removedIds.includes(item.id!);
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className={cn("flex min-w-0 items-center gap-2 text-sm", removed && "opacity-50")}>
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <span className={cn("truncate font-medium text-foreground", removed && "line-through")}>
                    {boundaryDisplayName(item.boundary, t)}
                  </span>
                  <span className="shrink-0 text-muted-foreground">· {boundaryTypeLabel(item.boundaryType, t)}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    removed
                      ? translateOr(t, "ORG_UNDO_REMOVE_JURISDICTION", "Undo remove")
                      : translateOr(t, "ORG_REMOVE_JURISDICTION", "Remove jurisdiction")
                  }
                  className={removed ? undefined : "text-destructive hover:text-destructive"}
                  onClick={() => toggleExisting(item.id!)}
                >
                  {removed ? <Undo2 className="size-4" /> : <Trash2 className="size-4" />}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {existing.length === 0 && drafts.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          {translateOr(t, "ORG_NO_JURISDICTIONS", "No jurisdictions added yet")}
        </p>
      ) : null}

      {drafts.map((draft) => (
        <div key={draft.key} className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              {translateOr(t, "ORG_NEW_JURISDICTION", "New Jurisdiction")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={translateOr(t, "ORG_REMOVE_JURISDICTION", "Remove jurisdiction")}
              className="text-destructive hover:text-destructive"
              onClick={() => removeDraft(draft.key)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {JURISDICTION_LEVELS.map((level, index) => {
              const parentLevel = index > 0 ? JURISDICTION_LEVELS[index - 1] : undefined;
              const options = optionsForLevel(level, draft, hierarchy).map((node) => ({
                code: node.code,
                name: boundaryDisplayName(node.code, t),
              }));
              return (
                <FormSelectField
                  key={level}
                  label={translateOr(t, LEVEL_LABELS[level].key, LEVEL_LABELS[level].fallback)}
                  value={draft[level]}
                  options={options}
                  searchable={level !== "country"}
                  disabled={isLoading || (parentLevel !== undefined && !draft[parentLevel])}
                  onChange={(option) => updateDraft(draft.key, level, option?.code ?? "")}
                />
              );
            })}
          </div>
          {draftErrors[draft.key] ? (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <Info className="size-3.5 shrink-0" />
              {draftErrors[draft.key]}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
