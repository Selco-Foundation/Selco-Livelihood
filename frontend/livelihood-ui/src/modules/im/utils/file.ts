type AttachmentKind = "image" | "pdf" | "document";

export function getAttachmentKind(src: string): AttachmentKind {
  const clean = src.split("?")[0].split("#")[0];
  const ext = clean.split(".").pop()?.toLowerCase() ?? "";

  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(ext)) {
    return "image";
  }
  if (ext === "pdf") {
    return "pdf";
  }
  return "document";
}

export function getFileName(src: string): string {
  const clean = src.split("?")[0].split("#")[0];
  return decodeURIComponent(clean.split("/").pop() ?? src);
}