export interface SupportedLanguage {
  code: string;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "en_IN", label: "English", nativeLabel: "English" },
  { code: "ka_IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
];
