import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Skeleton } from "@/ui";
import { useState } from "react";
import { useLoadAssetSectionImages } from "../../hooks/use-activity-details";
import type { AssetItem, AssetSection } from "../../types/activity-detail";

interface ActivityAssetSectionsProps {
  activityId: string;
  sections: AssetSection[];
}

export function ActivityAssetSections({ activityId, sections }: ActivityAssetSectionsProps) {
  const loadSectionImages = useLoadAssetSectionImages(activityId);
  const [resolvedItemsBySection, setResolvedItemsBySection] = useState<Record<string, AssetItem[]>>({});
  const [loadingSectionId, setLoadingSectionId] = useState<string>();

  if (sections.length === 0) {
    return null;
  }

  function handleExpand(sectionIds: string[]) {
    for (const sectionId of sectionIds) {
      if (resolvedItemsBySection[sectionId]) {
        continue;
      }
      const section = sections.find((candidate) => candidate.id === sectionId);
      if (!section) {
        continue;
      }
      setLoadingSectionId(sectionId);
      loadSectionImages(section.id, section.items, section.photoDocuments)
        .then((items) => {
          setResolvedItemsBySection((prev) => ({ ...prev, [sectionId]: items }));
        })
        .finally(() => setLoadingSectionId(undefined));
    }
  }

  return (
    <Accordion type="multiple" onValueChange={handleExpand}>
      {sections.map((section) => {
        const items = resolvedItemsBySection[section.id] ?? section.items;
        return (
          <AccordionItem key={section.id} value={section.id} className="livelihood-card mb-4 border-none px-5">
            <AccordionTrigger className="text-base font-semibold text-foreground">
              {section.label} ({section.count})
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-2">
                {[...section.specifications, ...section.details].map((field) => (
                  <div key={field.label} className="flex gap-3 text-sm">
                    <span className="w-1/2 font-semibold text-foreground">{field.label}</span>
                    <span className="text-muted-foreground">{field.value}</span>
                  </div>
                ))}
              </div>

              {loadingSectionId === section.id ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.itemNumber} className="rounded-md border border-border p-3">
                      <p className="text-sm font-semibold text-foreground">
                        {section.label} {item.itemNumber} — {item.serialNumber}
                      </p>
                      {item.images.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.images.map((image) => (
                            <img
                              key={image.url}
                              src={image.url}
                              alt=""
                              className="size-20 rounded-md object-cover"
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
