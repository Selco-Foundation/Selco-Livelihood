import { translateOr, useTranslate } from "@/shared";
import type { LabeledValue } from "../../types/facility-review";

interface LabeledValueRowsProps {
  items: LabeledValue[];
}

/** Just the label/value rows, no title or box — for composing inside a
 * shared sub-section box alongside other content (e.g. an item's images). */
export function LabeledValueRows({ items }: LabeledValueRowsProps) {
  const { t } = useTranslate();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.labelKey} className="flex flex-wrap gap-x-4 text-sm">
          <span className="w-40 shrink-0 font-semibold text-ink-950">
            {translateOr(t, item.labelKey, item.label)}
          </span>
          <span className="text-ink-950">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

interface LabeledValueListProps {
  titleKey: string;
  title: string;
  items: LabeledValue[];
}

/** A titled sub-section: colored title inside a bordered box, above its label/value rows. */
export function LabeledValueList({ titleKey, title, items }: LabeledValueListProps) {
  const { t } = useTranslate();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-4">
      <p className="text-sm font-semibold text-primary">{translateOr(t, titleKey, title)}</p>
      <LabeledValueRows items={items} />
    </div>
  );
}
