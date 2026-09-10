import type { RejectionReasonOption } from "../types/facility-review";

// Mock MDMS `Installation.RejectionReasons` — no real master exists yet;
// hardcoded per product's explicit instruction until one is available.
export const REJECTION_REASON_OPTIONS: RejectionReasonOption[] = [
  { code: "IMAGE_UNCLEAR", name: "Image is unclear" },
  { code: "MISSING_DOCUMENT", name: "Required document missing" },
  { code: "SPEC_MISMATCH", name: "Specification does not match BOM" },
  { code: "SERIAL_NUMBER_MISMATCH", name: "Serial number mismatch" },
  { code: "VIDEO_INCOMPLETE", name: "Video does not show complete demonstration" },
];
