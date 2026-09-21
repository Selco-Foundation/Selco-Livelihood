import { translateOr, useTranslate } from "@/shared";
import type { AssetSectionContent } from "../../types/facility-review";
import { LabeledValueList, LabeledValueRows } from "./LabeledValueList";
import { SectionImageGrid, SectionVideoList } from "./SectionMedia";

interface AssetSectionBodyProps {
  section: AssetSectionContent;
}

export function AssetSectionBody({ section }: AssetSectionBodyProps) {
  const { t } = useTranslate();

  return (
    <div className="space-y-4">
      {section.count !== undefined ? (
        <LabeledValueList
          titleKey="ES_IR_ASSET_COUNT"
          title="Asset Count"
          items={[{ labelKey: section.labelKey, label: section.label, value: String(section.count) }]}
        />
      ) : null}

      <LabeledValueList
        titleKey={section.specificationsHeading?.labelKey ?? "ES_IR_SPECIFICATIONS"}
        title={section.specificationsHeading?.label ?? "Specifications"}
        items={section.specifications}
      />

      {section.extraSpecifications ? (
        <LabeledValueList
          titleKey={section.extraSpecifications.labelKey}
          title={section.extraSpecifications.label}
          items={section.extraSpecifications.fields}
        />
      ) : null}

      {section.details ? (
        <LabeledValueList titleKey="ES_IR_DETAILS" title="Details" items={section.details} />
      ) : null}

      {section.items
        ?.filter((item) => {
          // An item with none of these carries no information beyond its
          // label — for a Machine item that's just the label repeating the
          // section title (Serial Number/Capacity live in Details instead),
          // so it's not worth its own box. This can leave every item hidden
          // when a facility has more than one Machine asset (items don't
          // carry per-asset fields yet) — a real gap, but showing an empty,
          // undistinguishing box per duplicate is worse than showing none;
          // a proper multi-asset display is a separate, deliberate change.
          const hasOwnFields = item.serialNumber || item.capacity || item.quantity !== undefined;
          return hasOwnFields || item.images.length > 0;
        })
        .map((item) => (
          <div key={item.itemNumber} className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
            <p className="text-sm font-semibold text-primary">
              {item.label ?? `${translateOr(t, section.labelKey, section.label)} ${item.itemNumber}`}
            </p>
            <LabeledValueRows
              items={[
                ...(item.serialNumber
                  ? [
                      {
                        labelKey: "ES_IR_SERIAL_NUMBER",
                        label: "Serial Number",
                        value: item.serialNumber,
                      },
                    ]
                  : []),
                ...(item.capacity
                  ? [{ labelKey: "ES_IR_SPEC_CAPACITY", label: "Capacity", value: item.capacity }]
                  : []),
                ...(item.quantity !== undefined
                  ? [{ labelKey: "ES_IR_QUANTITY", label: "Quantity", value: String(item.quantity) }]
                  : []),
              ]}
            />
            {item.images.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-sm font-semibold text-ink-950">
                  {translateOr(t, "ES_IR_IMAGE", "Image")}
                </span>
                <SectionImageGrid images={item.images} bare />
              </div>
            ) : null}
          </div>
        ))}

      <SectionImageGrid titleKey="ES_IR_IMAGES" title="Images" images={section.images} />
      <SectionVideoList titleKey="ES_IR_VIDEOS" title="Videos" videos={section.videos} />

      {section.mediaGroups?.map((group) => (
        <div key={group.id} className="space-y-2">
          <SectionImageGrid titleKey={group.labelKey} title={group.label} images={group.images} />
          <SectionVideoList titleKey={group.labelKey} title={group.label} videos={group.videos} />
        </div>
      ))}
    </div>
  );
}
