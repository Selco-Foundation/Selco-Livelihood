import { translateOr, useTranslate } from "@/shared";
import { cn } from "@/ui";
import { FileSpreadsheet } from "lucide-react";
import { useId, useRef } from "react";

interface FileUploadZoneProps {
  label: string;
  hint: string;
  accept: string;
  disabled?: boolean;
  uploading?: boolean;
  selectedFileName?: string;
  onSelect: (file: File) => void;
}

/**
 * Single-file, click-to-upload zone — shared by the boundary and facility
 * bulk-upload pages, following this repo's `MediaUploadZone.tsx` visual
 * convention rather than as a hand-rolled one-off.
 */
export function FileUploadZone({
  label,
  hint,
  accept,
  disabled = false,
  uploading = false,
  selectedFileName,
  onSelect,
}: FileUploadZoneProps) {
  const { t } = useTranslate();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-card px-4 py-6 text-center transition-colors",
          !disabled && !uploading && "hover:border-primary hover:bg-accent/40",
          (disabled || uploading) && "cursor-not-allowed opacity-60",
        )}
      >
        <div className="flex size-11 items-center justify-center rounded-full bg-accent text-primary">
          <FileSpreadsheet className="size-5" />
        </div>
        <span className="text-sm text-muted-foreground">
          {uploading
            ? translateOr(t, "CS_COMMON_UPLOADING", "Uploading...")
            : (selectedFileName ?? hint)}
        </span>
      </button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="hidden"
        accept={accept}
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onSelect(file);
            event.target.value = "";
          }
        }}
      />
    </div>
  );
}
