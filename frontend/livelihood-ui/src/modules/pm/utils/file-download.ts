export interface DownloadedFile {
  blob: Blob;
  filename: string;
}

/** Triggers a browser download of an in-memory file — shared by every
 *  ingestion/template/scope hook so the object-URL lifecycle lives in one place. */
export function triggerBrowserDownload(file: DownloadedFile) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  // Attached before clicking: some browsers ignore a click on an anchor that is not in the
  // document.
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on a later task, not inline: the download is started asynchronously, so revoking in
  // the same tick as the click can pull the blob out from under a read that has not begun yet
  // and produce an empty or failed download.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
