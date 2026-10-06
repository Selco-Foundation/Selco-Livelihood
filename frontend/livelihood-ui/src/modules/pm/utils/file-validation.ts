/** Checks a selected file's name against an `<input accept>`-style extension list (e.g. `".xlsx"`). */
export function hasAcceptedExtension(file: File, accept: string): boolean {
  const extensions = accept
    .split(",")
    .map((ext) => ext.trim().toLowerCase())
    .filter(Boolean);
  const name = file.name.toLowerCase();
  return extensions.length === 0 || extensions.some((ext) => name.endsWith(ext));
}
