export interface DownloadedFile {
  blob: Blob;
  filename: string;
}

/** Triggers a browser download of an in-memory file — shared by every mock
 *  ingestion/template/scope hook so the object-URL lifecycle lives in one place. */
export function triggerBrowserDownload(file: DownloadedFile) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  link.click();
  URL.revokeObjectURL(url);
}
