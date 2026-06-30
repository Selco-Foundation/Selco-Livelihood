import { useTranslate } from "@/shared";
import { ImageIcon } from "lucide-react";
import { FormSectionCard } from "../create/FormSectionCard";
import { ComplaintMediaList, type ComplaintVideoEntry } from "./ComplaintMediaList";

interface ComplaintMediaSectionProps {
  images: string[];
  videos: ComplaintVideoEntry[];
}

function translateOr(t: (key: string) => string, key: string, fallback: string) {
  const value = t(key);
  return value === key ? fallback : value;
}

export function ComplaintMediaSection({
  images,
  videos,
}: ComplaintMediaSectionProps) {
  const { t } = useTranslate();

  if (!images.length && !videos.length) {
    return null;
  }

  return (
    <FormSectionCard
      icon={ImageIcon}
      title={t("CS_COMMON_ATTACHMENTS")}
      description={translateOr(
        t,
        "INCIDENT_UPLOADED_MEDIA_DESC",
        "Photos and videos attached to this ticket",
      )}
    >
      <ComplaintMediaList images={images} videos={videos} />
    </FormSectionCard>
  );
}
