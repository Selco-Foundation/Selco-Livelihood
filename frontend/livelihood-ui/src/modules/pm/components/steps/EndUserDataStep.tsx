import { useRef, useState } from "react";
import { tenantId, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Button, cn } from "@/ui";
import { AlertTriangle, CheckCircle2, Download, UploadCloud } from "lucide-react";
import { useFacilityIngestion } from "../../hooks/use-facility-ingestion";
import { buildBoundaryTree } from "../../utils/geography";
import { scheduleProject } from "../../services/project";
import type { GeographyDetails } from "../../types/project";

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

interface EndUserDataStepProps {
  projectId: string;
  geography: GeographyDetails;
}

export function EndUserDataStep({ projectId, geography }: EndUserDataStepProps) {
  const { t } = useTranslate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  const ingestion = useFacilityIngestion(projectId);

  function handleDownload() {
    const boundaryTree = buildBoundaryTree(
      geography,
      (code) => translateOr(t, `BOUNDARY_${code}`, code),
      tenantId(),
    );
    void ingestion.downloadTemplate(boundaryTree);
  }

  function acceptFile(file: File) {
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return;
    }
    void ingestion.uploadAndValidate(file);
  }

  async function handleSchedule() {
    if (!accessToken) return;
    setScheduling(true);
    try {
      await scheduleProject(projectId, accessToken, user);
      setScheduled(true);
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">End User Data</h2>
      </div>

      <section className="livelihood-card space-y-3 p-6">
        <h3 className="font-medium text-foreground">Download Template</h3>
        <p className="text-sm text-muted-foreground">
          Download the End User Site template for the sites in scope, mark which sites to
          include, then upload it below.
        </p>
        <Button
          variant="outline"
          onClick={handleDownload}
          disabled={ingestion.stage === "downloading"}
        >
          <Download className="size-4" />
          {ingestion.stage === "downloading" ? "Downloading..." : "Download Template"}
        </Button>
      </section>

      <section className="livelihood-card space-y-3 p-6">
        <h3 className="font-medium text-foreground">Upload Completed Template</h3>

        {ingestion.stage === "done" ? (
          <div className="flex items-center gap-2 rounded-md bg-success/10 p-4 text-sm text-success">
            <CheckCircle2 className="size-5 shrink-0" />
            End user sites uploaded successfully.
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              const file = event.dataTransfer.files[0];
              if (file) acceptFile(file);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input p-8 text-center transition-colors",
              dragActive && "border-primary bg-accent",
            )}
          >
            <UploadCloud className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {ingestion.stage === "validating" || ingestion.stage === "creating"
                ? "Processing..."
                : "Drag and drop, or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground">
              Accepted formats: {ACCEPTED_EXTENSIONS.join(", ")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) acceptFile(file);
                event.target.value = "";
              }}
            />
          </div>
        )}

        {ingestion.stage === "invalid" ? (
          <div className="space-y-2 rounded-md bg-destructive/10 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {ingestion.errorCount} end user site{ingestion.errorCount === 1 ? "" : "s"} failed
              validation
            </div>
            <p className="text-muted-foreground">
              Download the annotated sheet, fix the flagged rows, and upload it again.
            </p>
            <Button variant="outline" size="sm" onClick={ingestion.downloadAnnotatedFile}>
              <Download className="size-4" />
              Download annotated sheet
            </Button>
          </div>
        ) : null}

        {ingestion.stage === "error" && ingestion.errorMessage ? (
          <p className="text-sm text-destructive">{ingestion.errorMessage}</p>
        ) : null}
      </section>

      {ingestion.stage === "done" ? (
        <div className="flex justify-end">
          <Button onClick={handleSchedule} disabled={scheduling || scheduled}>
            {scheduled ? "Project Scheduled" : scheduling ? "Submitting..." : "Submit"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
