/**
 * Real `File` objects report `size` based on blob content length, so tests
 * asserting on byte-size boundaries (media-validation.ts, create-incident-documents.ts)
 * need actual content, not a zero-length placeholder.
 */
export function buildFile(name: string, sizeBytes: number, type: string): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}
