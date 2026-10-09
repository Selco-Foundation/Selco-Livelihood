import { translateOr, useTranslate } from "@/shared";
import { Button, Input } from "@/ui";
import { Plus, Search, X } from "lucide-react";
import type { OrgType } from "../../types/organisation";

interface OrganisationToolbarProps {
  orgType: OrgType;
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
}

export function OrganisationToolbar({ orgType, search, onSearchChange, onAdd }: OrganisationToolbarProps) {
  const { t } = useTranslate();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={translateOr(t, "ORG_SEARCH_NAME_PLACEHOLDER", "Search by organisation name")}
          aria-label={translateOr(t, "ORG_SEARCH_NAME", "Search organisation")}
          className="pr-9 pl-9"
        />
        {search ? (
          <button
            type="button"
            aria-label={translateOr(t, "ORG_CLEAR_SEARCH", "Clear search")}
            onClick={() => onSearchChange("")}
            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <Button type="button" size="lg" onClick={onAdd}>
        <Plus className="size-4" />
        {orgType === "PLATFORM"
          ? translateOr(t, "ADD_PLATFORM_ORG", "Add Platform Organisation")
          : translateOr(t, "ADD_VENDOR_ORG", "Add Vendor Organisation")}
      </Button>
    </div>
  );
}
