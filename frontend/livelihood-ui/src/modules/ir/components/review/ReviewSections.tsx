import { translateOr, useTranslate } from "@/shared";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/ui";
import type { ReviewSectionContent, SectionRejectionReasons } from "../../types/facility-review";

interface ReviewSectionsProps {
  sections: ReviewSectionContent[];
  rejectionReasons: SectionRejectionReasons;
  onReasonChange: (sectionId: ReviewSectionContent["id"], value: string) => void;
}

export function ReviewSections({
  sections,
  rejectionReasons,
  onReasonChange,
}: ReviewSectionsProps) {
  const { t } = useTranslate();

  return (
    <Accordion
      type="multiple"
      defaultValue={sections.map((section) => section.id)}
      className="livelihood-card divide-y divide-border px-4"
    >
      {sections.map((section) => (
        <AccordionItem key={section.id} value={section.id}>
          <AccordionTrigger className="text-sm font-semibold text-ink-950">
            {translateOr(t, section.labelKey, section.label)}
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p className="text-sm text-ink-600">{section.summary}</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink-950">
                {translateOr(t, "ES_IR_REJECTION_REASON", "Rejection reason")}
              </label>
              <textarea
                className="min-h-[80px] w-full rounded border border-ink-300 bg-card px-3 py-2 text-sm placeholder:text-ink-300"
                placeholder={translateOr(
                  t,
                  "ES_IR_REJECTION_REASON_PLACEHOLDER",
                  "Leave blank if this section looks good",
                )}
                value={rejectionReasons[section.id] ?? ""}
                onChange={(event) => onReasonChange(section.id, event.target.value)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
