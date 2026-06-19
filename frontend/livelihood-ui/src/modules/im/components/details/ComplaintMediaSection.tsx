import { useTranslate } from "@/shared";
import { ImageIcon } from "lucide-react";
import { FormSectionCard } from "../create/FormSectionCard";

interface ComplaintMediaSectionProps {
  images: string[];
  videos: Array<{ master?: string | null; original?: string | null }>;
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
      {images.length > 0 ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((src) => (
            <a
              key={src}
              href={src}
              target="_blank"
              rel="noreferrer"
              className="overflow-hidden rounded-lg border border-border bg-muted/30"
            >
              <img src={src} alt="" className="aspect-square w-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}

      {videos.length > 0 ? (
        <div className="grid gap-3">
          {videos.map((video, index) => (
            <div key={`${video.original ?? video.master ?? index}`} className="space-y-2">
              {video.original ? (
                <video
                  controls
                  className="w-full max-w-xl rounded-lg border border-border"
                  src={video.original}
                />
              ) : video.master ? (
                <a
                  href={video.master}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {translateOr(t, "CS_COMMON_VIEW_VIDEO", "View video")}
                </a>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </FormSectionCard>
  );
}
