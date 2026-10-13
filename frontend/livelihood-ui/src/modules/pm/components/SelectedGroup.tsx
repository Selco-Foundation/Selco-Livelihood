import { X } from "lucide-react";

import { translateOr, useTranslate } from "@/shared";
import { LockedMark } from "@/ui";

/** Removable chip list used by both wizards' "Selected" summary panels. Lived inside
 *  GeographyDetailsStep and was imported out of it by PlanDetailsStep — a step reaching into
 *  a sibling step for a shared primitive. */
interface SelectedGroupProps {
  title: string;
  emptyLabel: string;
  items: { code: string; name: string }[];
  onRemove?: (code: string) => void;
  disabled?: boolean;
  /** Items that cannot be removed, mapped to why: they show a lock with that reason instead of the
   *  remove button. */
  locked?: ReadonlyMap<string, string>;
}

export function SelectedGroup({
  title,
  emptyLabel,
  items,
  onRemove,
  disabled = false,
  locked,
}: Readonly<SelectedGroupProps>) {
  const { t } = useTranslate();
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item.code}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
            >
              {item.name}
              {!disabled && locked?.has(item.code) ? <LockedMark reason={locked.get(item.code)} /> : null}
              {!disabled && onRemove && !locked?.has(item.code) ? (
                <button
                  type="button"
                  onClick={() => onRemove(item.code)}
                  aria-label={`${translateOr(t, "ES_PM_REMOVE", "Remove")} ${item.name}`}
                  className="rounded-full hover:bg-black/10"
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
