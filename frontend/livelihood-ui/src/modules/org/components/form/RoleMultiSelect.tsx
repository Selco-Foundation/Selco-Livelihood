import { translateOr, useTranslate } from "@/shared";
import { Badge, Checkbox, cn, Popover, PopoverContent, PopoverTrigger } from "@/ui";
import { ChevronDown, Info, X } from "lucide-react";
import { useState } from "react";
import { roleGroupId, type OrgRoleGroup } from "../../types/organisation";

interface RoleMultiSelectProps {
  label: string;
  groups: OrgRoleGroup[];
  selected: string[];
  isLoading?: boolean;
  error?: string;
  onChange: (selected: string[]) => void;
}

/** Multi-select of role groups, with the current selection shown as removable chips. */
export function RoleMultiSelect({ label, groups, selected, isLoading, error, onChange }: RoleMultiSelectProps) {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  const nameOf = (id: string) => groups.find((group) => roleGroupId(group) === id)?.name ?? id;

  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        <span className="text-destructive"> *</span>
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isLoading}
            className={cn(
              "livelihood-filter-select flex items-center justify-between gap-2 pr-3 text-left disabled:cursor-not-allowed disabled:opacity-50",
              selected.length === 0 && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive",
            )}
          >
            <span className="truncate">
              {selected.length === 0
                ? translateOr(t, "ORG_SELECT_ROLES", "Select roles")
                : translateOr(t, "ORG_ROLES_SELECTED", "{{count}} selected").replace(
                    "{{count}}",
                    String(selected.length),
                  )}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-2">
          {groups.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              {translateOr(t, "ORG_NO_ROLES_CONFIGURED", "No roles are configured for this organisation type")}
            </p>
          ) : (
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
              {groups.map((group) => (
                <label
                  key={roleGroupId(group)}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Checkbox
                    className="size-4 rounded border-2 border-primary"
                    checked={selected.includes(roleGroupId(group))}
                    onCheckedChange={() => toggle(roleGroupId(group))}
                  />
                  {group.name}
                </label>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1">
              {nameOf(id)}
              <button
                type="button"
                aria-label={translateOr(t, "ORG_REMOVE_ROLE", "Remove role")}
                className="cursor-pointer"
                onClick={() => toggle(id)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <Info className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
