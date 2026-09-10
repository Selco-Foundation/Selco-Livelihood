import { translateOr, useTranslate } from "@/shared";
import { Download } from "lucide-react";
import type { SectionImage, SectionVideo } from "../../types/facility-review";

function formatFileSize(bytes?: number): string {
  if (!bytes) {
    return "";
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SectionImageGridProps {
  titleKey?: string;
  title?: string;
  images: SectionImage[];
  /** Render just the thumbnails, no title/box — for embedding inside a box
   * that already wraps it (e.g. a per-item block). */
  bare?: boolean;
}

export function SectionImageGrid({ titleKey, title, images, bare = false }: SectionImageGridProps) {
  const { t } = useTranslate();

  if (images.length === 0) {
    return null;
  }

  const grid = (
    <div className="flex flex-wrap gap-3">
      {images.map((entry, index) => (
        <a
          key={`${entry.url}-${index}`}
          href={entry.url}
          target="_blank"
          rel="noreferrer"
          className="block h-24 w-32 shrink-0 overflow-hidden rounded-md border border-border"
        >
          <img src={entry.url} alt="" className="h-full w-full object-cover" />
        </a>
      ))}
    </div>
  );

  if (bare) {
    return grid;
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-4">
      {title ? (
        <p className="text-sm font-semibold text-primary">
          {titleKey ? translateOr(t, titleKey, title) : title}
        </p>
      ) : null}
      {grid}
    </div>
  );
}

interface SectionVideoListProps {
  titleKey?: string;
  title?: string;
  videos: SectionVideo[];
  bare?: boolean;
}

export function SectionVideoList({ titleKey, title, videos, bare = false }: SectionVideoListProps) {
  const { t } = useTranslate();

  if (videos.length === 0) {
    return null;
  }

  const list = (
    <div className="flex flex-wrap gap-3">
      {videos.map((entry, index) => (
        <div
          key={`${entry.url}-${index}`}
          className="inline-flex shrink-0 flex-col gap-1.5 rounded-md border border-border bg-card p-2"
        >
          <video src={entry.url} controls className="h-20 w-32 rounded bg-black" />
          <a
            href={entry.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Download className="size-3.5" />
            {formatFileSize(entry.size)}
          </a>
        </div>
      ))}
    </div>
  );

  if (bare) {
    return list;
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-4">
      {title ? (
        <p className="text-sm font-semibold text-primary">
          {titleKey ? translateOr(t, titleKey, title) : title}
        </p>
      ) : null}
      {list}
    </div>
  );
}
