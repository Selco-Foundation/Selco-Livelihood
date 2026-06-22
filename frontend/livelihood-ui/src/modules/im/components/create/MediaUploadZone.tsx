import { cn } from "@/ui";
import type { LucideIcon } from "lucide-react";
import { useId, useRef } from "react";

interface MediaUploadZoneProps {
  label: string;
  hint: string;
  icon: LucideIcon;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  files: string[];
  onSelect: (files: FileList) => void;
}

export function MediaUploadZone({
  label,
  hint,
  icon: Icon,
  accept,
  multiple = false,
  disabled = false,
  uploading = false,
  files,
  onSelect,
}: MediaUploadZoneProps) {
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
        <Icon className="size-6 text-primary" />
        <span className="text-sm text-muted-foreground">
          {uploading ? "Uploading..." : hint}
        </span>
        {files.length > 0 ? (
          <span className="text-xs text-primary">{files.length} file(s) attached</span>
        ) : null}
      </button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        disabled={disabled || uploading}
        onChange={(event) => {
          if (event.target.files?.length) {
            onSelect(event.target.files);
            event.target.value = "";
          }
        }}
      />
    </div>
  );
}
